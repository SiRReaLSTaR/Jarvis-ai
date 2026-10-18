import { useId, useState } from 'react';
import { AGENTS } from '../../lib/settings.js';
import { missionSummary, TASK_LABELS, MEMORY_LABELS, displayTime } from '../core/mission.js';
import '../styles/mission.css';
import missionSpace from '../assets/mission-space.png';

function Icon({ type, ...props }) {
  const paths = {
    home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3Z', chat: 'M3 4h18v13H8l-5 4Z', agents: 'M16 21v-3a4 4 0 0 0-8 0v3M8 5a4 4 0 1 0 8 0 4 4 0 0 0-8 0M3 21v-3a4 4 0 0 1 3-4m15 7v-3a4 4 0 0 0-3-4',
    tasks: 'M8 4H4v18h16V4h-4M8 2h8v5H8Zm0 12 3 3 5-6', memory: 'M4 5c0-4 16-4 16 0s-16 4-16 0m0 0v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0', research: 'M15 15 22 22M3 9a6 6 0 1 0 12 0 6 6 0 0 0-12 0',
    settings: 'M9 3h6l1 3 3 1 2 5-3 3-1 4-5 2-4-3-4-1-2-5 3-3 1-4ZM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0', arrow: 'M4 12h16m-6-6 6 6-6 6', mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Zm-4 6v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8', export: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', close: 'm6 6 12 12M18 6 6 18', check: 'm5 12 4 4L19 6', clock: 'M12 8v5l3 2M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0',
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[type] || paths.home}/></svg>;
}
function AgentCore({ agent }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const paths = { jarvis: 'M50 24 72 66 50 58 28 66ZM50 37v21', atlas: 'M50 26 71 38v24L50 74 29 62V38Zm0 11 12 7v12L50 63l-12-7V44Z', nexus: 'm50 27 25 43H25Zm0 13 14 24H36Z' };
  const nodes = Array.from({length:18},(_,i) => ({x:50 + Math.cos(i*2.399)* (22+i%4*5), y:50 + Math.sin(i*2.399)*(22+i%4*5)}));
  return <svg className="mcAvatar" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}sphere`} cx="28%" cy="20%" r="80%"><stop offset="0" stopColor="currentColor" stopOpacity=".37"/><stop offset=".4" stopColor="currentColor" stopOpacity=".06"/><stop offset=".78" stopColor="#020a10"/><stop offset="1" stopColor="currentColor" stopOpacity=".46"/></radialGradient>
      <radialGradient id={`${id}halo`}><stop offset=".35" stopColor="currentColor" stopOpacity=".1"/><stop offset=".72" stopColor="currentColor" stopOpacity=".13"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient>
      <filter id={`${id}shine`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
      <clipPath id={`${id}clip`}><circle cx="60" cy="60" r="44"/></clipPath>
    </defs>
    <circle cx="60" cy="60" r="59" fill={`url(#${id}halo)`}/>
    <circle className="mcCoreOrbit" cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth=".5" strokeOpacity=".4" strokeDasharray="85 10 3 9"/>
    <circle cx="60" cy="60" r="49" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth=".4"/>
    <circle cx="60" cy="60" r="44" fill={`url(#${id}sphere)`} stroke="currentColor" strokeOpacity=".75" strokeWidth=".6"/>
    <g clipPath={`url(#${id}clip)`} transform="translate(10 10)" stroke="currentColor" fill="none" strokeWidth=".25" opacity=".3">
      <ellipse cx="50" cy="50" rx="42" ry="17" transform="rotate(-25 50 50)"/><ellipse cx="50" cy="50" rx="22" ry="43" transform="rotate(-25 50 50)"/>
      {nodes.map((n,i) => <g key={i}><path d={`M${n.x} ${n.y} ${nodes[(i+1)%nodes.length].x} ${nodes[(i+1)%nodes.length].y}`}/><circle cx={n.x} cy={n.y} r=".7" fill="currentColor"/></g>)}
    </g>
    <path d="M22 49a40 40 0 0 1 49-28M89 82a40 40 0 0 1-40 18" stroke="currentColor" strokeWidth="1.5" fill="none" filter={`url(#${id}shine)`}/>
    <path d={paths[agent]} transform="translate(10 10)" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.1"/>
    <circle cx="60" cy="5" r="1.1" fill="currentColor"/><circle cx="115" cy="60" r=".9" fill="currentColor"/>
  </svg>;
}
const DESCRIPTIONS = { jarvis: ['COMMAND CORE', 'Planlama, strateji ve günlük yaşam koordinasyonu.'], atlas: ['RESEARCH CORE', 'Araştırma, kaynak değerlendirme ve bilgi doğrulama.'], nexus: ['ENGINEERING CORE', 'Kodlama, teknik analiz ve çözüm geliştirme.'] };
const NAV = [['overview','Genel bakış','home'],['chat','Sohbet / HUD','chat'],['agents','Ajanlar','agents'],['tasks','Görevler','tasks'],['memory','Hafıza','memory'],['research','Araştırma','research'],['settings','Ayarlar','settings']];
export default function MissionControl({ state, system, connected, selected, phase, time, busy, liveActive, error, onSelect, onHud, onSettings, onSend, onVoice, onCancel, onExport }) {
  const [page, setPage] = useState('overview'), [text, setText] = useState(''), [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const summary = missionSummary(state, system, connected);
  const profiles = state?.settings?.profiles || {};
  const name = id => profiles[id]?.name || AGENTS[id]?.name || 'Asistan';
  const filteredTasks = summary.tasks.filter(t => (filter === 'all' || t.status === filter) && String(t.message).toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
  const filteredMemory = summary.memory.filter(m => `${m.text} ${MEMORY_LABELS[m.category]}`.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
  function navigate(id) {
    if (id === 'chat') { onHud(); return; }
    if (id === 'settings') { onSettings(); return; }
    if (id === 'research') { onSelect('atlas').then(() => onHud()); return; }
    setPage(id); setSearch(''); setFilter('all');
  }
  function agentStatus(id) {
    if (!connected || !system) return 'Bağlantı bekleniyor';
    if (system.agentStates?.[id]?.state === 'working') return 'Çalışıyor';
    return system.agents?.[id]?.configured ? 'Metin anahtarı tanımlı' : 'Metin anahtarı eksik';
  }
  function TaskList({ tasks }) {
    return tasks.length ? <div className="mcTaskList">{tasks.map(t => <article key={t.id}>
      <span className={`mcTaskIcon status-${t.status}`}><Icon type={t.status === 'completed' ? 'check' : 'clock'}/></span><div><strong>{t.message}</strong><small>{TASK_LABELS[t.status] || t.status}{t.agents?.length ? ` · ${t.agents.map(name).join(', ')}` : ''}</small>{t.error && <p className="mcError">{t.error}</p>}</div><time dateTime={t.createdAt}>{displayTime(t.createdAt, { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</time>
    </article>)}</div> : <p className="mcEmpty">{state ? 'Bu görünümde görev yok. Sohbette gönderdiğin yazılı istekler burada listelenir.' : 'Kayıtlar sunucudan yükleniyor…'}</p>;
  }
  const agentCards = <div className="mcAgentGrid">{Object.entries(AGENTS).map(([id,agent]) => <button type="button" className={`mcAgentCard ${id === selected ? 'selected' : ''}`} style={{'--agent':agent.color}} key={id} aria-pressed={id === selected} onClick={() => onSelect(id)}>
    <div className="mcAgentTop"><AgentCore agent={id}/><div><h3>{name(id)}</h3><small>{DESCRIPTIONS[id][0]}</small><span className={`mcAgentBadge ${connected && system?.agents?.[id]?.configured ? 'configured' : ''}`}>{id === selected && liveActive ? 'Canlı ses açık' : agentStatus(id)}</span></div></div><p>{DESCRIPTIONS[id][1]}</p><span className="mcCardAction">{id === selected ? 'SEÇİLİ AJAN' : 'AJANI SEÇ'}<Icon type="arrow" width="16" height="16"/></span>
  </button>)}</div>;
  const statusRows = [
    ['Sunucu bağlantısı', connected ? 'Bağlı' : 'Bağlantı bekleniyor', connected],
    ['Metin sağlayıcıları', summary.configured === null ? 'Kontrol ediliyor' : `${summary.configured} / 3 anahtar tanımlı`, summary.configured > 0],
    ['Sunucu hafızası', summary.ready ? `${summary.memory.length} kayıt · rev. ${summary.revision}` : 'Yükleniyor', summary.ready],
    ['Canlı ses', liveActive ? 'Oturum açık' : system?.liveEnabled ? 'Anahtar tanımlı' : 'Anahtar bekleniyor', connected && Boolean(system?.liveEnabled)],
  ];
  const recentHistory = (state?.history || []).filter(item => item.agent === selected).slice(-2);
  const phaseLabel = ({idle:'Hazır',connecting:'Bağlanıyor',listening:'Dinliyor',thinking:'Düşünüyor',speaking:'Konuşuyor',error:'Bağlantı hatası'})[phase] || 'Hazır';
  return <div className={`missionControl missionCosmos mc-page-${page}`} style={{'--mission-space': `url("${missionSpace}")`}}>
    <header className="mcHeader"><button type="button" className="mcBrand" onClick={() => navigate('overview')}><span className="mcBrandMark">J</span><b>JARVIS <small>// MISSION CONTROL</small></b></button><span className="mcHeaderMotto">DÜŞÜN. PLANLA. BİRLİKTE GELİŞTİR.</span><div className="mcHeaderRight"><span className={`mcConnection ${connected ? 'online' : ''}`}>{connected ? 'SUNUCU BAĞLI' : 'BAĞLANTI BEKLENİYOR'}</span><time>{time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}<small>{time.toLocaleDateString('tr-TR',{day:'numeric',month:'short',weekday:'short'})}</small></time><button className="mcIconButton" onClick={onSettings} aria-label="Ayarlar"><Icon type="settings"/></button></div></header>
    <nav className="mcSidebar" aria-label="Dashboard menüsü"><span className="mcNavLabel">ANA MENÜ</span>{NAV.map(([id,label,icon]) => <button key={id} data-nav={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon type={icon}/><span>{label}</span></button>)}<div className="mcSidebarFooter"><strong>JARVIS</strong><small>KİŞİSEL AI ASİSTANIN</small><button onClick={onHud}><Icon type="arrow"/>HUD'a dön</button></div></nav>
    <div className="mcContent" key={page}>
      {page === 'overview' ? <section className="mcHero">
        <div className="mcHeroCopy"><span className="mcEyebrow">HOŞ GELDİN <i/></span><h1>Bugün neyi<br/>birlikte başaralım?</h1><p>Düşün. Planla. Görevlendir.<br className="mcDesktopBreak"/> JARVIS seninle.</p></div>
        <div className={`mcHeroFigure mc-phase-${phase}`} style={{'--agent':AGENTS[selected].color}}><div className="mcHeroOrbit"/><AgentCore agent={selected}/><div className="mcHeroCaption"><span>AKTİF ASİSTAN</span><h2>{name(selected)}</h2><small>{DESCRIPTIONS[selected][0]}</small><p><i/>{phaseLabel}</p></div></div>
        <div className="mcHeroCoordinates" aria-hidden="true">DÜŞÜN<br/>PLANLA<br/>BİRLİKTE GELİŞTİR</div>
      </section> : <section className="mcWelcome"><span className="mcEyebrow">ÇALIŞMA ALANI</span><h1>{({agents:'Ekibini tanı.',tasks:'İşlerin tek bir yerde.',memory:'Hatırladıklarımız.'})[page]}</h1><p>{page === 'memory' ? 'Buradaki kayıtlar ortak hafızadır. Ajanların özel sohbetleri birbirinden ayrıdır.' : page === 'tasks' ? 'Yazılı AI görevlerinin gerçek durumu. Canlı ses turları sohbet geçmişinde tutulur.' : 'Her ajanın kendi rolü, karakteri ve konuşma geçmişi var.'}</p></section>}
      {error && <div className="mcError" role="alert">{error}</div>}
      {page === 'agents' && agentCards}
      {page === 'agents' && <section className="mcPanel mcAgentDetail"><div style={{'--agent':AGENTS[selected].color}}><AgentCore agent={selected}/></div><div><span className="mcEyebrow">SEÇİLİ AJAN</span><h2>{name(selected)}</h2><p>{DESCRIPTIONS[selected][1]}</p><p>Karakter ve ses tercihlerini Ayarlar bölümünden değiştirebilirsin.</p><button className="mcPrimary" onClick={onHud}>Sohbeti aç<Icon type="arrow"/></button></div></section>}
      {page === 'overview' && <>
        <section className="mcPanel mcComposer"><div className="mcSectionTitle"><h2><Icon type="chat"/>{name(selected)}'A MESAJ GÖNDER</h2><button onClick={onHud}>HUD'ı aç<Icon type="arrow" width="14"/></button></div><form onSubmit={e => {e.preventDefault();if(text.trim()){onSend(text);setText('');}}}><label className="mcSrOnly" htmlFor="mission-message">Mesajın</label><input id="mission-message" value={text} onChange={e => setText(e.target.value)} placeholder="Ne yapmak istersin?" maxLength={8000}/><button type="button" className="mcMic" onClick={onVoice} disabled={busy && !liveActive} aria-label={liveActive ? 'Canlı konuşmaya dön' : 'Canlı konuşmayı aç'}><Icon type="mic"/></button><button className="mcSend" disabled={(!text.trim() || busy) && !liveActive} aria-label="Mesaj gönder"><Icon type="arrow"/></button></form><div className="mcQuickActions">{['Günümü planlamama yardım et.','Bir konuyu araştırmak istiyorum.','Bir fikri birlikte geliştirelim.'].map((q,i) => <button key={q} onClick={() => setText(q)}><Icon type={['tasks','research','agents'][i]} width="16"/>{['Plan oluştur','Araştırma yap','Fikir geliştir'][i]}</button>)}</div></section>
        <section className="mcAgentSection"><div className="mcSectionTitle"><h2>AJANLARIN</h2><button onClick={() => navigate('agents')}>Tüm ajanları gör<Icon type="arrow" width="14"/></button></div>{agentCards}</section>
        <div className="mcSectionTitle mcStatsHeading"><h2>BUGÜN ÖNE ÇIKANLAR</h2></div>
        <div className="mcStatGrid"><button type="button" onClick={() => {navigate('tasks');setFilter('running');}}><Icon type="tasks"/><strong>{summary.running}</strong><span>Çalışan görev</span></button><button type="button" onClick={() => {navigate('tasks');setFilter('completed');}}><Icon type="check"/><strong>{summary.completed}</strong><span>Yanıtı hazır görev</span></button><button type="button" onClick={() => navigate('memory')}><Icon type="memory"/><strong>{summary.ready ? summary.memory.length : '—'}</strong><span>Hafıza kaydı</span></button><button type="button" onClick={() => navigate('agents')}><Icon type="agents"/><strong>{summary.configured ?? '—'}</strong><span>Metin anahtarı tanımlı</span></button></div>
        <section className="mcPanel mcTasksPanel"><div className="mcSectionTitle"><h2>SON GÖREVLER</h2><button onClick={() => navigate('tasks')}>Tümünü gör<Icon type="arrow" width="14"/></button></div><TaskList tasks={summary.tasks.slice(0,5)}/></section>
        <section className="mcPanel mcRecentPanel"><div className="mcSectionTitle"><h2>{name(selected)} · SON KONUŞMA</h2><button onClick={onHud}>Sohbeti aç<Icon type="arrow" width="14"/></button></div>{recentHistory.length ? recentHistory.map((m,i) => <div className={`mcHistory ${m.role}`} key={i}><small>{m.role === 'user' ? 'SEN' : name(selected)}</small><p>{m.content?.slice(0,600)}{m.content?.length > 600 ? '…' : ''}</p></div>) : <p className="mcEmpty">Bu ajanla henüz kaydedilmiş konuşma yok.</p>}</section>
      </>}
      {page === 'tasks' && <section className="mcPanel"><div className="mcFilters"><input aria-label="Görevlerde ara" placeholder="Görevlerde ara…" value={search} onChange={e => setSearch(e.target.value)}/><select aria-label="Görev durumunu filtrele" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tüm durumlar</option>{Object.entries(TASK_LABELS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>{busy && <button onClick={onCancel} className="mcSecondary">Çalışan görevi iptal et</button>}</div><TaskList tasks={filteredTasks}/></section>}
      {page === 'memory' && <section className="mcPanel"><div className="mcSectionTitle"><h2>{summary.ready ? summary.memory.length : '—'} ORTAK KAYIT</h2><button onClick={onExport} disabled={!summary.ready}><Icon type="export" width="16"/>Yedeği indir</button></div><div className="mcFilters"><input aria-label="Hafızada ara" placeholder="Hafızada ara…" value={search} onChange={e => setSearch(e.target.value)}/><button className="mcSecondary" onClick={onSettings}>Hafıza ve içe aktarma ayarları</button></div>{filteredMemory.length ? <div className="mcMemoryList">{filteredMemory.map(m => <article key={m.key}><small>{MEMORY_LABELS[m.category]}</small><p>{m.text}</p></article>)}</div> : <p className="mcEmpty">{summary.ready ? 'Bu aramaya uygun hafıza kaydı yok.' : 'Hafıza yükleniyor…'}</p>}</section>}
    </div>
    <aside className="mcRail"><section className="mcPanel"><div className="mcSectionTitle"><h2>SİSTEM DURUMU</h2><Icon type="home" width="16"/></div><div className="mcStatusList">{statusRows.map(([label,value,ok]) => <article key={label}><span className={ok ? 'ok' : ''}/><div><strong>{label}</strong><small>{value}</small></div></article>)}</div><p className="mcFootnote">Anahtarın tanımlı olması API erişimini veya kullanılabilir kotayı garanti etmez.</p></section><section className="mcPanel"><div className="mcSectionTitle"><h2>AKTİF ASİSTAN</h2></div><div className="mcActiveCore" style={{'--agent':AGENTS[selected].color}}><AgentCore agent={selected}/><h3>{name(selected)}</h3><p>{({idle:'Hazır',connecting:'Bağlanıyor',listening:'Dinliyor',thinking:'Düşünüyor',speaking:'Konuşuyor',error:'Bağlantı hatası'})[phase] || 'Hazır'}</p></div><button className="mcPrimary" onClick={onHud}>HUD'a geç<Icon type="arrow"/></button></section><section className="mcPanel mcActivityPanel"><div className="mcSectionTitle"><h2>SON ETKİNLİKLER</h2></div>{summary.tasks.slice(0,4).length ? <div className="mcActivityList">{summary.tasks.slice(0,4).map(t => <article key={t.id}><i/><div><strong>{TASK_LABELS[t.status] || t.status}</strong><p>{t.message}</p><time>{displayTime(t.finishedAt || t.createdAt)}</time></div></article>)}</div> : <p className="mcEmpty">Görev etkinlikleri burada görünecek.</p>}</section><section className="mcSmallNote"><span>DAHA FAZLA</span><strong>POTANSİYEL.</strong><p>Birlikte düşün, adım adım geliştir.</p></section></aside>
  </div>;
}
