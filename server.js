import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { createStore, accessControl, validMemory, validSettings } from './lib/runtime.js';
import { createAgentProviders } from './lib/agents/providers.js';
import { createOrchestrator } from './lib/agents/orchestrator.js';
import { createEventHub } from './lib/events.js';
import { createJobs } from './lib/jobs.js';
import { createDashboard } from './lib/dashboard.js';
import { createHome } from './lib/home.js';
import { AGENTS, mergeSettings } from './lib/settings.js';
import { createLiveService } from './lib/live/service.js';
import { clockSnapshot } from './lib/clock.js';

dotenv.config();
export function createApp({ store = createStore(process.env.JARVIS_DATA_DIR || './data'), providersFactory = createAgentProviders, dashboard = createDashboard(), home = createHome(), tokenClient } = {}) {
  const app = express();
  const host = process.env.HOST || '127.0.0.1';
  const token = process.env.JARVIS_ACCESS_TOKEN || '';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !token) throw new Error('Dış erişim için JARVIS_ACCESS_TOKEN gerekli.');
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(x => x.trim());
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '6mb' }));
  app.use('/api', accessControl({ token, origins, limit: 180 }));
  const hub = createEventHub(), context = new AsyncLocalStorage();
  const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'not-configured', httpOptions: { timeout: 90_000 } });
  const providers = providersFactory({ gemini, context, GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', GEMINI_SEARCH_MODEL: process.env.GEMINI_SEARCH_MODEL || 'gemini-2.5-flash', OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free', getSettings: () => store.state.settings, onState: states => hub.publish('agents', states) });
  const { orchestrate: agentOrchestrate } = createOrchestrator({ ...providers, getSettings: () => store.state.settings });
  const live = createLiveService({ tokenClient: tokenClient || new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'not-configured', apiVersion: 'v1alpha', httpOptions: { timeout: 15_000 } }), state: store.state, save: store.save, publish: hub.publish, providers, context });
  const jobs = createJobs({ store, context, publish: hub.publish, orchestrate: (message, memory) => context.getStore()?.image ? providers.askJarvis(message, memory).then(reply => ({ reply, speaker: 'jarvis', route: 'vision', agents: ['jarvis'] })) : context.getStore()?.agent && context.getStore().agent !== 'jarvis' ? (context.getStore().agent === 'atlas' ? providers.askAtlas : providers.askNexus)(message, memory).then(reply => ({ reply, speaker: context.getStore().agent, route: 'selected-agent', agents: [context.getStore().agent] })) : agentOrchestrate(message, memory) });
  const status = () => ({ online: true, agentStates: providers.agentStates, lastSuccess: store.state.lastSuccess, screens: hub.size, active: jobs.active,
    agents: { jarvis: { name: 'DİLAN', configured: Boolean(process.env.GEMINI_API_KEY) }, atlas: { name: 'LARA', configured: Boolean(process.env.GEMINI_API_KEY) }, nexus: { name: 'VERA', configured: Boolean(process.env.OPENROUTER_API_KEY) } }, executionEnabled: false, liveEnabled: Boolean(process.env.GEMINI_API_KEY) });
  app.get('/api/status', (_req, res) => res.json(status()));
  app.get('/api/events', hub.connect);
  app.get('/api/state', (_req, res) => res.json({ ...store.state, active: jobs.active }));
  app.put('/api/memory', (req, res) => {
    if (!validMemory(req.body.memory) || !Number.isSafeInteger(req.body.revision)) return res.status(400).json({ error: 'Geçersiz hafıza.' });
    if (req.body.revision !== store.state.revision) return res.status(409).json({ error: 'Hafıza başka bir ekranda değişti. Güncel kayıtları yükleyip tekrar deneyin.', state: store.state });
    store.state.memory = req.body.memory; store.state.revision++; store.save(); hub.publish('state', store.state); res.json({ revision: store.state.revision });
  });
  app.patch('/api/settings', (req, res) => {
    if (!validSettings(req.body)) return res.status(400).json({ error: 'Geçersiz ayar.' });
    store.state.settings = mergeSettings(store.state.settings, req.body); store.save(); hub.publish('state', store.state); res.json(store.state.settings);
  });
  app.delete('/api/history', (_req, res) => {
    if (jobs.active) return res.status(409).json({ error: 'Önce çalışan görevi iptal edin.' });
    store.state.history = []; store.save(); hub.publish('state', store.state); res.json({ ok: true });
  });
  app.post('/api/chat', accessControl({ token, origins, limit: 20 }), (req, res) => {
    if (typeof req.body.message !== 'string' || !req.body.message.trim() || req.body.message.length > 8000) return res.status(400).json({ error: 'Komut 1–8000 karakter olmalı.' });
    let image;
    if (req.body.image !== undefined) {
      const match = typeof req.body.image === 'string' && req.body.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match || match[2].length > 5_500_000) return res.status(400).json({ error: 'En fazla 4 MB JPEG, PNG veya WebP fotoğraf gönderin.' });
      image = { mimeType: match[1], data: match[2] };
    }
    const agent = req.body.agent || store.state.settings.selectedAgent;
    if (!Object.hasOwn(AGENTS, agent)) return res.status(400).json({ error: 'Geçersiz ajan.' });
    let clock;
    try { clock = clockSnapshot(req.body.timeZone || 'Europe/Istanbul'); } catch { return res.status(400).json({ error: 'Geçersiz saat dilimi.' }); }
    const result = jobs.start(req.body.message.trim(), String(req.body.client || '').slice(0, 80), image, { agent, clock });
    if (!result) return res.status(409).json({ error: 'Önceki görev devam ediyor.' });
    res.status(202).json({ task: result.task });
  });
  app.post('/api/tasks/:id/cancel', (req, res) => {
    if (!jobs.cancel(req.params.id)) return res.status(404).json({ error: 'Çalışan görev bulunamadı.' });
    res.status(202).json({ ok: true });
  });
  app.post('/api/live/start', accessControl({ token, origins, limit: 6 }), async (req, res) => {
    if (!process.env.GEMINI_API_KEY && !tokenClient) return res.status(503).json({ error: 'Canlı ses için sunucudaki Gemini anahtarını yapılandırın.' });
    try {
      const data = await live.start({ agent: req.body.agent || store.state.settings.selectedAgent, owner: req.body.client, timeZone: req.body.timeZone || 'Europe/Istanbul' });
      res.set('Cache-Control', 'no-store'); res.json(data);
    } catch { res.status(502).json({ error: 'Canlı oturum açılamadı. Gemini Live model erişimini, kotayı ve saat dilimini kontrol edin.' }); }
  });
  app.post('/api/live/:id/stop', (req, res) => {
    try { live.stop(req.params.id, req.body.client); res.json({ ok: true }); }
    catch { res.status(404).json({ error: 'Canlı oturum bulunamadı.' }); }
  });
  app.post('/api/live/:id/tool', async (req, res) => {
    try { res.json(await live.tool(req.params.id, req.body.client, req.body.call)); }
    catch { res.status(400).json({ error: 'Uzman aracı çalıştırılamadı veya oturum sona erdi.' }); }
  });
  app.post('/api/live/:id/turn', (req, res) => {
    try { res.json(live.turn(req.params.id, req.body.client, req.body)); }
    catch { res.status(400).json({ error: 'Konuşma kaydedilemedi veya oturum sona erdi.' }); }
  });
  app.get('/api/dashboard', async (_req, res) => res.json(await dashboard(store.state.settings.city)));
  app.get('/api/home', async (_req, res) => res.json(await home.state()));
  app.post('/api/home/:id', async (req, res) => {
    if (req.body.confirm !== true || typeof req.body.on !== 'boolean') return res.status(400).json({ error: 'Cihaz işlemini onaylayın.' });
    try { const data = await home.control(req.params.id, req.body.on); hub.publish('home', data); res.json(data); }
    catch { res.status(502).json({ error: 'Cihaz işlemi doğrulanamadı. Gerçek cihazı kontrol edin.' }); }
  });
  const dist = resolve('dist');
  if (existsSync(resolve(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Uç nokta bulunamadı.' }));
  app.use((error, _req, res, _next) => res.status(error.status === 413 ? 413 : 500).json({ error: error.status === 413 ? 'Dosya çok büyük.' : 'İşlem tamamlanamadı.' }));
  return { app, hub, jobs, store, host };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { app, host } = createApp();
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, host, () => console.log(`JARVIS hazır: http://${host}:${port}`));
}
