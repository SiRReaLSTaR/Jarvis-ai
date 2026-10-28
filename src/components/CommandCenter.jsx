import { useEffect, useState } from 'react';
import { AGENTS } from '../../lib/settings.js';
import Dashboard from './Dashboard';
import '../styles/command-center.css';

const TASK_STATUS = { running: 'ÇALIŞIYOR', completed: 'TAMAM', partial: 'KISMİ', failed: 'HATA', interrupted: 'KESİLDİ', cancelled: 'İPTAL' };

export default function CommandCenter({ state, system, connected, liveActive, loading, selected, profiles, city, ready, onClose }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const tasks = state?.tasks || [];
  const counts = tasks.reduce((acc, task) => ({ ...acc, [task.status]: (acc[task.status] || 0) + 1 }), {});
  const memoryCount = Object.values(state?.memory || {}).reduce((n, items) => n + items.length, 0);
  const agentStatus = system?.agents || {};
  const agentsReady = Object.values(agentStatus).filter(agent => agent.configured).length;
  const agentTotal = Object.keys(AGENTS).length;
  const lastSuccess = system?.lastSuccess ? new Date(system.lastSuccess).toLocaleTimeString('tr-TR') : '—';

  return <div className="cc">
    <header className="ccHeader">
      <div className="ccTitle"><b>KOMUTA MERKEZİ</b><small>JARVIS · SİSTEM ÖZETİ</small></div>
      <time className="ccClock" dateTime={now.toISOString()}>{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
      <button type="button" className="ccClose" onClick={onClose} aria-label="Komuta merkezini kapat">KAPAT</button>
    </header>

    <div className="ccTiles">
      <div className={`ccTile ${connected ? 'ok' : 'warn'}`}><small>BAĞLANTI</small><strong>{connected ? 'ÇEVRİMİÇİ' : 'BAĞLANIYOR'}</strong></div>
      <div className={`ccTile ${liveActive ? 'ok' : ''}`}><small>CANLI SES</small><strong>{liveActive ? 'AÇIK' : 'KAPALI'}</strong></div>
      <div className={`ccTile ${loading ? 'warn' : ''}`}><small>İŞLEM</small><strong>{loading ? 'MEŞGUL' : 'BOŞTA'}</strong></div>
      <div className="ccTile"><small>AJAN HAZIRLIĞI</small><strong>{agentsReady}/{agentTotal}</strong></div>
    </div>

    <div className="ccGrid">
      <section className="ccPanel" aria-labelledby="cc-agents">
        <h3 id="cc-agents">AJANLAR</h3>
        {Object.entries(AGENTS).map(([id, agent]) => <div key={id} className={`ccAgent ${id === selected ? 'selected' : ''}`} style={{ '--agent': agent.color }}>
          <span className="ccBadge" aria-hidden="true">{profiles[id]?.name?.slice(0, 1)}</span>
          <div><b>{profiles[id]?.name}</b><small>{agent.role}</small></div>
          <span className="ccState">{agentStatus[id]?.configured ? (id === selected ? 'SEÇİLİ' : 'HAZIR') : 'ANAHTAR YOK'}</span>
        </div>)}
      </section>

      <section className="ccPanel" aria-labelledby="cc-tasks">
        <h3 id="cc-tasks">GÖREVLER</h3>
        <dl className="ccStats">
          <div><dt>Çalışan</dt><dd>{counts.running || 0}</dd></div>
          <div><dt>Tamam</dt><dd>{counts.completed || 0}</dd></div>
          <div><dt>Hata</dt><dd>{counts.failed || 0}</dd></div>
          <div><dt>Toplam</dt><dd>{tasks.length}</dd></div>
        </dl>
        <p className="ccMuted">Son başarılı yanıt: {lastSuccess}</p>
      </section>

      <section className="ccPanel" aria-labelledby="cc-memory">
        <h3 id="cc-memory">HAFIZA</h3>
        <dl className="ccStats">
          <div><dt>Kayıt</dt><dd>{memoryCount}</dd></div>
          <div><dt>Kategori</dt><dd>{Object.keys(state?.memory || {}).length}</dd></div>
        </dl>
        <p className="ccMuted">Konuyla ilgili kayıtlar her istekte seçilerek kullanılır.</p>
      </section>

      <section className="ccPanel ccLog" aria-labelledby="cc-log">
        <h3 id="cc-log">OLAY AKIŞI<span className="ccCursor" aria-hidden="true">_</span></h3>
        {tasks.length === 0 && <p className="ccMuted">Henüz görev yok.</p>}
        <ol className="ccLines">
          {tasks.slice(0, 12).map(task => <li key={task.id}>
            <time>{new Date(task.createdAt).toLocaleTimeString('tr-TR')}</time>
            <span className={`ccStatus s-${task.status}`}>[{TASK_STATUS[task.status] || task.status}]</span>
            <span className="ccMsg">{task.message}</span>
            {task.error && <small className="ccErr">{task.error}</small>}
          </li>)}
        </ol>
      </section>

      <section className="ccPanel ccWide" aria-labelledby="cc-dashboard">
        <h3 id="cc-dashboard">BİLGİ AKIŞI</h3>
        <Dashboard city={city} ready={ready}/>
      </section>
    </div>
  </div>;
}
