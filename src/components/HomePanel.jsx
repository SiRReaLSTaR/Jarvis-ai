import { useEffect, useState } from 'react';
import { api } from '../core/api.js';
export default function HomePanel({ sharedState }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [pending, setPending] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { if (sharedState) setData(sharedState); }, [sharedState]);
  useEffect(() => { const c = new AbortController(); api('/api/home', { signal: c.signal }).then(setData).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, []);
  async function apply() {
    setBusy(true); setError('');
    try { setData(await api(`/api/home/${encodeURIComponent(pending.id)}`, { method: 'POST', body: JSON.stringify({ on: pending.state !== 'on', confirm: true }) })); setPending(null); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <details className="homePanel"><summary>Ev cihazları</summary>
    {!data?.enabled && <p>Home Assistant bağlı değil. Cihazlar simüle edilmez.</p>}
    {data?.devices.map(d => <p key={d.id}>{d.label}: {({ on: 'Açık', off: 'Kapalı', unavailable: 'Ulaşılamıyor' })[d.state] || d.state} <button type="button" disabled={!d.available || busy} onClick={() => setPending(d)}>{d.state === 'on' ? 'Kapat' : 'Aç'}</button></p>)}
    {pending && <div role="group" aria-label="Cihaz işlemini onayla"><p>{pending.label} fiziksel olarak {pending.state === 'on' ? 'kapatılacak' : 'açılacak'}.</p><button type="button" onClick={apply} disabled={busy}>Onayla</button><button type="button" onClick={() => setPending(null)} disabled={busy}>Vazgeç</button></div>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
