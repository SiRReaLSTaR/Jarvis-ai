import { timingSafeEqual } from 'node:crypto';
import { aliasPosition } from './agents/aliases.js';
import { createPersistentStore } from './persistence.js';
export { emptyMemory, validMemory } from './state-schema.js';
export { defaultSettings, validSettings } from './settings.js';
export const createStore = createPersistentStore;
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
  return aliasPosition(text, aliases) >= 0;
}
