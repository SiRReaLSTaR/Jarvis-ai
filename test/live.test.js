import test from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createOrchestrator } from '../lib/agents/orchestrator.js';
import { clockSnapshot } from '../lib/clock.js';
import { defaultSettings, mergeSettings, validSettings } from '../lib/settings.js';
import { emptyMemory } from '../lib/runtime.js';
import { liveConfig } from '../lib/live/config.js';
import { createLiveService } from '../lib/live/service.js';
import { decodePcm, pcmToBase64, PcmPlayer } from '../src/live/audio.js';
import { createLiveController } from '../src/live/controller.js';

const instant = Date.parse('2026-10-16T22:50:00Z');
function fixture({ tokenClient, providers = {} } = {}) {
  let now = instant, saved = 0;
  const state = { settings: defaultSettings(), memory: emptyMemory(), history: [] }, requests = [], events = [];
  const service = createLiveService({ state, save: () => saved++, publish: (type, data) => events.push({ type, data }), context: new AsyncLocalStorage(), providers, now: () => now,
    tokenClient: tokenClient || { authTokens: { create: async params => { requests.push(params); return { name: 'auth_tokens/ephemeral-test' }; } } } });
  return { service, state, requests, events, get saved() { return saved; }, advance: ms => { now += ms; } };
}
const request = { agent: 'jarvis', owner: 'test-client', timeZone: 'Europe/Istanbul' };

