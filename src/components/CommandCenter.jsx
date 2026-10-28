import { useEffect, useMemo, useState } from 'react';
import { AGENTS } from '../../lib/settings.js';
import Dashboard from './Dashboard';
import { TASK_STATUS_LABELS, dailyActivity, memoryTotals, relativeTime, systemHealth, taskSummary } from '../core/dashboardMetrics.js';
import '../styles/command-center.css';

const STATUS_COLORS = { running: '#ffc24d', completed: '#5cffb0', partial: '#22e6ff', failed: '#ff5c7a', interrupted: '#ff8a5c', cancelled: '#7fa6c4' };
const LEGEND = [['running', 'Çalışıyor'], ['completed', 'Tamamlandı'], ['partial', 'Kısmi'], ['failed', 'Hata'], ['interrupted', 'Kesildi'], ['cancelled', 'İptal']];
const ISSUE_STATUSES = ['failed', 'interrupted', 'cancelled'];
const FILTERS = [['all', 'TÜMÜ'], ['active', 'AKTİF'], ['issues', 'SORUNLU']];

function HealthRing({ value, ready, total }) {
  const radius = 62, length = 2 * Math.PI * radius;
  return <div className="ccRing">
    <svg viewBox="0 0 160 160" role="img" aria-label={`Sistem hazırlığı yüzde ${value}, ${ready}/${total} kontrol hazır`}>
      <circle cx="80" cy="80" r={radius} className="ccRingTrack"/>
      <circle cx="80" cy="80" r={radius} className="ccRingValue" strokeDasharray={length} strokeDashoffset={length * (1 - value / 100)}/>
    </svg>
    <span className="ccRingText"><b>{value}%</b><small>{ready}/{total} HAZIR</small></span>
  </div>;
}

function ActivityBars({ data }) {
  const max = Math.max(1, ...data.map(day => day.count));
  const total = data.reduce((sum, day) => sum + day.count, 0);
  return <div className="ccBarsWrap">
    <ul className="ccWeek" role="img" aria-label={`Son ${data.length} günde toplam ${total} görev`}>
      {data.map(day => <li key={day.timestamp}>
        <span className="ccWeekBar" style={{ height: `${day.count ? Math.max(8, (day.count / max) * 100) : 2}%`, '--fill': day.count ? undefined : 'rgba(127,166,196,.28)' }}/>
        <b>{day.count}</b>
        <small>{day.label}</small>
      </li>)}
    </ul>
    <p className="ccMuted">Son {data.length} gün · {total} görev</p>
  </div>;
}

function StatusDonut({ summary }) {
  const radius = 52, length = 2 * Math.PI * radius;
  const visible = LEGEND.filter(([key]) => summary.counts[key] > 0);
  let offset = 0;
  return <div className="ccDonut">
    <svg viewBox="0 0 140 140" role="img" aria-label={`Toplam ${summary.total} görevin durum dağılımı`}>
      <circle cx="70" cy="70" r={radius} className="ccDonutTrack"/>
      {summary.total > 0 && visible.map(([key]) => {
        const portion = summary.counts[key] / summary.total;
        const segment = <circle key={key} cx="70" cy="70" r={radius} className="ccDonutValue" stroke={STATUS_COLORS[key]}
          strokeDasharray={`${length * portion} ${length - length * portion}`} strokeDashoffset={-offset}/>;
        offset += length * portion;
        return segment;
      })}
      <text x="70" y="68" textAnchor="middle" className="ccDonutTotal">{summary.total}</text>
      <text x="70" y="84" textAnchor="middle" className="ccDonutCaption">GÖREV</text>
    </svg>
    <ul className="ccLegend">
      {LEGEND.filter(([key]) => summary.counts[key] > 0).map(([key, label]) => <li key={key}>
        <i style={{ '--dot': STATUS_COLORS[key] }} aria-hidden="true"/>
        <span>{label}</span><b>{summary.counts[key]}</b>
      </li>)}
      {summary.total === 0 && <li><span>Henüz görev kaydı yok.</span></li>}
    </ul>
  </div>;
}

