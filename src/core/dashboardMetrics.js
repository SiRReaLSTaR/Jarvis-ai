// Komuta merkezi için saf hesaplayıcılar. Yalnızca uygulamanın bildiği veriyi kullanır;
// hiçbir metrik uydurulmaz, sensör veya dış servis okunmaz.
const DAY = 86_400_000;
const WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export const TASK_STATUS_LABELS = {
  running: 'Çalışıyor',
  completed: 'Tamamlandı',
  partial: 'Kısmi',
  failed: 'Hata',
  interrupted: 'Kesildi',
  cancelled: 'İptal',
};

export const MEMORY_LABELS = {
  memories: 'Anılar',
  projects: 'Projeler',
  ideas: 'Fikirler',
  tasks: 'Görev notları',
  preferences: 'Tercihler',
};

const emptyCounts = () => ({ running: 0, completed: 0, partial: 0, failed: 0, interrupted: 0, cancelled: 0 });

export function taskSummary(tasks = []) {
  const counts = emptyCounts();
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (Object.hasOwn(counts, task?.status)) counts[task.status] += 1;
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const finished = counts.completed + counts.partial + counts.failed + counts.interrupted;
  return {
    counts,
    total,
    active: counts.running,
    finished,
    // Hiç bitmiş görev yoksa oran hesaplanmaz; sıfır göstermek yanıltıcı olur.
    successRate: finished ? Math.round((counts.completed / finished) * 100) : null,
  };
}

export function dailyActivity(tasks = [], { days = 7, now = Date.now() } = {}) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(start.getTime() - index * DAY);
    buckets.push({ timestamp: day.getTime(), label: WEEKDAYS[day.getDay()], count: 0 });
  }
  if (!buckets.length) return buckets;
  const first = buckets[0].timestamp;
  for (const task of Array.isArray(tasks) ? tasks : []) {
    const time = Date.parse(task?.createdAt);
    if (!Number.isFinite(time)) continue;
    const day = new Date(time);
    day.setHours(0, 0, 0, 0);
    const index = Math.round((day.getTime() - first) / DAY);
    if (index >= 0 && index < buckets.length) buckets[index].count += 1;
  }
  return buckets;
}

export function memoryTotals(memory = {}) {
  const entries = Object.entries(MEMORY_LABELS).map(([key, label]) => ({
    key,
    label,
    count: Array.isArray(memory?.[key]) ? memory[key].length : 0,
  }));
  return {
    entries,
    total: entries.reduce((sum, entry) => sum + entry.count, 0),
    max: Math.max(1, ...entries.map(entry => entry.count)),
  };
}

export function systemHealth({ connected = false, agents = {}, liveEnabled = false, screens = 0 } = {}) {
  const items = [
    { id: 'server', label: 'Sunucu bağlantısı', detail: connected ? 'Canlı akış açık' : 'Bağlantı bekleniyor', ok: Boolean(connected) },
    { id: 'dilan', label: 'DİLAN · Gemini', detail: agents?.jarvis?.configured ? 'Anahtar hazır' : 'GEMINI_API_KEY yok', ok: Boolean(agents?.jarvis?.configured) },
    { id: 'lara', label: 'LARA · web araması', detail: agents?.atlas?.configured ? 'Anahtar hazır' : 'GEMINI_API_KEY yok', ok: Boolean(agents?.atlas?.configured) },
    { id: 'vera', label: 'VERA · OpenRouter', detail: agents?.nexus?.configured ? 'Anahtar hazır' : 'OPENROUTER_API_KEY yok', ok: Boolean(agents?.nexus?.configured) },
    { id: 'live', label: 'Canlı ses', detail: liveEnabled ? 'Gemini Live açık' : 'Canlı ses kapalı', ok: Boolean(liveEnabled) },
  ];
  const ready = items.filter(item => item.ok).length;
  return {
    items,
    ready,
    total: items.length,
    score: Math.round((ready / items.length) * 100),
    screens: Number.isFinite(screens) ? screens : 0,
  };
}

export function relativeTime(iso, now = Date.now()) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '—';
  const diff = Math.max(0, now - time);
  if (diff < 45_000) return 'az önce';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} dk önce`;
  if (diff < DAY) return `${Math.round(diff / 3_600_000)} sa önce`;
  return new Date(time).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

const WEATHER_GROUPS = [
  { test: code => code === 0, label: 'Açık', icon: 'sun' },
  { test: code => code <= 2, label: 'Az bulutlu', icon: 'cloud-sun' },
  { test: code => code === 3, label: 'Bulutlu', icon: 'cloud' },
  { test: code => code === 45 || code === 48, label: 'Sisli', icon: 'fog' },
  { test: code => code >= 51 && code <= 57, label: 'Çisenti', icon: 'rain' },
  { test: code => (code >= 61 && code <= 67) || (code >= 80 && code <= 82), label: 'Yağmurlu', icon: 'rain' },
  { test: code => (code >= 71 && code <= 77) || code === 85 || code === 86, label: 'Karlı', icon: 'snow' },
  { test: code => code >= 95, label: 'Fırtına', icon: 'storm' },
];

export function weatherInfo(code) {
  const value = Number(code);
  if (!Number.isFinite(value)) return { label: 'Bilinmiyor', icon: 'cloud' };
  return WEATHER_GROUPS.find(group => group.test(value)) || { label: 'Bulutlu', icon: 'cloud' };
}

// Grafik koordinatları: SVG çizimi için saf hesaplama, DOM gerektirmez.
export function sparklineGeometry(values = [], { width = 100, height = 32, padding = 3 } = {}) {
  const list = (Array.isArray(values) ? values : []).map(value => (Number.isFinite(value) ? value : 0));
  if (!list.length) return { line: '', area: '', points: [] };
  const max = Math.max(...list);
  const min = Math.min(...list);
  const span = max - min || 1;
  const step = list.length > 1 ? (width - padding * 2) / (list.length - 1) : 0;
  const points = list.map((value, index) => {
    const x = padding + step * index;
    const y = max === min
      ? height / 2
      : height - padding - ((value - min) / span) * (height - padding * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  const area = `${line} L${points.at(-1)[0]} ${height} L${points[0][0]} ${height} Z`;
  return { line, area, points };
}
