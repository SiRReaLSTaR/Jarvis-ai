import { normalizeTodos } from './todos.js';
import { AGENTS, defaultSettings, mergeSettings, validSettings } from './settings.js';
import { retainHistory } from './agent-context.js';
export const SCHEMA_VERSION = 2;
export const emptyMemory = () => ({ memories: [], projects: [], ideas: [], tasks: [], preferences: [] });
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = (x, max) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const agent = x => typeof x === 'string' && Object.hasOwn(AGENTS, x);
const date = x => typeof x === 'string' && Number.isFinite(Date.parse(x));
export function validMemory(value) {
  const keys = Object.keys(emptyMemory());
  return Boolean(object(value) && JSON.stringify(value).length <= 300_000 && Object.keys(value).length === keys.length && keys.every(k => Array.isArray(value[k]) && value[k].length <= 500 && value[k].every(x => object(x) && text(x.text, 4000))));
}
function sources(value) {
  return Array.isArray(value) ? value.filter(x => object(x) && typeof x.url === 'string' && /^https?:\/\//.test(x.url) && x.url.length <= 4000).slice(0,40).map(x => ({ url: x.url, title: typeof x.title === 'string' ? x.title.slice(0,1000) : x.url })) : [];
}
function historyItem(x) {
  if (!object(x) || !['user','assistant'].includes(x.role) || !text(x.content, 100_000) || (x.agent !== undefined && !agent(x.agent))) return null;
  const item = { role:x.role, content:x.content };
  if (x.agent !== undefined) item.agent=x.agent;
  if (agent(x.speaker)) item.speaker=x.speaker;
  if (text(x.taskId,160)) item.taskId=x.taskId;
  for (const key of ['live','interrupted','imageAttached']) if (typeof x[key] === 'boolean') item[key]=x[key];
  if (x.sources !== undefined) item.sources=sources(x.sources);
  if (Array.isArray(x.turns)) item.turns=x.turns.filter(t => object(t) && agent(t.speaker) && text(t.text,100_000)).slice(0,3).map(t => ({ speaker:t.speaker, text:t.text, ...(text(t.name,80) ? {name:t.name} : {}) }));
  return item;
}
const statuses=['running','queued','completed','partial','failed','interrupted','cancelled'];
function taskItem(x) {
  if (!object(x) || !text(x.id,160) || !text(x.message,2000) || !statuses.includes(x.status)) return null;
  const item={id:x.id,message:x.message,status:x.status};
  for (const key of ['createdAt','finishedAt']) if (date(x[key])) item[key]=x[key];
  for (const key of ['route','errorCode']) if (text(x[key],100)) item[key]=x[key];
  if (text(x.error,2000)) item.error=x.error;
  if (Array.isArray(x.agents)) item.agents=x.agents.filter(agent).slice(0,3);
  return item;
}
export function normalizeState(raw) {
  if (!object(raw)) throw new Error('STATE_INVALID');
  if (raw.schemaVersion !== undefined && (!Number.isSafeInteger(raw.schemaVersion) || raw.schemaVersion < 0)) throw new Error('STATE_INVALID');
  if ((raw.schemaVersion || 0) > SCHEMA_VERSION) { const e=new Error('Bu veri daha yeni bir Jarvis sürümüne ait. Güncel sürümle açın.');e.code='STATE_FUTURE_VERSION';throw e; }
  const personal = normalizeTodos(raw.todos);
  const warnings=[...personal.warnings];
  const memory=raw.memory === undefined ? emptyMemory() : raw.memory;
  if (!object(memory) || !Object.keys(emptyMemory()).every(k => Array.isArray(memory[k]))) throw new Error('STATE_INVALID_MEMORY');
  if (JSON.stringify(memory).length > 300_000) throw new Error('STATE_MEMORY_TOO_LARGE');
  const cleaned=emptyMemory();
  for (const key of Object.keys(cleaned)) {
    cleaned[key]=memory[key].filter(x => object(x) && text(x.text,4000)).slice(0,500);
    if (cleaned[key].length !== memory[key].length) warnings.push(`${key}: ${memory[key].length-cleaned[key].length} geçersiz/fazla kayıt ayrıldı`);
  }
  const history=raw.history === undefined ? [] : raw.history, tasks=raw.tasks === undefined ? [] : raw.tasks;
  if (!Array.isArray(history) || !Array.isArray(tasks)) throw new Error('STATE_INVALID_LISTS');
  const cleanHistory=history.map(historyItem).filter(Boolean), cleanTasks=tasks.map(taskItem).filter(Boolean);
  if (cleanHistory.length !== history.length) warnings.push(`Geçmiş: ${history.length-cleanHistory.length} geçersiz kayıt ayrıldı`);
  if (cleanTasks.length !== tasks.length) warnings.push(`Görevler: ${tasks.length-cleanTasks.length} geçersiz kayıt ayrıldı`);
  let settings=defaultSettings();
  if (object(raw.settings)) {
    for (const key of ['speechRate','autoSpeak','city','selectedAgent']) if (raw.settings[key] !== undefined) {
      if (validSettings({[key]:raw.settings[key]})) settings=mergeSettings(settings,{[key]:raw.settings[key]});
      else warnings.push(`Geçersiz ayar: ${key}`);
    }
    if (raw.settings.profiles !== undefined) {
      if (object(raw.settings.profiles)) for (const id of Object.keys(AGENTS)) {
        const p=raw.settings.profiles[id];if (p === undefined) continue;
        if (!object(p)) {warnings.push(`Geçersiz profil: ${id}`);continue;}
        for (const field of ['name','voice','personality']) if (p[field] !== undefined) {
          const patch={profiles:{[id]:{[field]:p[field]}}};
          if (validSettings(patch)) settings=mergeSettings(settings,patch);else warnings.push(`Geçersiz profil ayarı: ${id}/${field}`);
        }
      } else warnings.push('Geçersiz profil listesi');
    }
  } else if (raw.settings !== undefined) warnings.push('Geçersiz ayarlar');
  const counter = x => Number.isSafeInteger(x) && x >= 0 ? x : 0;
  const recovery=object(raw.recovery) && text(raw.recovery.message,2000) ? { message:raw.recovery.message, ...(date(raw.recovery.at) ? {at:raw.recovery.at} : {}), ...(text(raw.recovery.archive,200) ? {archive:raw.recovery.archive} : {}) } : null;
  return { warnings, state:{schemaVersion:SCHEMA_VERSION,todos:personal.todos,memory:cleaned,history:retainHistory(cleanHistory),tasks:cleanTasks.slice(0,100),settings,revision:counter(raw.revision),version:counter(raw.version),lastSuccess:date(raw.lastSuccess)?raw.lastSuccess:null,recovery} };
}
