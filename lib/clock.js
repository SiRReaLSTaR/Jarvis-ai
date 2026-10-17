// All clock facts come from the server clock plus a validated IANA zone.
export function clockSnapshot(timeZone = 'Europe/Istanbul', now = Date.now()) {
  if (typeof timeZone !== 'string' || timeZone.length > 80) throw new Error('Geçersiz saat dilimi.');
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(now)).map(p => [p.type, p.value]));
  return { utc: new Date(now).toISOString(), timeZone, localDate: `${parts.year}-${parts.month}-${parts.day}`, localTime: `${parts.hour}:${parts.minute}:${parts.second}` };
}
