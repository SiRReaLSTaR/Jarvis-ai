import { parseTodoCommand, commandText } from './todo-intent.js';
import { randomUUID } from 'node:crypto';
import { clockSnapshot } from './clock.js';
export const PRIORITIES = ['low', 'normal', 'high'];
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31') return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
export function todoFields(input, partial = false) {
  if (!object(input)) fail('Geçersiz görev.');
  const allowed = ['title', 'notes', 'dueDate', 'dueTime', 'timeZone', 'priority', 'status'];
  if (Object.keys(input).some(k => !allowed.includes(k))) fail('Bilinmeyen görev alanı.');
  const out = partial ? {} : { notes: '', dueDate: null, dueTime: null, timeZone: 'Europe/Istanbul', priority: 'normal', status: 'open' };
  for (const key of allowed) if (Object.hasOwn(input, key)) out[key] = input[key];
  if ((!partial || 'title' in out) && (typeof out.title !== 'string' || !out.title.trim() || out.title.length > 200)) fail('Görev başlığı 1–200 karakter olmalı.');
  if ('title' in out) out.title = out.title.trim();
  if ('notes' in out && (typeof out.notes !== 'string' || out.notes.length > 2000)) fail('Not en fazla 2000 karakter olmalı.');
  if ('dueDate' in out && out.dueDate !== null && !validDate(out.dueDate)) fail('Geçerli bir tarih seçin.');
  if ('dueTime' in out && out.dueTime !== null && (typeof out.dueTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(out.dueTime))) fail('Geçerli bir saat seçin.');
  if ('timeZone' in out) { try { if (typeof out.timeZone !== 'string') throw new Error(); clockSnapshot(out.timeZone); } catch { fail('Geçersiz saat dilimi.'); } }
  if ('priority' in out && !PRIORITIES.includes(out.priority)) fail('Geçersiz öncelik.');
  if ('status' in out && !['open', 'done'].includes(out.status)) fail('Geçersiz görev durumu.');
  return out;
}
export function normalizeTodos(raw) {
  if (raw === undefined) return { todos: [], warnings: [] };
  if (!Array.isArray(raw) || raw.length > 500) throw new Error('STATE_INVALID_TODOS');
  const todos = [], seen = new Set(), requests = new Set();
  for (const item of raw) {
    try {
      if (!object(item) || typeof item.id !== 'string' || !item.id || item.id.length > 160 || seen.has(item.id) || !Number.isSafeInteger(item.version) || item.version < 1) throw new Error();
      for (const key of ['createdAt', 'updatedAt']) if (typeof item[key] !== 'string' || !Number.isFinite(Date.parse(item[key]))) throw new Error();
      if (typeof item.requestId !== 'string' || !item.requestId || item.requestId.length > 200 || requests.has(item.requestId)) throw new Error();
      const fields = todoFields(Object.fromEntries(['title','notes','dueDate','dueTime','timeZone','priority','status'].map(k => [k,item[k]])));
      if (fields.dueTime && !fields.dueDate) throw new Error();
      if (fields.status === 'done' && (typeof item.completedAt !== 'string' || !Number.isFinite(Date.parse(item.completedAt)))) throw new Error();
      todos.push({ ...fields, id:item.id, requestId:item.requestId, version:item.version, createdAt:item.createdAt, updatedAt:item.updatedAt, completedAt: fields.status === 'done' ? item.completedAt : null });
      seen.add(item.id); requests.add(item.requestId);
    } catch { /* Persistence archives the original if any record needs recovery. */ }
  }
  return { todos, warnings: todos.length === raw.length ? [] : [`Kişisel görevler: ${raw.length - todos.length} geçersiz kayıt ayrıldı`] };
}
export function createTodoService({ state, save, publish = () => {}, now = Date.now }) {
  function commit(next) {
    const previous = state.todos;
    state.todos = next;
    try { save(); } catch { state.todos = previous; fail('Görev kaydedilemedi. Önceki kayıtlar korundu; tekrar denemeden bağlantıyı kontrol edin.', 503); }
    publish('state', state);
  }
  return {
    list() { return structuredClone(state.todos || []); },
    create(input, requestId) {
      const fields = todoFields(input);
      if (fields.dueTime && !fields.dueDate) fail('Saat için tarih de seçin.');
      if (typeof requestId !== 'string' || !requestId || requestId.length > 200) fail('Geçerli bir işlem kimliği gerekli.');
      const old = (state.todos || []).find(t => t.requestId === requestId);
      if (old) {
        // The original creation cannot be replayed as a new mutation after an edit.
        if (old.version !== 1 || Object.keys(fields).some(k => fields[k] !== old[k])) fail('İşlem daha önce kullanıldı. Güncel listeyi kontrol edin.', 409);
        return structuredClone(old);
      }
      if ((state.todos || []).length >= 500) fail('Görev defteri 500 kayıt sınırına ulaştı.', 409);
      const at = new Date(now()).toISOString();
      const item = { ...fields, id: randomUUID(), requestId, version:1, createdAt:at, updatedAt:at, completedAt:fields.status === 'done' ? at : null };
      commit([item, ...(state.todos || [])]); return structuredClone(item);
    },
    remove(id, version) {
      const items = state.todos || [], old = items.find(t => t.id === id);
      if (!old) fail('Görev bulunamadı. Listeyi yenileyin.', 404);
      if (!Number.isSafeInteger(version) || old.version !== version) fail('Görev başka bir ekranda değişti. Güncel kaydı kontrol edip silmeyi yeniden onaylayın.', 409);
      commit(items.filter(t => t.id !== id));
      return { deleted:true, id };
    },
    update(id, patch, version) {
      const fields = todoFields(patch, true), items = state.todos || [], old = items.find(t => t.id === id);
      if (!old) fail('Görev bulunamadı.', 404);
      if (!Number.isSafeInteger(version) || old.version !== version) fail('Görev başka bir ekranda değişti. Liste yenilendi; değişikliği kontrol edip tekrar deneyin.', 409);
      const next = { ...old, ...fields, version:old.version + 1, updatedAt:new Date(now()).toISOString() };
      if (next.dueTime && !next.dueDate) fail('Saat için tarih de seçin.');
      next.completedAt = next.status === 'done' ? old.completedAt || next.updatedAt : null;
      commit(items.map(t => t.id === id ? next : t)); return structuredClone(next);
    },
  };
}
export function todoCommand(message, service, { timeZone = 'Europe/Istanbul', now = Date.now(), requestId } = {}) {
  const command = parseTodoCommand(message);
  if (!command) return null;
  if (command.type === 'list' || command.type === 'today') {
    const today = clockSnapshot(timeZone, now).localDate;
    const items = service.list().filter(t => t.status === 'open' && (command.type !== 'today' || t.dueDate === today));
    return items.length ? items.slice(0,50).map((t,i) => `${i+1}. ${t.title}${t.dueDate ? ` · ${t.dueDate}${t.dueTime ? ' '+t.dueTime : ''}` : ''}${t.priority === 'high' ? ' · Yüksek öncelik' : ''}`).join('\n') + (items.length > 50 ? `\n${items.length-50} görev daha var; tamamını görev defterinde görebilirsin.` : '') : 'Bu görünümde açık kişisel görevin yok.';
  }
  if (command.type === 'create' && command.title) {
    let title = command.title, dueDate = null;
    const prefix = title.toLocaleLowerCase('tr-TR').match(/^(bugün|yarın|\d{4}-\d{2}-\d{2})\s*:\s*(.+)$/u);
    if (prefix) {
      const date = prefix[1].toLocaleLowerCase('tr-TR'); title = title.slice(title.indexOf(':')+1).trim();
      if (date === 'bugün' || date === 'yarın') {
        dueDate = clockSnapshot(timeZone, now).localDate;
        if (date === 'yarın') dueDate = new Date(Date.parse(dueDate+'T12:00:00Z')+86400000).toISOString().slice(0,10);
      } else dueDate = date;
    }
    const todo = service.create({ title, dueDate, timeZone }, requestId);
    return `Görev defterine kaydedildi: ${todo.title}${todo.dueDate ? ' · '+todo.dueDate : ''}.`;
  }
  if (command.type === 'complete' && command.title) {
    const canonical = title => commandText(title).toLocaleLowerCase('tr-TR');
    const title = canonical(command.title);
    const open = service.list().filter(t => t.status === 'open');
    let matches = open.filter(t => canonical(t.title) === title);
    if (!matches.length && /[.!?]$/.test(title)) matches = open.filter(t => canonical(t.title) === title.replace(/[.!?]+$/, ''));
    if (matches.length !== 1) return matches.length ? 'Bu adla birden fazla açık görev var. Görev defterinden doğru kaydı seç.' : 'Bu adla açık görev bulunamadı. Başlığı görev defterindeki gibi yaz.';
    const todo = service.update(matches[0].id, {status:'done'}, matches[0].version);
    return `Tamamlandı olarak kaydedildi: ${todo.title}.`;
  }
  return 'Komut örneği: Görev ekle: yarın: Teklifi hazırla. Tamamlamak için: Görevi tamamla: Teklifi hazırla.';
}
