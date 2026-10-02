import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AsyncLocalStorage } from "node:async_hooks";
import { createStore, accessControl, validMemory } from "./lib/runtime.js";
import { GoogleGenAI } from "@google/genai";

import {createAgentProviders} from './lib/agents/providers.js';
import {createOrchestrator} from './lib/agents/orchestrator.js';

dotenv.config();

const app = express();

const HOST = process.env.HOST || '127.0.0.1';
const token = process.env.JARVIS_ACCESS_TOKEN || '';
if (HOST !== '127.0.0.1' && HOST !== 'localhost' && !token) throw new Error('Dış erişim için JARVIS_ACCESS_TOKEN gerekli.');
const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(x => x.trim());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "1mb" }));

const store = createStore(process.env.JARVIS_DATA_DIR || './data');
const context = new AsyncLocalStorage();
app.use('/api', accessControl({ token, origins, limit: 120 }));
const chatLimit = accessControl({ token, origins, limit: 20 });
const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "not-configured",
  httpOptions: { timeout: 90000 },
});

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";

/* =========================================================
   DİLAN V5.3.3
   MULTI-AGENT + MULTI-SPEAKER CORE
   ========================================================= */

/* =========================================================
   MEMORY CORE
   ========================================================= */

const providers=createAgentProviders({gemini,context,GEMINI_MODEL,OPENROUTER_MODEL});
const {agentStates}=providers;
const {orchestrate}=createOrchestrator(providers);

app.get('/api/status', (req, res) => res.json({ online: true, agentStates, lastSuccess: store.state.lastSuccess,
  agents: { jarvis: { name: 'DİLAN', configured: Boolean(process.env.GEMINI_API_KEY) }, atlas: { name: 'LARA', configured: Boolean(process.env.GEMINI_API_KEY) }, nexus: { name: 'VERA', configured: Boolean(process.env.OPENROUTER_API_KEY) } },
  executionEnabled: false }));
app.get('/api/state', (req, res) => res.json(store.state));
app.put('/api/memory', (req, res) => {
  if (!validMemory(req.body)) return res.status(400).json({ error: 'Geçersiz hafıza.' });
  store.state.memory = req.body; store.save(); res.json({ ok: true });
});
app.delete('/api/history', (req, res) => { store.state.history = []; store.save(); res.json({ ok: true }); });
let busy = false;
app.post('/api/chat', chatLimit, async (req, res) => {
  if (typeof req.body.message !== 'string' || !req.body.message.trim() || req.body.message.length > 8000) return res.status(400).json({ error: 'Komut 1–8000 karakter olmalı.' });
  if (busy) return res.status(409).json({ error: 'Önceki görev devam ediyor.' });
  busy = true;
  const message = req.body.message.trim();
  const task = store.task(message);
  const run = { history: store.state.history.slice(-20).map(({ role, content }) => ({ role, content })), sources: [] };
  const memory = Object.entries(store.state.memory).flatMap(([key, items]) => items.slice(0, 20).map(x => `${key}: ${x.text}`)).join('\n');
  try {
    const result = await context.run(run, () => orchestrate(message, memory));
    task.status = result.route.includes('fallback') || result.route.includes('partial') ? 'partial' : 'completed';
    task.route = result.route; task.agents = result.agents; task.finishedAt = new Date().toISOString();
    store.state.lastSuccess = task.finishedAt;
    store.state.history.push({ role: 'user', content: message }, { role: 'assistant', content: result.reply, speaker: result.speaker, turns: result.turns || [] });
    store.state.history = store.state.history.slice(-40);
    store.save();
    res.json({ ...result, sources: run.sources, task });
  } catch (error) {
    console.error('Chat error:', error);
    task.status = 'failed'; task.finishedAt = new Date().toISOString(); store.save();
    res.status(502).json({ error: 'Yapay zekâ bağlantısı yanıt vermedi. Sağlayıcı ayarlarını kontrol et.', task });
  } finally { busy = false; }
});

/* =========================================================
   SERVER
   ========================================================= */

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, HOST, () => {
  console.log("");
  console.log("════════════════════════════════");
  console.log("🧠 DİLAN V5.3.2 MULTI-AGENT SYSTEM");
  console.log("════════════════════════════════");

  console.log("🔴 DİLAN // COMMAND CORE // HAZIR");

  console.log(
    `🔵 LARA // RESEARCH CORE // ${
      process.env.GEMINI_API_KEY ? "HAZIR" : "YOK"
    }`
  );

  console.log(
    `🟣 VERA // ENGINEERING CORE // ${
      process.env.OPENROUTER_API_KEY ? "HAZIR" : "YOK"
    }`
  );

  console.log(`🧠 LARA MODEL: ${GEMINI_MODEL}`);
  console.log(`🧠 VERA MODEL: ${OPENROUTER_MODEL}`);

  console.log("🎙️ MULTI-SPEAKER CORE // HAZIR");
  console.log("⚡ FAST IDENTITY MODE // HAZIR");

  console.log(`🌐 SERVER: http://localhost:${PORT}`);
  console.log("🛡️ STABLE SERVER CORE // AKTİF");

  console.log("════════════════════════════════");
  console.log("");
});

server.on("error", (error) => {
  console.error("❌ SERVER ERROR:", error);
});