const TIMEOUT = 10_000;
async function read(url, json = true) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { 'User-Agent': 'JarvisPersonalAssistant/1.0' } });
  if (!response.ok) throw new Error(`Kaynak HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 3_000_000) throw new Error('Kaynak yanıtı çok büyük.');
  return json ? JSON.parse(text) : text;
}
const decode = text => String(text || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1]);
export function parseRates(xml) {
  const date = xml.match(/<Tarih_Date\b[^>]*\bTarih="([^"]+)"/i)?.[1];
  if (!date) throw new Error('TCMB tarihi okunamadı.');
  const rates = [...xml.matchAll(/<Currency\b[^>]*\bCurrencyCode="(USD|EUR|GBP)"[^>]*>([\s\S]*?)<\/Currency>/g)].map(([, code, body]) => ({ code, value: Number(tag(body, 'ForexSelling')) }));
  if (rates.length !== 3 || rates.some(x => !Number.isFinite(x.value) || x.value <= 0)) throw new Error('TCMB verisi doğrulanamadı.');
  return { date, rates, source: { title: 'TCMB gösterge niteliğindeki döviz satış kurları', url: 'https://www.tcmb.gov.tr/kurlar/today.xml' } };
}
export function parseHeadlines(xml, source) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 8).flatMap(([, item]) => {
    const title = tag(item, 'title'), url = tag(item, 'link'), publishedAt = tag(item, 'pubDate');
    return title && /^https?:\/\//.test(url) ? [{ title, url, publishedAt, source }] : [];
  });
}
export function createDashboard({ readSource = read, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  return async function dashboard(city = 'İstanbul') {
    const key = String(city).trim().slice(0, 80);
    if (cache.has(key) && now() - cache.get(key).at < 10 * 60_000) return cache.get(key).data;
    if (pending.has(key)) return pending.get(key);
    const work = (async () => {
      const [weather, markets, news] = await Promise.allSettled([
        (async () => {
          const geo = await readSource(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(key)}&count=1&language=tr`);
          const place = geo.results?.[0];
          if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) throw new Error('Şehir bulunamadı.');
          const data = await readSource(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`);
          if (!Number.isFinite(data.current?.temperature_2m)) throw new Error('Hava verisi yok.');
          return { place: `${place.name}${place.country ? ', ' + place.country : ''}`, current: data.current, units: data.current_units, daily: data.daily, source: { title: 'Open-Meteo hava tahmini', url: 'https://open-meteo.com/' } };
        })(),
        readSource('https://www.tcmb.gov.tr/kurlar/today.xml', false).then(parseRates),
        readSource('https://www.trthaber.com/sondakika.rss', false).then(xml => parseHeadlines(xml, 'TRT Haber')),
      ]);
      const result = (value, label) => value.status === 'fulfilled' ? { data: value.value, error: null } : { data: null, error: `${label} şu an alınamıyor.` };
      const data = { updatedAt: new Date(now()).toISOString(), weather: result(weather, 'Hava durumu'), markets: result(markets, 'Döviz verisi'), news: result(news, 'Haberler') };
      if (cache.size >= 20) cache.delete(cache.keys().next().value);
      cache.set(key, { at: now(), data }); return data;
    })().finally(() => pending.delete(key));
    pending.set(key, work); return work;
  };
}
