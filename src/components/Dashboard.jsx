import { useEffect, useState } from 'react';
import { api } from '../core/api.js';
import { relativeTime, weatherInfo } from '../core/dashboardMetrics.js';

const GLYPHS = {
  sun: <><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></>,
  'cloud-sun': <><circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.5v1.6M2.5 8.5h1.6M4.3 4.3l1.1 1.1M12.7 4.3l-1.1 1.1"/><path d="M7 19h9.5a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 7.6 13 3 3 0 0 0 7 19Z"/></>,
  cloud: <path d="M5 18h12.5a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 11.6 3.5 3.5 0 0 0 5 18Z"/>,
  fog: <><path d="M5 14h12.5a3.4 3.4 0 0 0 .3-6.8A5 5 0 0 0 7 8.8 3.2 3.2 0 0 0 5 14Z"/><path d="M4 18h16M7 21h10"/></>,
  rain: <><path d="M5 15h12.5a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 8.6 3.5 3.5 0 0 0 5 15Z"/><path d="M8 18.5v1.6M12 18.5v2.6M16 18.5v1.6"/></>,
  snow: <><path d="M5 14h12.5a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 7.6 3.5 3.5 0 0 0 5 14Z"/><path d="M8 18v3M6.7 19.5h2.6M15.4 18.2v3M14.1 19.7h2.6"/></>,
  storm: <><path d="M5 15h12.5a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 8.6 3.5 3.5 0 0 0 5 15Z"/><path d="m12.5 16-2.5 4h3l-1.5 3"/></>,
};

function WeatherGlyph({ icon }) {
  return <svg className="ddGlyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{GLYPHS[icon] || GLYPHS.cloud}</svg>;
}

const num = (value, suffix = '') => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))}${suffix}` : '—');

export default function Dashboard({ city, ready }) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const load = () => api('/api/dashboard', { signal: controller.signal }).then(x => { setData(x); setError(''); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    setData(null); load(); const timer = setInterval(load, 10 * 60_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [city, ready]);

  const weather = data?.weather.data, markets = data?.markets.data, news = data?.news.data;
  const condition = weatherInfo(weather?.current?.weather_code);

  return <section className="dailyDashboard" aria-label="Güncel bilgi panosu">
    <header className="ddHead">
      <h2>Günlük pano</h2>
      <small>{data ? `Son kontrol ${new Date(data.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : 'Kaynaklar yükleniyor…'}</small>
    </header>
    {error && <p role="alert">{error}</p>}

    <div className="ddGrid">
      <article className="ddCard ddWeather">
        <header><span className="ddLabel">HAVA</span><small>{weather?.place || city}</small></header>
        {weather
          ? <>
            <div className="ddWeatherMain">
              <WeatherGlyph icon={condition.icon}/>
              <strong>{num(weather.current.temperature_2m)}<em>°C</em></strong>
            </div>
            <p className="ddCondition">{condition.label} · Hissedilen {num(weather.current.apparent_temperature, '°C')}</p>
            <dl className="ddFacts">
              <div><dt>En yüksek</dt><dd>{num(weather.daily?.temperature_2m_max?.[0], '°')}</dd></div>
              <div><dt>En düşük</dt><dd>{num(weather.daily?.temperature_2m_min?.[0], '°')}</dd></div>
              <div><dt>Yağış</dt><dd>{num(weather.daily?.precipitation_probability_max?.[0], '%')}</dd></div>
              <div><dt>Rüzgâr</dt><dd>{num(weather.current.wind_speed_10m, ' km/sa')}</dd></div>
            </dl>
            <a href={weather.source.url} target="_blank" rel="noreferrer">{weather.source.title}</a>
          </>
          : <p className="ddPending">{data?.weather.error || 'Bekleniyor…'}</p>}
      </article>

      <article className="ddCard ddMarkets">
        <header><span className="ddLabel">DÖVİZ</span><small>{markets?.date || 'TCMB'}</small></header>
        {markets
          ? <>
            <ul className="ddRates">
              {markets.rates.map(rate => <li key={rate.code}>
                <small>{rate.code}</small>
                <strong>{rate.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</strong>
                <em>TL</em>
              </li>)}
            </ul>
            <p className="ddNote">Gösterge satış kuru; canlı piyasa fiyatı değildir.</p>
            <a href={markets.source.url} target="_blank" rel="noreferrer">TCMB · {markets.source.title.replace('TCMB ', '')}</a>
          </>
          : <p className="ddPending">{data?.markets.error || 'Bekleniyor…'}</p>}
      </article>

      <article className="ddCard ddNews">
        <header><span className="ddLabel">HABERLER</span><small>TRT Haber</small></header>
        {news?.length
          ? <ol className="ddNewsList">
            {news.slice(0, 6).map((item, index) => <li key={item.url}>
              <span className="ddNewsIndex" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span>
                <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                <small>{item.publishedAt ? relativeTime(item.publishedAt) : ''}</small>
              </span>
            </li>)}
          </ol>
          : <p className="ddPending">{data?.news.error || (data ? 'Başlık bulunamadı.' : 'Bekleniyor…')}</p>}
      </article>
    </div>
  </section>;
}
