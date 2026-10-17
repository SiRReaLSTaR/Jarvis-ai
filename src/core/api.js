const memoryBridge = { ready: false, revision: 0, pending: Promise.resolve(), writes: 0 };
function authHeaders() {
  const token = sessionStorage.getItem('jarvis-access');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...authHeaders(), ...options.headers } });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Bağlantı hatası'); error.status = response.status; error.state = data.state; throw error; }
  return data;
}
export async function* readEvents(body) {
  const reader = body.getReader(), decoder = new TextDecoder(); let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 1_000_000) throw new Error('Olay akışı çok büyük.');
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
        if (line.startsWith('data:')) yield JSON.parse(line.slice(5).trim());
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export async function watchEvents(signal, onEvent, onConnected) {
  while (!signal.aborted) {
    try {
      const response = await fetch('/api/events', { headers: authHeaders(), signal });
      if (!response.ok || !response.body) throw new Error('Canlı bağlantı kurulamadı.');
      await onConnected();
      for await (const event of readEvents(response.body)) { if (!signal.aborted) onEvent(event); }
    } catch { if (signal.aborted) return; }
    await new Promise(resolve => { const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); }; const timer = setTimeout(finish, 2500); signal.addEventListener('abort', finish, { once: true }); });
  }
}
export { memoryBridge, api };
