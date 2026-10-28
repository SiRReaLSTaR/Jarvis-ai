import { useEffect, useState } from 'react';
import { AGENTS } from '../../lib/settings.js';
import Dashboard from './Dashboard';
import '../styles/command-center.css';

const TASK_STATUS = { running: 'ÇALIŞIYOR', completed: 'TAMAM', partial: 'KISMİ', failed: 'HATA', interrupted: 'KESİLDİ', cancelled: 'İPTAL' };
const BARS = [['running', 'Çalışan', '#ffc24d'], ['completed', 'Tamam', '#5cffb0'], ['partial', 'Kısmi', '#22e6ff'], ['failed', 'Hata', '#ff5c7a']];

function Gauge({ value }) {
  const radius = 78, length = 2 * Math.PI * radius, offset = length * (1 - value / 100);
  return <svg className="ccGauge" viewBox="0 0 200 200" role="img" aria-label={`Hazırlık yüzde ${value}`}>
    <circle cx="100" cy="100" r={radius} className="ccGaugeTrack"/>
    <circle cx="100" cy="100" r={radius} className="ccGaugeValue" strokeDasharray={length} strokeDashoffset={offset}/>
    <circle cx="100" cy="100" r="58" className="ccGaugeInner"/>
    <text x="100" y="104" textAnchor="middle" className="ccGaugeText">{value}%</text>
    <text x="100" y="126" textAnchor="middle" className="ccGaugeLabel">HAZIR</text>
  </svg>;
}

export default function CommandCenter({ state, system, connected, liveActive, loading, selected, profiles, city, ready, onOpenChat, onSelectAgent }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const tasks = state?.tasks || [];
  const counts = tasks.reduce((acc, task) => ({ ...acc, [task.status]: (acc[task.status] || 0) + 1 }), {});
  const memoryCount = Object.values(state?.memory || {}).reduce((n, items) => n + items.length, 0);
  const agentStatus = system?.agents || {};
  const agentIds = Object.keys(AGENTS);
  const agentsReady = agentIds.filter(id => agentStatus[id]?.configured).length;
  const readiness = Math.round(((connected ? 1 : 0) + agentsReady / agentIds.length) / 2 * 100);
  const maxBar = Math.max(1, ...BARS.map(([key]) => counts[key] || 0));
  const lastSuccess = system?.lastSuccess ? new Date(system.lastSuccess).toLocaleTimeString('tr-TR') : '—';

  return <div className="cc">
    <header className="ccHeader">
      <div className="ccTitle"><b>KOMUTA MERKEZİ</b><small>JARVIS · ÇEKİRDEK DURUM</small></div>
      <time className="ccClock" dateTime={now.toISOString()}>{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
      <button type="button" className="ccChatBtn" onClick={onOpenChat}>SOHBETE GEÇ →</button>
    </header>

    <div className="ccHero">
      <section className="ccPanel ccCore" aria-labelledby="cc-core">
        <h3 id="cc-core">SİSTEM HAZIRLIĞI</h3>
        <Gauge value={readiness}/>
        <p className="ccMuted">Bağlantı ve ajan anahtarlarının durumuna göre hesaplanır.</p>
      </section>

      <section className="ccTiles" aria-label="Anlık durum">
        <div className={`ccTile ${connected ? 'ok' : 'warn'}`}><small>BAĞLANTI</small><strong>{connected ? 'ÇEVRİMİÇİ' : 'BAĞLANIYOR'}</strong><i aria-hidden="true"/></div>
        <div className={`ccTile ${liveActive ? 'ok' : ''}`}><small>CANLI SES</small><strong>{liveActive ? 'AÇIK' : 'KAPALI'}</strong><i aria-hidden="true"/></div>
        <div className={`ccTile ${loading ? 'warn' : ''}`}><small>İŞLEM</small><strong>{loading ? 'MEŞGUL' : 'BOŞTA'}</strong><i aria-hidden="true"/></div>
        <div className="ccTile"><small>HAFIZA KAYDI</small><strong>{memoryCount}</strong><i aria-hidden="true"/></div>
      </section>

      <section className="ccPanel ccChart" aria-labelledby="cc-chart">
        <h3 id="cc-chart">GÖREV DAĞILIMI</h3>
        <ul className="ccBars">
          {BARS.map(([key, label, color]) => <li key={key}>
            <span>{label}</span>
            <span className="ccBarTrack"><span className="ccBarFill" style={{ '--bar': color, width: `${((counts[key] || 0) / maxBar) * 100}%` }}/></span>
            <b>{counts[key] || 0}</b>
          </li>)}
        </ul>
        <p className="ccMuted">Toplam {tasks.length} görev · Son yanıt {lastSuccess}</p>
      </section>
    </div>

    <div className="ccRow">
      <section className="ccPanel" aria-labelledby="cc-agents">
        <h3 id="cc-agents">AJAN AĞI</h3>
        {agentIds.map(id => <button type="button" key={id} className={`ccAgent ${id === selected ? 'selected' : ''}`} style={{ '--agent': AGENTS[id].color }} onClick={() => onSelectAgent(id)} aria-pressed={id === selected}>
          <span className="ccBadge" aria-hidden="true">{profiles[id]?.name?.slice(0, 1)}</span>
          <span className="ccAgentText"><b>{profiles[id]?.name}</b><small>{AGENTS[id].role}</small></span>
          <span className="ccState">{agentStatus[id]?.configured ? (id === selected ? 'SEÇİLİ' : 'HAZIR') : 'ANAHTAR YOK'}</span>
        </button>)}
      </section>

      <section className="ccPanel ccLog" aria-labelledby="cc-log">
        <h3 id="cc-log">OLAY AKIŞI<span className="ccCursor" aria-hidden="true">_</span></h3>
        {tasks.length === 0 && <p className="ccMuted">Henüz görev yok. Sohbete geçip bir şey sorun.</p>}
        <ol className="ccLines">
          {tasks.slice(0, 12).map(task => <li key={task.id}>
            <time>{new Date(task.createdAt).toLocaleTimeString('tr-TR')}</time>
            <span className={`ccStatus s-${task.status}`}>{TASK_STATUS[task.status] || task.status}</span>
            <span className="ccMsg">{task.message}</span>
            {task.error && <small className="ccErr">{task.error}</small>}
          </li>)}
        </ol>
      </section>
    </div>

    <section className="ccPanel ccWide" aria-labelledby="cc-info">
      <h3 id="cc-info">BİLGİ AKIŞI</h3>
      <Dashboard city={city} ready={ready}/>
    </section>
  </div>;
}
