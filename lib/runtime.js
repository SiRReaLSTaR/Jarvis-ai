import { defaultSettings, mergeSettings } from './settings.js';
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
export const emptyMemory = () => ({ memories: [], projects: [], ideas: [], tasks: [], preferences: [] });
export function validMemory(value) {
  const keys = Object.keys(emptyMemory());
  return Boolean(value && JSON.stringify(value).length <= 300_000 && Object.keys(value).length === keys.length && keys.every(k => Array.isArray(value[k]) && value[k].length <= 500 && value[k].every(x => x && typeof x.text === 'string' && x.text.trim().length > 0 && x.text.length <= 4000)));
}
export { defaultSettings, validSettings } from './settings.js';
export function createStore(directory) {
  mkdirSync(directory, { recursive: true });
  const file = resolve(directory, 'state.json');
  let state = { memory: emptyMemory(), history: [], tasks: [], lastSuccess: null, revision: 0, version: 0, settings: defaultSettings() };
  try { state = { ...state, ...JSON.parse(readFileSync(file, 'utf8')) }; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (!validMemory(state.memory) || !Array.isArray(state.history) || !Array.isArray(state.tasks)) throw new Error('Kalıcı veri biçimi geçersiz; yedeği kontrol edin.');
  state.settings = mergeSettings(state.settings, {});
  state.tasks = state.tasks.map(t => ['running', 'queued'].includes(t.status) ? { ...t, status: 'interrupted' } : t);
  const save = () => { state.version = (state.version || 0) + 1; writeFileSync(file + '.tmp', JSON.stringify(state), { mode: 0o600 }); renameSync(file + '.tmp', file); };
  save();
  return { state, save, task(message) { const task = { id: randomUUID(), message: message.slice(0, 2000), status: 'running', createdAt: new Date().toISOString() }; state.tasks.unshift(task); state.tasks = state.tasks.slice(0, 100); save(); return task; } };
}
export function accessControl({ token, origins, limit = 30, windowMs = 60000 }) {
  const attempts = new Map();
  return (req, res, next) => {
    if (req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({ error: 'Bu kaynağa erişim izni yok.' });
    if (token) {
      const received = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /, ''));
      const expected = Buffer.from(token);
      if (received.length !== expected.length || !timingSafeEqual(received, expected)) return res.status(401).json({ error: 'Erişim anahtarı gerekli.' });
    }
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + windowMs };
    attempts.set(key, entry);
    if (++entry.count > limit) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ error: 'Çok fazla istek. Biraz bekle.' }); }
    next();
  };
}
export function exactAgent(text, aliases) {
  return aliases.some(alias => new RegExp(`(^|[^\\p{L}\\p{N}_])${alias}(?=$|[^\\p{L}\\p{N}_])`, 'u').test(text));
}
