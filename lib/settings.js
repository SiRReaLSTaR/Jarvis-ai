export const AGENTS = Object.freeze({
  jarvis: { name: 'DİLAN', role: 'Koordinasyon', voice: 'Charon', color: '#ff5263' },
  atlas: { name: 'LARA', role: 'Araştırma', voice: 'Aoede', color: '#43e88d' },
  nexus: { name: 'VERA', role: 'Teknik çalışma', voice: 'Puck', color: '#ffd45a' },
});
export const VOICES = ['Charon', 'Aoede', 'Puck', 'Kore', 'Fenrir', 'Leda'];
export const defaultSettings = () => ({ speechRate: 1.1, autoSpeak: true, city: 'İstanbul', selectedAgent: 'jarvis', profiles: Object.fromEntries(Object.entries(AGENTS).map(([id, a]) => [id, { name: a.name, voice: a.voice }])) });
export function validSettings(value) {
  return Boolean(value && !Array.isArray(value) && Object.keys(value).every(k => ['speechRate', 'autoSpeak', 'city', 'selectedAgent', 'profiles'].includes(k)) &&
    (value.speechRate === undefined || Number.isFinite(value.speechRate) && value.speechRate >= 0.7 && value.speechRate <= 1.5) &&
    (value.autoSpeak === undefined || typeof value.autoSpeak === 'boolean') &&
    (value.city === undefined || typeof value.city === 'string' && value.city.trim().length > 0 && value.city.length <= 80) &&
    (value.selectedAgent === undefined || Object.hasOwn(AGENTS, value.selectedAgent)) &&
    (value.profiles === undefined || value.profiles && !Array.isArray(value.profiles) && Object.keys(value.profiles).every(id => Object.hasOwn(AGENTS, id) && validProfile(value.profiles[id]))));
}
function validProfile(p) {
  return p && !Array.isArray(p) && Object.keys(p).every(k => ['name', 'voice', 'personality'].includes(k)) &&
    (p.name === undefined || typeof p.name === 'string' && /^[\p{L}\p{N} ]{2,16}$/u.test(p.name) && p.name.trim().length >= 2) &&
    (p.personality === undefined || typeof p.personality === 'string' && p.personality.length <= 1000) &&
    (p.voice === undefined || VOICES.includes(p.voice));
}
export function mergeSettings(current, patch) {
  const defaults = defaultSettings();
  const profiles = Object.fromEntries(Object.keys(AGENTS).map(id => [id, { ...defaults.profiles[id], ...current?.profiles?.[id], ...patch?.profiles?.[id] }]));
  return { ...defaults, ...current, ...patch, profiles };
}
