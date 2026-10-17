import test from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, emptyMemory, validSettings } from '../lib/runtime.js';
import { selectMemory } from '../lib/memory.js';
import { createJobs } from '../lib/jobs.js';
import { createAgentProviders, readProviderEvents } from '../lib/agents/providers.js';
import { createDashboard, parseRates, parseHeadlines } from '../lib/dashboard.js';
import { createHome } from '../lib/home.js';
import { createAppActions } from '../src/core/appActions.js';
import { readEvents } from '../src/core/api.js';

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-upgrade-'));
  return { directory, store: createStore(directory), cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}
test('Old relevant memories outrank recent unrelated records and respect budget', () => {
  const memory = emptyMemory();
  memory.projects = Array.from({ length: 80 }, (_, i) => ({ text: `Alakasız proje ${i}` }));
  memory.projects.push({ text: 'Denizaltı robotunun sensör kalibrasyonu salı yapılacak.' });
  const selected = selectMemory(memory, 'Denizaltı sensör kalibrasyonu ne zaman?', { maxChars: 200 });
  assert.match(selected, /^projects: Denizaltı/); assert.ok(selected.length <= 200);
});
test('A cancelled request cannot commit a late provider result', async () => {
  const f = fixture(), context = new AsyncLocalStorage(), events = [];
  let release;
  const jobs = createJobs({ store: f.store, context, publish: (type, data) => events.push({ type, data }), orchestrate: () => new Promise(resolve => { release = resolve; }) });
  try {
    const first = jobs.start('Araştır', 'tablet');
    assert.equal(jobs.start('İkinci istek', 'telefon'), null);
    assert.equal(jobs.cancel(first.task.id), true);
    release({ reply: 'Geç kalan yanıt', route: 'jarvis', speaker: 'jarvis', agents: ['jarvis'] });
    await first.done;
    assert.equal(first.task.status, 'cancelled'); assert.equal(jobs.active, null);
    assert.equal(f.store.state.history.length, 1);
    assert.ok(!events.some(x => x.type === 'reply'));
    assert.ok(events.some(x => x.type === 'task-error'));
    assert.equal(jobs.cancel(first.task.id), false);
  } finally { f.cleanup(); }
});
test('Successful tasks stream, preserve sources, and persist only the final answer', async () => {
  const f = fixture(), context = new AsyncLocalStorage(), events = [];
  try {
    const jobs = createJobs({ store: f.store, context, publish: (type, data) => events.push({ type, data }), orchestrate: async () => {
      context.getStore().onDelta({ speaker: 'atlas', text: 'Araştırma taslağı' });
      context.getStore().sources.push({ title: 'Kaynak', url: 'https://example.com' });
      return { reply: 'Doğrulanmış son yanıt', route: 'collaborate', agents: ['atlas', 'jarvis'], speaker: 'jarvis' };
    } });
    const { task, done } = jobs.start('Sor', 'tablet', { mimeType: 'image/jpeg', data: 'not-persisted' });
    await done;
    assert.equal(task.status, 'completed');
    assert.equal(f.store.state.history.at(-1).sources[0].url, 'https://example.com');
    assert.equal(f.store.state.history.at(-1).content, 'Doğrulanmış son yanıt');
    assert.ok(events.find(e => e.type === 'delta'));
    const saved = readFileSync(join(f.directory, 'state.json'), 'utf8');
    assert.doesNotMatch(saved, /not-persisted|Araştırma taslağı/);
  } finally { f.cleanup(); }
});
test('Provider errors remain failed tasks and release the task lock', async () => {
  const f = fixture();
  try {
    const jobs = createJobs({ store: f.store, context: new AsyncLocalStorage(), publish: () => {}, orchestrate: async () => { throw new Error('secret upstream payload'); } });
    const { task, done } = jobs.start('Sor', 'desktop'); await done;
    assert.equal(task.status, 'failed'); assert.doesNotMatch(task.error, /secret/); assert.equal(jobs.active, null);
  } finally { f.cleanup(); }
});
test('Gemini receives an abort signal and returns actual streamed chunks and sources', async () => {
  const context = new AsyncLocalStorage(), controller = new AbortController(), deltas = [];
  const run = { signal: controller.signal, history: [], sources: [], image: { mimeType: 'image/jpeg', data: 'sample' }, onDelta: d => deltas.push(d.text) };
  const providers = createAgentProviders({ context, GEMINI_MODEL: 'test', gemini: { models: { async *generateContentStream(request) {
    assert.equal(request.config.abortSignal, controller.signal);
    assert.equal(request.contents[0].parts[1].inlineData.data, 'sample');
    yield { text: 'Mer', candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com', title: 'Test' } }] } }] };
    yield { text: 'haba' };
  } } } });
  const result = await context.run(run, () => providers.askJarvis('Selam'));
  assert.equal(result, 'Merhaba'); assert.deepEqual(deltas, ['Mer', 'haba']); assert.equal(run.sources.length, 1);
  controller.abort();
  await assert.rejects(context.run(run, () => providers.askJarvis('Devam')), { name: 'AbortError' });
});
test('OpenRouter event parser handles split UTF-8 and rejects truncated responses', async () => {
  const encoder = new TextEncoder(), bytes = encoder.encode('data: {"choices":[{"delta":{"content":"Türkçe"}}]}\n\ndata: [DONE]\n\n');
  const response = { body: (async function* () { for (let i = 0; i < bytes.length; i += 3) yield bytes.slice(i, i + 3); })() };
  const events = []; for await (const e of readProviderEvents(response)) events.push(e);
  assert.equal(events[0].choices[0].delta.content, 'Türkçe');
  await assert.rejects(async () => { for await (const _e of readProviderEvents({ body: (async function* () { yield encoder.encode('data: {}\n'); })() })) {} }, /tamamlanmadan/);
});
test('Browser event parser handles network chunks, comments, and UTF-8', async () => {
  const bytes = new TextEncoder().encode(': heartbeat\n\ndata: {"type":"delta","data":"İstanbul"}\n\n');
  const body = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 2) controller.enqueue(bytes.slice(i, i + 2)); controller.close(); } });
  const events = []; for await (const e of readEvents(body)) events.push(e);
  assert.deepEqual(events, [{ type: 'delta', data: 'İstanbul' }]);
});
test('TCMB rates require source date and valid numeric values', () => {
  const xml = '<Tarih_Date Tarih="16.10.2026">' + ['USD', 'EUR', 'GBP'].map(code => `<Currency CurrencyCode="${code}"><ForexSelling>40.1250</ForexSelling></Currency>`).join('') + '</Tarih_Date>';
  assert.equal(parseRates(xml).rates.length, 3); assert.equal(parseRates(xml).date, '16.10.2026');
  assert.throws(() => parseRates(xml.replace('40.1250', 'not-a-rate')));
  assert.throws(() => parseRates(xml.replace('Tarih="16.10.2026"', '')));
});
test('RSS headline cards only link to HTTP sources and strip markup', () => {
  const data = parseHeadlines('<rss><item><title><![CDATA[<b>Haber</b> &amp; yeni]]></title><link>https://example.com/news</link></item><item><title>Bad</title><link>javascript:alert(1)</link></item></rss>', 'Test');
  assert.equal(data.length, 1); assert.equal(data[0].title, 'Haber & yeni');
});
test('Dashboard isolates source failures and caches a completed result', async () => {
  let count = 0;
  const dashboard = createDashboard({ readSource: async url => { count++; if (url.includes('rss')) return '<rss></rss>'; throw new Error('Offline'); } });
  const result = await dashboard('Ankara');
  assert.equal(result.weather.data, null); assert.ok(result.weather.error); assert.deepEqual(result.news.data, []);
  assert.equal(await dashboard('Ankara'), result); assert.equal(count, 3);
});
test('Home Assistant only controls configured devices and reports observed state', async () => {
  const calls = [];
  const home = createHome({ url: 'https://home.example', token: 'test', entities: 'Salon=light.salon,Forbidden=lock.front', fetcher: async (url, options) => {
    calls.push({ url, options }); return { ok: true, json: async () => url.includes('/states/') ? { state: 'off' } : [] };
  } });
  await assert.rejects(home.control('lock.front', true)); assert.equal(calls.length, 0);
  const result = await home.control('light.salon', true);
  assert.match(calls[0].url, /light\/turn_on$/); assert.equal(result.devices[0].state, 'off');
  assert.equal(result.devices.length, 1);
});
test('Local clock/date commands no longer reference missing component variables', async () => {
  const replies = [], actions = createAppActions({ setReply: x => replies.push(x), speak: () => {} });
  assert.equal(await actions.localAction('saat kaç'), true); assert.equal(await actions.localAction('tarih ne'), true);
  assert.match(replies[0], /^Saat /); assert.match(replies[1], /^Bugün /);
});
test('Reject out-of-range settings and preserve valid shared preferences', () => {
  assert.equal(validSettings({ speechRate: 1.2, autoSpeak: false, city: 'Ankara' }), true);
  for (const value of [{ speechRate: 20 }, { autoSpeak: 'yes' }, { city: '' }, { token: 'bad' }]) assert.equal(validSettings(value), false);
});