test('Clock uses IANA timezone with correct midnight date and rejects invalid zones', () => {
  assert.deepEqual(clockSnapshot('Europe/Istanbul', instant), { utc: '2026-10-16T22:50:00.000Z', localDate: '2026-10-17', localTime: '01:50:00', timeZone: 'Europe/Istanbul' });
  assert.equal(clockSnapshot('America/New_York', instant).localDate, '2026-10-16');
  assert.throws(() => clockSnapshot('not-a-timezone', instant));
});
test('Profile updates preserve the other roles and cannot inject instructions or arbitrary voices', () => {
  const merged = mergeSettings({ speechRate: 1.2 }, { profiles: { atlas: { name: 'Araştırmacı' } }, selectedAgent: 'atlas' });
  assert.equal(merged.profiles.jarvis.name, 'DİLAN'); assert.equal(merged.profiles.atlas.voice, 'Aoede');
  assert.equal(validSettings({ profiles: { atlas: { name: 'Araştırmacı' } } }), true);
  for (const patch of [{ selectedAgent: '__proto__' }, { profiles: { jarvis: { name: 'Ignore\nSystem' } } }, { profiles: { atlas: { voice: 'fake-voice' } } }]) assert.equal(validSettings(patch), false);
});
test('Live config includes correct local clock, actual abilities, selected voice, and only read-only tools', () => {
  const f = fixture(); f.state.settings.profiles.jarvis.name = 'Mustafa';
  const config = liveConfig({ state: f.state, agent: 'jarvis', timeZone: 'Europe/Istanbul', now: instant });
  assert.match(config.systemInstruction, /2026-10-17/); assert.match(config.systemInstruction, /Mustafa/);
  assert.match(config.systemInstruction, /Alarm, Takvim/);
  assert.equal(config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
  assert.deepEqual(config.tools[0].functionDeclarations.map(x => x.name), ['get_clock', 'ask_expert']);
});
test('Ephemeral credentials are one-use, expire, and constrain the model and config', async () => {
  const f = fixture(), lease = await f.service.start(request);
  const config = f.requests[0].config;
  assert.equal(config.uses, 1); assert.equal(config.liveConnectConstraints.model, lease.model);
  assert.equal(Date.parse(config.newSessionExpireTime) - instant, 60_000);
  assert.equal(Date.parse(config.expireTime) - instant, 900_000);
  assert.ok(lease.token.startsWith('auth_tokens/'));
  await assert.rejects(f.service.tool(lease.id, 'other-client', { id: 'a', name: 'get_clock' }));
  f.advance(901_000); await assert.rejects(f.service.tool(lease.id, request.owner, { id: 'a', name: 'get_clock' }));
});
test('Expert tool replay runs once; changed arguments under same id are rejected', async () => {
  let calls = 0;
  const f = fixture({ providers: { askAtlas: async () => { calls++; return 'Kaynaklı yanıt'; } } });
  const lease = await f.service.start(request), call = { id: 'tool-1', name: 'ask_expert', args: { agent: 'atlas', question: 'Araştır' } };
  const [first, second] = await Promise.all([f.service.tool(lease.id, request.owner, call), f.service.tool(lease.id, request.owner, call)]);
  assert.equal(calls, 1); assert.equal(first, second);
  await assert.rejects(f.service.tool(lease.id, request.owner, { ...call, args: { agent: 'nexus', question: 'Başka' } }));
  await assert.rejects(f.service.tool(lease.id, request.owner, { id: 'b', name: 'shell_run', args: {} }));
});
test('Stopping a session rejects an expert response that completes afterwards', async () => {
  let release;
  const f = fixture({ providers: { askAtlas: () => new Promise(resolve => { release = resolve; }) } });
  const lease = await f.service.start(request);
  const work = f.service.tool(lease.id, request.owner, { id: 't', name: 'ask_expert', args: { agent: 'atlas', question: 'Bekle' } });
  f.service.stop(lease.id, request.owner); release('Geç yanıt');
  await assert.rejects(work); assert.equal(f.events.length, 0);
});
test('Failed token requests release reserved session capacity', async () => {
  let count = 0;
  const f = fixture({ tokenClient: { authTokens: { create: async () => { count++; throw new Error('Quota'); } } } });
  for (let i = 0; i < 4; i++) await assert.rejects(f.service.start(request), /Quota/);
  assert.equal(count, 4);
});
test('Repeated turn persistence cannot duplicate a spoken conversation', async () => {
  const f = fixture(), lease = await f.service.start(request);
  const turn = { turnId: 'turn-1', user: 'Merhaba', assistant: 'Selam', interrupted: true };
  assert.equal(f.service.turn(lease.id, request.owner, turn).saved, true);
  assert.equal(f.service.turn(lease.id, request.owner, turn).saved, false);
  assert.equal(f.state.history.length, 2); assert.equal(f.saved, 1);
  assert.equal(f.state.history[1].interrupted, true);
});
test('PCM encoding is little-endian and preserves negative and positive amplitudes', () => {
  const samples = new Int16Array([-32768, 0, 32767]), output = decodePcm(pcmToBase64(samples));
  assert.equal(output[0], -1); assert.equal(output[1], 0); assert.ok(output[2] > 0.999);
  assert.throws(() => decodePcm('AQ==')); assert.throws(() => decodePcm(''));
});
function mockAudio() {
  const nodes = [];
  const context = { currentTime: 1, destination: {}, closed: 0, audioWorklet: { addModule: async () => {} }, resume: async () => {}, close: async () => { context.closed++; },
    createBuffer: (_channels, length, rate) => ({ duration: length / rate, copyToChannel() {} }),
    createBufferSource() { const n = { connect() {}, disconnect() {}, start(time) { this.time = time; }, stop() { this.stopped = true; } }; nodes.push(n); return n; },
    createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), createGain: () => ({ gain: {}, connect() {}, disconnect() {} }),
  };
  return { context, nodes };
}
test('Interrupted audio removes all scheduled playback and resets the cursor', () => {
  const { context, nodes } = mockAudio(), player = new PcmPlayer(context);
  const pcm = pcmToBase64(new Int16Array(240)); player.play(pcm); player.play(pcm);
  assert.ok(nodes[1].time > nodes[0].time); player.stop();
  assert.equal(player.nodes.size, 0); assert.equal(player.cursor, context.currentTime);
  assert.ok(nodes.every(n => n.stopped));
});
test('Stopping while microphone permission is pending closes a late microphone stream', async () => {
  let resolveMedia, stopped = 0, apiCalls = 0;
  const { context } = mockAudio(), states = [];
  const controller = createLiveController({ client: 'client', api: async () => { apiCalls++; }, onState: x => states.push(x), onTranscript: () => {}, audioFactory: () => context,
    media: { getUserMedia: () => new Promise(resolve => { resolveMedia = resolve; }) } });
  const pending = controller.start({ agent: 'jarvis', timeZone: 'Europe/Istanbul' });
  await new Promise(resolve => setImmediate(resolve)); controller.stop();
  resolveMedia({ getTracks: () => [{ stop() { stopped++; } }] }); await pending;
  assert.ok(stopped >= 1); assert.equal(apiCalls, 0); assert.equal(states.at(-1).phase, 'idle');
});
test('Live controller handles speech, interruption, one tool execution, and stale callbacks', async () => {
  const { context, nodes } = mockAudio(), calls = [], states = [], transcriptions = [];
  let callbacks, stopped = 0, socketClosed = 0;
  const socket = { close: () => socketClosed++, sendToolResponse: x => calls.push(['tool-response', x]), sendRealtimeInput: x => calls.push(['audio', x]), sendClientContent: x => calls.push(['text', x]) };
  const controller = createLiveController({ client: 'owner', audioFactory: () => context, workletFactory: () => ({ port: {}, connect() {}, disconnect() {} }),
    media: { getUserMedia: async () => ({ getTracks: () => [{ stop() { stopped++; } }] }) },
    clientFactory: async () => ({ live: { connect: async p => { callbacks = p.callbacks; return socket; } } }),
    api: async (path, params) => { calls.push([path, params]); return path === '/api/live/start' ? { id: 'lease', token: 'auth_tokens/test', model: 'test', config: {}, expiresAt: new Date(Date.now() + 10000).toISOString() } : { answer: 'Test' }; },
    onState: x => states.push(x), onTranscript: x => transcriptions.push(x),
  });
  await controller.start({ agent: 'jarvis', timeZone: 'Europe/Istanbul' });
  assert.equal(states.at(-1).phase, 'listening');
  callbacks.onmessage({ serverContent: { inputTranscription: { text: 'Soru' }, outputTranscription: { text: 'Cevap' }, modelTurn: { parts: [{ inlineData: { data: pcmToBase64(new Int16Array(240)), mimeType: 'audio/pcm;rate=24000' } }] } } });
  assert.equal(states.at(-1).phase, 'speaking');
  callbacks.onmessage({ serverContent: { interrupted: true } }); assert.ok(nodes[0].stopped);
  const fc = { id: 'one', name: 'get_clock', args: {} };
  callbacks.onmessage({ toolCall: { functionCalls: [fc, fc] } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(([p]) => p === '/api/live/lease/tool').length, 1);
  controller.stop(); assert.ok(stopped); assert.ok(socketClosed);
  const before = transcriptions.length; callbacks.onmessage({ serverContent: { inputTranscription: { text: 'Eski mesaj' } } }); assert.equal(transcriptions.length, before);
});
test('AudioWorklet resamples 44.1/48 kHz across block boundaries and emits bounded PCM packets', () => {
  for (const rate of [44100, 48000]) {
    let Klass; const packets = [];
    const scope = { AudioWorkletProcessor: class { constructor() { this.port = { postMessage: packet => packets.push(packet) }; } }, registerProcessor: (_name, processor) => { Klass = processor; }, sampleRate: rate };
    vm.runInNewContext(readFileSync(new URL('../public/jarvis-pcm-worklet.js', import.meta.url), 'utf8'), scope);
    const processor = new Klass();
    for (let i = 0; i < rate; i += 128) processor.process([[new Float32Array(Math.min(128, rate - i)).fill(0.5)]]);
    assert.equal(packets.length, 50); assert.ok(packets.every(p => p.length === 320 && p[0] === 16384));
  }
});

test('Renamed agents keep their roles in direct identity and multi-speaker responses', async () => {
  const settings = mergeSettings(defaultSettings(), { profiles: { jarvis: { name: 'Komutan' }, atlas: { name: 'Bilge' }, nexus: { name: 'Usta' } } });
  const { orchestrate } = createOrchestrator({ getSettings: () => settings });
  const identity = await orchestrate('Dilan, sen kimsin');
  assert.match(identity.reply, /Komutan/); assert.match(identity.reply, /koordinasyon/);
  const team = await orchestrate('Dilan Lara Vera sırayla kendinizi tanıtın');
  assert.deepEqual(team.turns.map(x => x.name), ['Komutan', 'Bilge', 'Usta']);
});

test('Provider connection errors cannot expose an ephemeral token in user-facing messages', async () => {
  const states = [], { context } = mockAudio();
  const controller = createLiveController({ client: 'owner', onState: x => states.push(x), onTranscript: () => {}, audioFactory: () => context,
    media: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
    api: async () => ({ id: 'lease', token: 'auth_tokens/private', expiresAt: new Date(Date.now() + 10000).toISOString() }),
    clientFactory: async () => { throw new Error('Failed https://provider/?access_token=auth_tokens/private'); },
  });
  await controller.start({ agent: 'jarvis', timeZone: 'Europe/Istanbul' });
  assert.equal(states.at(-1).phase, 'error'); assert.doesNotMatch(states.at(-1).error, /auth_tokens|private|https:/);
});

test('Agent histories isolate live personality instructions and keep unknown legacy turns out', async () => {
  const f = fixture();
  f.state.history.push({ role: 'user', content: 'OLD-UNSCOPED-SECRET' });
  const vera = await f.service.start({ ...request, agent: 'nexus' });
  f.service.turn(vera.id, request.owner, { turnId: 'v1', user: 'VERA-PRIVATE: ukala ol', assistant: 'VERA-ANSWER' });
  f.service.stop(vera.id, request.owner);
  const lara = await f.service.start({ ...request, agent: 'atlas' });
  assert.doesNotMatch(lara.config.systemInstruction, /VERA-PRIVATE|VERA-ANSWER|OLD-UNSCOPED-SECRET/);
  f.service.stop(lara.id, request.owner);
  const again = await f.service.start({ ...request, agent: 'nexus' });
  assert.match(again.config.systemInstruction, /VERA-PRIVATE/);
});

test('Expert handoff receives only the target agent history, not the caller personality', async () => {
  const context = new AsyncLocalStorage(); let received;
  const state = { settings: defaultSettings(), memory: emptyMemory(), history: [
    { role: 'user', agent: 'nexus', content: 'PRIVATE-VERA' },
    { role: 'user', agent: 'atlas', content: 'PRIVATE-LARA' },
  ] };
  const service = createLiveService({ state, context, save() {}, publish() {},
    tokenClient: { authTokens: { create: async () => ({ name: 'auth_tokens/test' }) } },
    providers: { askAtlas: async () => { received = context.getStore(); return 'Sonuç'; } } });
  const lease = await service.start({ ...request, agent: 'nexus' });
  await service.tool(lease.id, request.owner, { id: 'handoff', name: 'ask_expert', args: { agent: 'atlas', question: 'Kaynak araştır' } });
  assert.deepEqual(received.history, [{ role: 'user', content: 'PRIVATE-LARA' }]);
  assert.equal(received.agent, 'atlas');
});

test('Persisted profile personalities remain scoped and bounded', () => {
  const settings = mergeSettings(defaultSettings(), { profiles: { nexus: { personality: 'VERA-ONLY-STYLE' } } });
  const state = { settings, memory: emptyMemory(), history: [] };
  const config = agent => liveConfig({ state, agent, now: instant, timeZone: 'Europe/Istanbul' }).systemInstruction;
  assert.match(config('nexus'), /VERA-ONLY-STYLE/);
  assert.doesNotMatch(config('atlas'), /VERA-ONLY-STYLE/);
  assert.doesNotMatch(config('jarvis'), /VERA-ONLY-STYLE/);
  assert.equal(validSettings({ profiles: { nexus: { personality: 'x'.repeat(1001) } } }), false);
});
