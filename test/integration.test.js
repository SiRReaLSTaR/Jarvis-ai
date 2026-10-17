import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, emptyMemory } from '../lib/runtime.js';
// Real HTTP routes and SSE; providers are deterministic and never call a paid API.
test('Authenticated HTTP, two-screen SSE, memory conflicts, streaming, and cancellation', async () => {
  const { createApp } = await import('../server.js');
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-http-'));
  const previous = process.env.JARVIS_ACCESS_TOKEN;
  process.env.JARVIS_ACCESS_TOKEN = 'integration-token';
  const providersFactory = ({ context }) => ({
    agentStates: {},
    askJarvis: async message => {
      const run = context.getStore();
      run.onDelta({ speaker: 'jarvis', text: 'Başlangıç' });
      await new Promise((resolve, reject) => {
        const finish = () => { clearTimeout(timer); run.signal.removeEventListener('abort', cancel); resolve(); };
        const timer = setTimeout(finish, message === 'Bekle' ? 3000 : 40);
        const cancel = () => { clearTimeout(timer); reject(run.signal.reason); };
        run.signal.addEventListener('abort', cancel, { once: true });
      });
      return 'Tamamlandı';
    },
  });
  const { app, hub, store } = createApp({ store: createStore(directory), providersFactory });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: 'Bearer integration-token', 'content-type': 'application/json' };
  const call = (path, options = {}) => fetch(base + path, { ...options, headers: { ...headers, ...options.headers } });
  const controllers = [new AbortController(), new AbortController()];
  try {
    assert.equal((await fetch(base + '/api/state')).status, 401);
    assert.equal((await call('/api/state', { headers: { origin: 'https://evil.example' } })).status, 403);
    const streams = await Promise.all(controllers.map(c => call('/api/events', { signal: c.signal })));
    assert.equal(hub.size, 2);
    const readers = streams.map(s => s.body.getReader());
    for (const r of readers) await r.read();
    const memory = emptyMemory(); memory.projects.push({ text: 'Senkron proje' });
    assert.equal((await call('/api/memory', { method: 'PUT', body: JSON.stringify({ memory, revision: 0 }) })).status, 200);
    for (const r of readers) {
      const packet = await r.read(); assert.match(new TextDecoder().decode(packet.value), /state|presence/);
    }
    assert.equal((await call('/api/memory', { method: 'PUT', body: JSON.stringify({ memory: emptyMemory(), revision: 0 }) })).status, 409);
    assert.equal(store.state.memory.projects[0].text, 'Senkron proje');
    const response = await call('/api/chat', { method: 'POST', body: JSON.stringify({ message: 'Bekle', client: 'tablet' }) });
    assert.equal(response.status, 202); const { task } = await response.json();
    assert.equal((await call('/api/chat', { method: 'POST', body: JSON.stringify({ message: 'Başka' }) })).status, 409);
    assert.equal((await call(`/api/tasks/${task.id}/cancel`, { method: 'POST' })).status, 202);
    for (let attempt = 0; attempt < 100 && store.state.tasks[0].status === 'running'; attempt++) await new Promise(r => setTimeout(r, 10));
    assert.equal(store.state.tasks[0].status, 'cancelled');
    assert.equal(store.state.history.filter(x => x.role === 'assistant').length, 0);
    const next = await call('/api/chat', { method: 'POST', body: JSON.stringify({ message: 'Selam', client: 'telefon' }) });
    assert.equal(next.status, 202);
    for (let attempt = 0; attempt < 100 && store.state.tasks[0].status === 'running'; attempt++) await new Promise(r => setTimeout(r, 10));
    assert.equal(store.state.tasks[0].status, 'completed');
    assert.equal(store.state.history.at(-1).content, 'Tamamlandı');
  } finally {
    controllers.forEach(c => c.abort()); hub.close(); server.closeAllConnections(); await new Promise(r => server.close(r));
    if (previous === undefined) delete process.env.JARVIS_ACCESS_TOKEN; else process.env.JARVIS_ACCESS_TOKEN = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