test('Text jobs tag both sides and never expose another agents history to a provider', async () => {
  const f = fixture(), context = new AsyncLocalStorage(); let captured;
  try {
    f.store.state.history.push({ role: 'user', agent: 'nexus', content: 'VERA-STYLE' }, { role: 'user', agent: 'atlas', content: 'LARA-FACT' });
    const jobs = createJobs({ store: f.store, context, publish() {}, orchestrate: async () => {
      captured = context.getStore(); return { reply: 'Lara cevabı', speaker: 'atlas', agents: ['atlas'], route: 'selected-agent' };
    } });
    await jobs.start('Devam', 'test', null, { agent: 'atlas' }).done;
    assert.deepEqual(captured.history, [{ role: 'user', content: 'LARA-FACT' }]);
    assert.equal(f.store.state.history.at(-1).agent, 'atlas');
    assert.equal(f.store.state.history.at(-2).agent, 'atlas');
  } finally { f.cleanup(); }
});

test('Gemini specialist requests select target history during orchestration', async () => {
  const context = new AsyncLocalStorage(), calls = [];
  const providers = createAgentProviders({ context, getSettings: () => null, GEMINI_MODEL: 'test',
    gemini: { models: { async *generateContentStream(request) { calls.push(request); yield { text: 'Yanıt' }; } } } });
  await context.run({ agent: 'jarvis', history: [{ role: 'user', content: 'DILAN-PRIVATE' }],
    agentHistories: { atlas: [{ role: 'user', content: 'LARA-PRIVATE' }] } }, () => providers.askAtlas('Görev'));
  assert.match(JSON.stringify(calls[0].contents), /LARA-PRIVATE/);
  assert.doesNotMatch(JSON.stringify(calls[0].contents), /DILAN-PRIVATE/);
});
