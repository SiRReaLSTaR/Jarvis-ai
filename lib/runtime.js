import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
export const emptyMemory = () => ({ memories: [], projects: [], ideas: [], tasks: [], preferences: [] });
export function validMemory(value) {
  return value && Object.keys(emptyMemory()).every(k => Array.isArray(value[k]) && value[k].length <= 500 && value[k].every(x => x && typeof x.text === 'string' && x.text.length <= 4000));
}
export function createStore(directory) {
  mkdirSync(directory, { recursive: true });
  const file = resolve(directory, 'state.json');
  let state = { memory: emptyMemory(), history: [], tasks: [], lastSuccess: null };
  try { state = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  state.tasks = state.tasks.map(t => ['running', 'queued'].includes(t.status) ? { ...t, status: 'interrupted' } : t);
  const save = () => { writeFileSync(file + '.tmp', JSON.stringify(state), { mode: 0o600 }); renameSync(file + '.tmp', file); };
  return { state, save, task(message) { const task = { id: randomUUID(), message, status: 'running', createdAt: new Date().toISOString() }; state.tasks.unshift(task); state.tasks = state.tasks.slice(0, 100); save(); return task; } };
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
