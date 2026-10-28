const PHASE = { idle: 'HAZIR', listening: 'DİNLİYOR', thinking: 'DÜŞÜNÜYOR', speaking: 'KONUŞUYOR', connecting: 'BAĞLANIYOR', error: 'HATA' };
const TASK = { running: 'çalışıyor', completed: 'yanıt hazır', partial: 'kısmi', failed: 'hata', interrupted: 'kesildi', cancelled: 'iptal' };

export default function TaskPulse({ tasks = [], phase, connected }) {
  const latest = tasks[0];
  return <div className="taskPulse" role="status" aria-live="polite">
    <span className={`pulseDot ${connected ? 'on' : ''}`} aria-hidden="true"/>
    <span>{connected ? 'BAĞLI' : 'BAĞLANIYOR'}</span>
    <span className="pulseSep" aria-hidden="true">//</span>
    <span>{PHASE[phase] || String(phase || 'HAZIR').toUpperCase()}</span>
    {latest && <>
      <span className="pulseSep" aria-hidden="true">//</span>
      <span className="pulseMsg" title={latest.message}>{latest.message}</span>
      <span className={`pulseStatus s-${latest.status}`}>{TASK[latest.status] || latest.status}</span>
    </>}
  </div>;
}