export default function CommandCenter({ state, system, connected, liveActive, liveEnabled, screens, loading, selected, profiles, city, ready, onOpenChat, onSelectAgent, onToggleLive }) {
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tasks = useMemo(() => state?.tasks || [], [state?.tasks]);
  const summary = useMemo(() => taskSummary(tasks), [tasks]);
  const dayKey = now.toDateString();
  const activity = useMemo(() => dailyActivity(tasks, { now }), [tasks, dayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const memory = useMemo(() => memoryTotals(state?.memory), [state?.memory]);
  const health = useMemo(() => systemHealth({ connected, agents: system?.agents, liveEnabled, screens }), [connected, system?.agents, liveEnabled, screens]);
  const agentStates = system?.agentStates || {};
  const visibleTasks = useMemo(() => {
    if (filter === 'active') return tasks.filter(task => task.status === 'running');
    if (filter === 'issues') return tasks.filter(task => ISSUE_STATUSES.includes(task.status));
    return tasks;
  }, [tasks, filter]);
  const online = Boolean(connected);

  return <div className="cc">
    <header className="ccHeader">
      <div className="ccTitle"><b>KOMUTA MERKEZİ</b><small>JARVIS · ÇEKİRDEK DURUM</small></div>
      <div className="ccMeta">
        <span className={`ccChip ${online ? 'ok' : 'warn'}`}><i aria-hidden="true"/>{online ? 'ÇEVRİMİÇİ' : 'BAĞLANIYOR'}</span>
        <span className="ccChip">{health.screens} EKRAN</span>
        <span className={`ccChip ${loading ? 'warn' : ''}`}>{loading ? 'MEŞGUL' : 'BOŞTA'}</span>
        <time className="ccClock" dateTime={now.toISOString()}>{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
      </div>
      <div className="ccActions">
        {onToggleLive && <button type="button" className={`ccGhost ${liveActive ? 'on' : ''}`} onClick={onToggleLive} aria-pressed={liveActive}>{liveActive ? 'MİKROFONU KAPAT' : 'MİKROFONU AÇ'}</button>}
        <button type="button" className="ccChatBtn" onClick={onOpenChat}>SOHBETE GEÇ →</button>
      </div>
    </header>

    <div className="ccGrid">
      <section className="ccPanel ccHealth" aria-labelledby="cc-health">
        <div className="ccPanelHead"><h3 id="cc-health">SİSTEM HAZIRLIĞI</h3><span className={`ccTag ${health.score === 100 ? 'ok' : 'warn'}`}>{health.ready}/{health.total}</span></div>
        <div className="ccHealthBody">
          <HealthRing value={health.score} ready={health.ready} total={health.total}/>
          <ul className="ccCheck">
            {health.items.map(item => <li key={item.id} className={item.ok ? 'ok' : 'warn'}>
              <i aria-hidden="true"/>
              <span><b>{item.label}</b><small>{item.detail}</small></span>
              <em>{item.ok ? 'HAZIR' : 'EKSİK'}</em>
            </li>)}
          </ul>
        </div>
        <p className="ccMuted">Son başarılı yanıt: {system?.lastSuccess ? relativeTime(system.lastSuccess, now.getTime()) : 'henüz yok'}</p>
      </section>

      <section className="ccPanel ccStats" aria-labelledby="cc-stats">
        <div className="ccPanelHead"><h3 id="cc-stats">GÖREV VE HAFIZA</h3><span className="ccTag">SON 7 GÜN</span></div>
        <div className="ccKpis">
          <div className="ccKpi"><small>TOPLAM GÖREV</small><strong>{summary.total}</strong><span>{summary.active} çalışıyor</span></div>
          <div className="ccKpi ok"><small>TAMAMLANAN</small><strong>{summary.counts.completed}</strong><span>{summary.finished} bitmiş görev</span></div>
          <div className={`ccKpi ${summary.successRate === null ? '' : summary.successRate >= 70 ? 'ok' : 'warn'}`}><small>BAŞARI ORANI</small><strong>{summary.successRate === null ? '—' : `${summary.successRate}%`}</strong><span>tamamlanan / biten</span></div>
          <div className="ccKpi"><small>HAFIZA KAYDI</small><strong>{memory.total}</strong><span>proje: {memory.entries.find(entry => entry.key === 'projects')?.count ?? 0}</span></div>
        </div>
        <div className="ccCharts">
          <div className="ccChartBlock">
            <h4>GÜNLÜK GÖREV</h4>
            <ActivityBars data={activity}/>
          </div>
          <div className="ccChartBlock">
            <h4>DURUM DAĞILIMI</h4>
            <StatusDonut summary={summary}/>
          </div>
        </div>
      </section>

      <section className="ccPanel ccAgents" aria-labelledby="cc-agents">
        <div className="ccPanelHead"><h3 id="cc-agents">AJAN AĞI</h3><span className="ccTag">{health.screens > 1 ? `${health.screens} EKRAN` : 'TEK EKRAN'}</span></div>
        <div className="ccAgentList">
          {Object.keys(AGENTS).map(id => {
            const agentState = agentStates[id] || { state: 'idle' };
            const configured = Boolean(system?.agents?.[id]?.configured);
            const stateLabel = !configured ? 'ANAHTAR YOK' : agentState.state === 'working' ? 'ÇALIŞIYOR' : agentState.state === 'error' ? 'HATA' : 'HAZIR';
            return <button type="button" key={id} className={`ccAgent ${id === selected ? 'selected' : ''}`} style={{ '--agent': AGENTS[id].color }} onClick={() => onSelectAgent(id)} aria-pressed={id === selected}>
              <span className="ccAgentTop">
                <span className="ccBadge" aria-hidden="true">{profiles[id]?.name?.slice(0, 1)}</span>
                <span className="ccAgentText"><b>{profiles[id]?.name}</b><small>{AGENTS[id].role}</small></span>
                <span className={`ccState st-${configured ? agentState.state || 'idle' : 'missing'}`}><i aria-hidden="true"/>{stateLabel}</span>
              </span>
              <span className="ccAgentFoot">{agentState.state === 'working' && agentState.activity ? agentState.activity : agentState.updatedAt ? `Son işlem ${relativeTime(agentState.updatedAt, now.getTime())}` : 'Bu oturumda henüz çalışmadı'}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="ccPanel ccLog" aria-labelledby="cc-log">
        <div className="ccPanelHead">
          <h3 id="cc-log">OLAY AKIŞI<span className="ccCursor" aria-hidden="true">_</span></h3>
          <div className="ccFilters" role="group" aria-label="Olay akışı filtresi">
            {FILTERS.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}</button>)}
          </div>
        </div>
        {visibleTasks.length === 0
          ? <p className="ccMuted">{tasks.length === 0 ? 'Henüz görev yok. Sohbete geçip bir şey sorun.' : 'Bu filtreye uyan görev yok.'}</p>
          : <ol className="ccLines">
            {visibleTasks.slice(0, 14).map(task => <li key={task.id}>
              <time dateTime={task.createdAt}>{new Date(task.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time>
              <span className={`ccStatus s-${task.status}`}>{TASK_STATUS_LABELS[task.status] || task.status}</span>
              <span className="ccMsg">{task.message}</span>
              {task.error && <small className="ccErr">{task.error}</small>}
            </li>)}
          </ol>}
        <p className="ccMuted">Toplam {tasks.length} görev · en yeni üstte</p>
      </section>

      <section className="ccPanel ccMemory" aria-labelledby="cc-memory">
        <div className="ccPanelHead"><h3 id="cc-memory">HAFIZA</h3><span className="ccTag">{memory.total}</span></div>
        <ul className="ccMemoryList">
          {memory.entries.map(entry => <li key={entry.key}>
            <span>{entry.label}</span>
            <span className="ccMemTrack"><span className="ccMemFill" style={{ width: `${(entry.count / memory.max) * 100}%` }}/></span>
            <b>{entry.count}</b>
          </li>)}
        </ul>
        <p className="ccMuted">Yalnızca sunucuda saklanan kayıtlar sayılır; sohbet geçmişi bu sayıya dahil değildir.</p>
      </section>

      <section className="ccPanel ccWide ccBriefing" aria-labelledby="cc-info">
        <div className="ccPanelHead"><h3 id="cc-info">BİLGİ AKIŞI</h3><span className="ccTag">{city}</span></div>
        <Dashboard city={city} ready={ready}/>
      </section>
    </div>
  </div>;
}

