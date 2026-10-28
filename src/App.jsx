import { useEffect, useRef, useState } from 'react';
import './App.css';
import './styles/upgrade.css';
import ChatPanel from './ChatPanel';
import VoiceOrb from './components/VoiceOrb';
import { AGENTS, VOICES, defaultSettings } from '../lib/settings.js';
import { usePerformance } from './hooks/usePerformance';
import { useLiveVoice } from './hooks/useLiveVoice';
import './styles/voice.css';
import Dashboard from './components/Dashboard';
import PhotoInput from './components/PhotoInput';
import HomePanel from './components/HomePanel';
import CommandCenter from './components/CommandCenter';
import TaskPulse from './components/TaskPulse';
import './styles/futuristic.css';
import { QUICK, hasOpenIntent } from './core/commands.js';
import { api, memoryBridge } from './core/api.js';
import { JARVIS_MEMORY_KEY, loadJarvisMemory } from './core/memory.js';
import { createVoiceController } from './core/voice.js';
import { createAppActions } from './core/appActions.js';
import { useSession } from './hooks/useSession.js';

export default function App() {
  const [time, setTime] = useState(() => new Date());
  const [settingsToast, setSettingsToast] = useState(0);
  useEffect(() => {
    if (!settingsToast) return;
    const timer = setTimeout(() => setSettingsToast(0), 3500);
    return () => clearTimeout(timer);
  }, [settingsToast]);
  const [command, setCommand] = useState(''), [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false), [access, setAccess] = useState('');
  const [listening, setListening] = useState(false), [speaking, setSpeaking] = useState(false), [, setActiveSpeaker] = useState(null);
  const [image, setImage] = useState(null), [city, setCity] = useState(''), [view, setView] = useState('home');
  const recognitionRef = useRef(null), conversationModeRef = useRef(false), voiceGeneration = useRef(0), lastLaunchRef = useRef({ target: '', time: 0 });
  const voiceRef = useRef(null), settingsDialog = useRef(null), agentDialog = useRef(null);
  const performance = usePerformance();
  const session = useSession(data => {
    setNotice('');
    if (!session.state?.settings.autoSpeak || live.active) return;
    if (data.turns?.length) voiceRef.current?.speakTurns(data.turns);
    else voiceRef.current?.speak(data.reply, data.speaker);
  });
  const { state: saved, system, active, drafts } = session;
  const settings = saved?.settings || defaultSettings();
  const selected = settings.selectedAgent || 'jarvis';
  const profile = settings.profiles[selected];
  const live = useLiveVoice({ client: session.client, agent: selected, profile });
  const loading = Boolean(active) || submitting;
  const voice = createVoiceController({ listening, setListening, setSpeaking, setActiveSpeaker, setCommand, setReply: setNotice, recognitionRef, conversationModeRef, voiceGeneration, askJarvis, speechRate: settings.speechRate });
  voiceRef.current = voice;
  const actions = createAppActions({ lastLaunchRef, conversationModeRef, recognitionRef, setListening, setSpeaking, setReply: setNotice, speak: settings.autoSpeak ? voice.speak : () => {} });
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(timer); voiceGeneration.current++; conversationModeRef.current = false; recognitionRef.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);
  async function cancelTask() {
    voice.stopVoice(); live.stop();
    try { await session.cancel(); setNotice(active ? 'Görev iptal ediliyor…' : 'Sesli iletişim durduruldu.'); }
    catch (e) { setNotice(e.message); }
  }
  async function askJarvis(text) {
    const clean = String(text || '').trim() || (image ? 'Bu fotoğrafta ne görüyorsun?' : '');
    if (!clean) return;
    if (/^(dur|sus|iptal et|konuşmayı durdur)$/i.test(clean)) { await cancelTask(); return; }
    try {
      if (live.active) { if (image) throw new Error('Fotoğraf göndermek için canlı konuşmayı kapatın.'); live.sendText(clean); setCommand(''); return; }
      if (!image && hasOpenIntent(clean) && await actions.localAction(clean)) { setCommand(''); return; }
      if (!memoryBridge.ready) { setNotice('Sunucuya bağlanın.'); return; }
      if (loading) return;
      setSubmitting(true);
      if (!image && await actions.localAction(clean)) { setCommand(''); return; }
      await memoryBridge.pending;
      await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: clean, client: session.client, agent: selected, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(image ? { image } : {}) }) });
      setCommand(''); setImage(null); setNotice('');
      await session.refresh();
    } catch(e) { setNotice(e.message); }
    finally { setSubmitting(false); }
  }
  async function saveSettings(patch) {
    try { await api('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) }); await session.refresh(); setNotice(''); setSettingsToast(Date.now()); }
    catch(e) { setNotice(e.message); }
  }
  async function importMemory(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Dosya çok büyük.');
      const data = JSON.parse(await file.text());
      await memoryBridge.pending;
      const result = await api('/api/memory', { method: 'PUT', body: JSON.stringify({ memory: data, revision: memoryBridge.revision }) });
      memoryBridge.revision = result.revision;
      localStorage.setItem(JARVIS_MEMORY_KEY, JSON.stringify(data));
      await session.refresh(); setNotice('Hafıza içe aktarıldı.');
    } catch(e) { setNotice(e.message); }
  }
  function exportMemory() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(loadJarvisMemory(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'jarvis-memory.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const phase = live.active || live.phase === 'error' ? live.phase : listening ? 'listening' : loading ? 'thinking' : speaking ? 'speaking' : 'idle';
  const names = Object.fromEntries(Object.entries(settings.profiles).map(([id,p]) => [id,p.name]));
  async function chooseAgent(id) { live.stop(); voice.stopVoice(); await saveSettings({ selectedAgent: id }); agentDialog.current?.close(); }
  return <main className={`jarvis v8 future view-${view} theme-hacker theme-${selected} state-${phase} quality-${performance.effective}`} style={{'--voice-accent': AGENTS[selected].color}}>
    <div className="spaceBackdrop" aria-hidden="true"><div className="nebula nebulaA"/><div className="nebula nebulaB"/><div className="stars starsFar"/><div className="stars starsNear"/></div>
    <div className="bg-grid"/><div className="scan"/>
    <header className="topbar glass">
      <div className="hudBrand"><b>JARVIS</b><small>KİŞİSEL YAPAY ZEKA</small></div>
      <nav className="hudAgentTabs" aria-label="Asistan seçimi">{Object.entries(AGENTS).map(([id,a]) => <button type="button" key={id} style={{'--tab-color':a.color}} className={id === selected ? 'selected' : ''} aria-pressed={id === selected} onClick={() => chooseAgent(id)}><span className="hudTabRing" aria-hidden="true"/>{settings.profiles[id].name}</button>)}</nav>
      <div className="headerActions"><span className={`connectionDot ${session.connected ? 'online' : ''}`} aria-hidden="true"/><span className="hudConnection">{session.connected ? 'Bağlı' : 'Bağlanıyor'}</span><button type="button" className="commandToggle" onClick={() => setView(view === 'home' ? 'chat' : 'home')} aria-label={view === 'home' ? 'Sohbete geç' : 'Komuta merkezini aç'}>{view === 'home' ? 'SOHBET' : 'PANEL'}</button><button type="button" onClick={() => settingsDialog.current?.showModal()} aria-label="Ayarları aç"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 2-1 3v3l-4 2-3-1-3-1-3-1v-4l-2-2 1-4 3-1Z"/><circle cx="12" cy="12" r="3.5"/></svg></button></div>
    </header>
    <aside className="leftRail glass"><h3>HIZLI ERİŞİM</h3>
      {QUICK.map(([icon, label, url]) => <button key={label} className="hudButton" onClick={() => { const app = actions.appByName(label); if (app) actions.launchApp(app, url); else actions.openExternal(url); }}><span>{icon}</span><b>{label}</b></button>)}
      <button className="hudButton" onClick={() => askJarvis('saat kaç')}>Saat / Tarih</button>
      <p className="railHint">DİLAN koordinasyon · LARA kaynaklı araştırma · VERA teknik taslak</p>
    </aside>
    <section className="stage glass">
      <CommandCenter state={saved} system={system} connected={session.connected} liveActive={live.active} liveEnabled={system?.liveEnabled} screens={system?.screens} loading={loading} selected={selected} profiles={settings.profiles} city={settings.city} ready={Boolean(saved)} onOpenChat={() => setView('chat')} onSelectAgent={id => { chooseAgent(id); setView('chat'); }} onToggleLive={() => { voice.stopVoice(); if (live.active) live.stop(); else live.start(); }}/>
      <VoiceOrb phase={phase} name={profile.name} role={AGENTS[selected].role}/>
      <div className="conversationColumn"><header className="conversationHeading"><b>KONUŞMA</b><small>{profile.name}</small></header>
      <TaskPulse tasks={saved?.tasks} phase={phase} connected={session.connected}/>
      {live.error && <p className="sessionMessage" role="alert">{live.error}</p>}
      {live.active && <p className="liveNotice">Canlı mikrofon açık · Sözünü kesebilirsin · Kapatmak için mikrofon düğmesine bas</p>}
      {settingsToast > 0 && <div className="liveNotice" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}><span role="status">Ayarlar kaydedildi.</span><button type="button" aria-label="Bildirimi kapat" onClick={() => setSettingsToast(0)}>×</button></div>}
      <ChatPanel historyReady={Boolean(saved)} history={(saved?.history || []).filter(x => x.agent === selected)} notice={notice} loading={loading} pendingUser="" drafts={live.active ? { ...(live.transcript.user ? { user: live.transcript.user } : {}), ...(live.transcript.assistant ? { [selected]: live.transcript.assistant } : {}) } : drafts} names={names}/>
      <details className="photoTools"><summary>Fotoğraf veya kamera {image ? '· 1 seçili' : ''}</summary><PhotoInput image={image} onChange={setImage} disabled={loading || live.active}/></details>
      <form className="commandBar glass" onSubmit={e => { e.preventDefault(); askJarvis(command); }}>
        <button type="button" className={`mic ${live.active ? 'active' : ''}`} disabled={(!live.active && loading) || Boolean(image)} onClick={() => { voice.stopVoice(); if (live.active) live.stop(); else live.start(); }} aria-label={live.active ? 'Canlı mikrofonu kapat' : 'Canlı sesli konuşmayı başlat'} aria-pressed={live.active}>{live.active ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8"/></svg>}</button>
        <button type="button" className="hudAttach" aria-label="Fotoğraf veya kamera seçeneklerini aç" onClick={e => { const panel = e.currentTarget.closest('.conversationColumn').querySelector('.photoTools'); panel.open = !panel.open; }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 6h4l2-3h4l2 3h4v14H4Z"/><circle cx="12" cy="13" r="4"/></svg></button>
        <input className="commandInput" value={command} onChange={e => setCommand(e.target.value)} placeholder={listening ? 'Dinliyorum…' : 'Yaz veya konuş…'} aria-label="Komut"/>
        <button className="send" aria-label="Mesajı gönder" title="Gönder" disabled={loading || (!command.trim() && !image)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 19 0-14m-6 6 6-6 6 6"/></svg></button>
      </form>
      <div className="taskActions"><button onClick={() => { voice.stopVoice(); live.stop(); }}>Sesi durdur</button><button onClick={cancelTask} disabled={!active}>Görevi iptal et</button>{active && <span role="status">{active.message}</span>}</div>
      {(session.error || notice) && <p className="sessionMessage" role="status">{session.error || notice}</p>}
      {saved && <details className="dailyTools"><summary>Günlük pano · hava, döviz ve haberler</summary><Dashboard city={settings.city} ready={Boolean(saved)}/></details>}
      </div>
    </section>
    <dialog className="settingsSheet" ref={settingsDialog} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
      <header className="sheetHeader"><h2>Ayarlar</h2><button onClick={() => settingsDialog.current?.close()}>Bitti</button></header>
      <aside className="rightRail">
      <div className="clockCard glass"><b>{time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</b><small>{time.toLocaleDateString('tr-TR', { dateStyle: 'long' })}</small></div>
      <div className="controlCard glass"><h3>AJANLAR</h3>
        {Object.entries(AGENTS).map(([id, a]) => <div className="profileSetting" key={id}>
          <label>{a.role}<input aria-label={`${a.name} görünen adı`} key={`${id}-${settings.profiles[id].name}`} defaultValue={settings.profiles[id].name} maxLength={16} onBlur={e => { if (e.target.value !== settings.profiles[id].name) saveSettings({ profiles: { [id]: { name: e.target.value.trim() } } }); }}/></label>
          <label>Bu ajanın karakteri<textarea key={`${id}-${settings.profiles[id].personality || ''}`} defaultValue={settings.profiles[id].personality || ''} maxLength={1000} placeholder="Örnek: Kendinden emin ve esprili konuş." onBlur={e => { if (e.target.value !== (settings.profiles[id].personality || '')) saveSettings({ profiles: { [id]: { personality: e.target.value } } }); }}/></label>
          <label>Canlı ses<select value={settings.profiles[id].voice} onChange={e => saveSettings({ profiles: { [id]: { voice: e.target.value } } })}>{VOICES.map(v => <option key={v}>{v}</option>)}</select></label>
        </div>)}
        <p>Her ajanın sohbeti ve karakteri ayrıdır. Kalıcı karakter tercihini buraya yaz. Sohbette verdiğin üslup talimatı o ajanın son konuşmaları içinde geçerlidir. Hafıza bölümüne kaydettiğin bilgiler ortak kullanılır. Önceki sürümün karışık geçmişi korunur ancak ajanlara aktarılmaz.</p>
        <h3>GÖRÜNTÜ VE PERFORMANS</h3>
        <label>Bu cihazda<select value={performance.mode} onChange={e => performance.setMode(e.target.value)}><option value="auto">Otomatik</option><option value="quality">Yüksek kalite</option><option value="performance">Performans</option></select></label>
        <p>Performans modu ışıltı ve hareketi azaltır. Otomatik mod, hareket azaltma ve veri tasarrufu tercihini izler.</p>
        <h3>BAĞLANTI</h3>
        {Object.entries(system?.agents || {}).map(([id, agent]) => <p key={id}>{names[id]} · {agent.configured ? 'Yapılandırıldı' : 'Anahtar eksik'}</p>)}
        <p>Son yanıt: {system?.lastSuccess ? new Date(system.lastSuccess).toLocaleTimeString('tr-TR') : 'Henüz yok'}</p>
        <details><summary>Erişim ayarı</summary><input type="password" value={access} onChange={e => setAccess(e.target.value)} placeholder="Erişim anahtarı" aria-label="Erişim anahtarı"/><button onClick={() => { live.stop(); voice.stopVoice(); sessionStorage.setItem('jarvis-access', access); setAccess(''); session.reconnect(); }}>Bağlan</button></details>
        <details><summary>Ses ve şehir</summary>
          <p>Canlı seste seçilen Gemini sesi kullanılır. Aşağıdaki hız ve seslendirme ayarları yazılı yanıtlara aittir.</p>
          <button onClick={() => { live.stop(); voice.startConversation(); settingsDialog.current?.close(); }}>Tarayıcı ile bas-konuş</button>
          <label><input type="checkbox" checked={settings.autoSpeak} onChange={e => saveSettings({ autoSpeak: e.target.checked })}/>Yanıtları seslendir</label>
          <label>Konuşma hızı<select value={settings.speechRate} onChange={e => saveSettings({ speechRate: Number(e.target.value) })}>{[0.8, 1, 1.1, 1.2, 1.4].map(x => <option key={x} value={x}>{x}×</option>)}</select></label>
          <form onSubmit={e => { e.preventDefault(); saveSettings({ city: city.trim() || settings.city }); }}><label>Hava durumu şehri<input value={city} onChange={e => setCity(e.target.value)} placeholder={settings.city} maxLength={80}/></label><button>Şehri kaydet</button></form>
        </details>
        <details><summary>Hafıza</summary><p>{Object.values(saved?.memory || {}).reduce((n, items) => n + items.length, 0)} kayıt · Konuyla ilgili bilgiler seçilerek hatırlanır.</p><button onClick={exportMemory}>Yedeği indir</button><label>Yedekten yükle<input type="file" accept="application/json" onChange={importMemory}/></label><p>“Proje: …”, “Bunu unutma”, “Projelerim neler” diyebilirsin.</p></details>
        <details><summary>Görevler ({saved?.tasks.length || 0})</summary>{saved?.tasks.slice(0, 20).map(task => <p key={task.id}>{task.message} — {({ running: 'Çalışıyor', completed: 'Yanıt hazır', partial: 'Kısmi sonuç', failed: 'Hata', interrupted: 'Kesintiye uğradı', cancelled: 'İptal edildi' })[task.status]}{task.error && <small>{task.error}</small>}</p>)}</details>
        <button disabled={loading} onClick={async () => { try { await api('/api/history', { method: 'DELETE' }); await session.refresh(); } catch(e) { setNotice(e.message); } }}>Konuşma geçmişini temizle</button>
        {saved && <HomePanel sharedState={session.home}/>}
        <p className="railHint">VERA kod önerir; dosya veya terminal işlemi yapmaz. AI yanıtlarını önemli kararlardan önce doğrula.</p>
      </div>
      </aside>
    </dialog>
    <dialog className="agentSheet" ref={agentDialog}>
      <header className="sheetHeader"><h2>Ajan seç</h2><button onClick={() => agentDialog.current?.close()}>Bitti</button></header>
      <div className="agentCards">{Object.entries(AGENTS).map(([id,a]) => <button key={id} className={selected === id ? 'selected' : ''} style={{ '--card-accent': a.color }} onClick={() => chooseAgent(id)} aria-pressed={selected === id}><span className="agentBadge">{settings.profiles[id].name.slice(0,1)}</span><b>{settings.profiles[id].name}</b><small>{a.role}</small><span>{selected === id ? 'Seçili' : 'Seç'}</span></button>)}</div>
      <p>İsim ve ses değişebilir; ajanların görevleri korunur. Değiştirince canlı oturum kapanır; yeni ajanla mikrofonu yeniden açabilirsin.</p>
    </dialog>
  </main>;
}
