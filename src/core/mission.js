export const TASK_LABELS = { running: 'Çalışıyor', queued: 'Bekliyor', completed: 'Yanıt hazır', partial: 'Kısmi sonuç', failed: 'Hata', interrupted: 'Kesintiye uğradı', cancelled: 'İptal edildi' };
export const MEMORY_LABELS = { memories: 'Notlar', projects: 'Projeler', ideas: 'Fikirler', tasks: 'Kayıtlı işler', preferences: 'Tercihler' };
export function missionSummary(state, system, connected) {
  const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
  const memory = Object.entries(MEMORY_LABELS).flatMap(([category]) => (Array.isArray(state?.memory?.[category]) ? state.memory[category] : []).map((item, index) => ({ ...item, category, key: `${category}-${index}` })));
  return { tasks, memory, running: tasks.filter(t => t.status === 'running' || t.status === 'queued').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    configured: connected && system ? Object.values(system.agents || {}).filter(a => a.configured).length : null,
    ready: Boolean(connected && state), revision: state?.revision ?? null };
}
export function displayTime(value, options = { hour: '2-digit', minute: '2-digit' }) {
  if (!value) return 'Zaman bilgisi yok';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Zaman bilgisi yok' : date.toLocaleString('tr-TR', options);
}
