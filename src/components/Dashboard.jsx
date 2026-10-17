import { useEffect, useState } from 'react';
import { api } from '../core/api.js';
export default function Dashboard({ city, ready }) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const load = () => api('/api/dashboard', { signal: controller.signal }).then(x => { setData(x); setError(''); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    setData(null); load(); const timer = setInterval(load, 10 * 60_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [city, ready]);
  const weather = data?.weather.data, markets = data?.markets.data;
  return <section className="dailyDashboard" aria-label="Güncel bilgi panosu">
    <header><h2>Günlük pano</h2><small>{data ? `Son kontrol: ${new Date(data.updatedAt).toLocaleTimeString('tr-TR')}` : 'Kaynaklar yükleniyor…'}</small></header>
    {error && <p role="alert">{error}</p>}
    <div className="factGrid">
      <article><h3>{weather?.place || city} · Hava</h3>{weather ? <><strong>{weather.current.temperature_2m} °C</strong><p>Hissedilen {weather.current.apparent_temperature} °C · Rüzgâr {weather.current.wind_speed_10m} km/sa</p><small>{weather.current.time?.replace('T', ' ')}</small><a href={weather.source.url} target="_blank" rel="noreferrer">{weather.source.title}</a></> : <p>{data?.weather.error || 'Bekleniyor…'}</p>}</article>
      <article><h3>Döviz · TL</h3>{markets ? <><div className="rateRow">{markets.rates.map(x => <div key={x.code}><small>{x.code}</small><strong>{x.value.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}</strong></div>)}</div><p>{markets.date} · Gösterge satış kuru; canlı piyasa fiyatı değildir.</p><a href={markets.source.url} target="_blank" rel="noreferrer">TCMB</a></> : <p>{data?.markets.error || 'Bekleniyor…'}</p>}</article>
    </div>
    <details><summary>Son haberler · TRT Haber</summary>{data?.news.error && <p>{data.news.error}</p>}{data?.news.data?.map(x => <p key={x.url}><a href={x.url} target="_blank" rel="noreferrer">{x.title}</a><small className="newsDate">{x.publishedAt && !Number.isNaN(Date.parse(x.publishedAt)) ? new Date(x.publishedAt).toLocaleString('tr-TR') : ''}</small></p>)}</details>
  </section>;
}
