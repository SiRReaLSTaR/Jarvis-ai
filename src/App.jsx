import { useEffect, useRef, useState } from 'react'
import './App.css'
import ChatPanel from './ChatPanel'
import AgentScene from './components/AgentScene'
import {QUICK,hasOpenIntent} from './core/commands.js'
import {api,memoryBridge} from './core/api.js'
import {JARVIS_MEMORY_KEY,loadJarvisMemory} from './core/memory.js'
import {createVoiceController} from './core/voice.js'
import {createAppActions} from './core/appActions.js'


function App(){
  const [time,setTime] = useState(()=>new Date())
  const [system,setSystem] = useState(null)
  const [tasks,setTasks] = useState([])

  useEffect(()=>{
    let disposed=false
    let busy=false
    const controller=new AbortController()
    async function pollAgents(){
      if(busy || document.hidden) return
      busy=true
      try{
        const status=await api('/api/status',{signal:controller.signal})
        if(!disposed) setSystem(status)
      }catch(error){
        if(!disposed && error.name!=='AbortError') setSystem(null)
      }finally{
        busy=false
      }
    }
    const timer=setInterval(pollAgents,1500)
    return ()=>{disposed=true;clearInterval(timer);controller.abort()}
  },[])

  const [history,setHistory] = useState([])
  const [sources,setSources] = useState([])
  const [access,setAccess] = useState('')
  const [connectionError,setConnectionError] = useState('')
  const requestRef = useRef(null)
  const voiceGeneration = useRef(0)
  async function refreshState(){
    try {
      const status = await api('/api/status')
      const data = await api('/api/state')
      setSystem(status); setTasks(data.tasks); setHistory(data.history); setConnectionError('')

    if(!memoryBridge.ready){
        const local=loadJarvisMemory()
        if(Object.values(data.memory).every(items=>!items.length) && Object.values(local).some(items=>items.length)) await api('/api/memory',{method:'PUT',body:JSON.stringify(local)})
        else window.localStorage.setItem(JARVIS_MEMORY_KEY,JSON.stringify(data.memory))
        memoryBridge.ready=true
      }
    }catch(error){ setConnectionError(error.message); setSystem(null) }
  }
  useEffect(()=>{
    const initial=setTimeout(refreshState,0)
    const timer=setInterval(refreshState,5000)
    return ()=>{ clearTimeout(initial); clearInterval(timer); conversationModeRef.current=false; recognitionRef.current?.abort(); window.speechSynthesis?.cancel(); requestRef.current?.abort(); memoryBridge.ready=false }
  },[])
  function exportMemory(){
    const url=URL.createObjectURL(new Blob([JSON.stringify(loadJarvisMemory(),null,2)],{type:'application/json'}))
    const link=document.createElement('a');link.href=url;link.download='jarvis-memory.json';link.click();URL.revokeObjectURL(url)
  }
  async function importMemory(event){
    try{
      const file=event.target.files?.[0];if(!file)return
      if(file.size>1000000) throw new Error('Dosya çok büyük.')
      const data=JSON.parse(await file.text())
      await api('/api/memory',{method:'PUT',body:JSON.stringify(data)})
      window.localStorage.setItem(JARVIS_MEMORY_KEY,JSON.stringify(data));setReply('Hafıza içe aktarıldı.')
    }catch(error){setReply(error.message)}
    event.target.value=''
  }
  const [command,setCommand] = useState('')
  const [reply,setReplyValue] = useState('Sistemler çevrimiçi. Komutunu bekliyorum Mustafa.')
  const [chatNotice,setChatNotice] = useState('')
  const [pendingUser,setPendingUser] = useState('')
  function setReply(text){setReplyValue(text);setChatNotice(String(text || ''))}
  const [loading,setLoading] = useState(false)
  const [listening,setListening] = useState(false)
  const [speaking,setSpeaking] = useState(false)
  const [activeSpeaker,setActiveSpeaker] = useState(null)
  const recognitionRef = useRef(null)
  const conversationModeRef = useRef(false)

  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000)
    return()=>clearInterval(t)
  },[])


  const dateText = time.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric',weekday:'long'})
  const timeText = time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})

  const lastLaunchRef = useRef({target:'',time:0})
  const {stopVoice,speak,speakTurns,startConversation}=createVoiceController({listening, setListening, setSpeaking, setActiveSpeaker, setCommand, setReply, recognitionRef, conversationModeRef, voiceGeneration, askJarvis})
  const {openExternal,launchApp,appByName,localAction}=createAppActions({lastLaunchRef,conversationModeRef,recognitionRef,setListening,setSpeaking,setReply,speak})


  async function askJarvis(text){
    const clean=String(text || '').trim()
    if(!clean) return

    if(/^(dur|sus|iptal et|konuşmayı durdur)$/i.test(clean)){
      stopVoice()
      setReply('Sesli iletişim durduruldu.')
      return
    }

    // Uygulama açılışı sunucu bağlantısından bağımsızdır.
    if(hasOpenIntent(clean)){
      setCommand('')
      if(localAction(clean)) return
    }

    if(!memoryBridge.ready){
      setReply('Sohbet için sunucu bağlantısını kontrol et.')
      return
    }

    if(loading) return
    setCommand('')
    if(localAction(clean)) return

    setPendingUser(clean)
    setLoading(true)
    setReply('İşleniyor…')
    try{
      await memoryBridge.pending
      requestRef.current=new AbortController()
      const data=await api('/api/chat',{
        method:'POST', signal:requestRef.current.signal,
        body:JSON.stringify({message:clean})
      })
      setSources(data.sources || [])
      await refreshState()
      if(Array.isArray(data.turns) && data.turns.length){
        const visibleNames={jarvis:'DİLAN',atlas:'LARA',nexus:'VERA'}
        const transcript=data.turns
          .map(turn=>`${visibleNames[String(turn?.speaker || '').toLowerCase()] || 'AI'}: ${turn?.text || ''}`)
          .join('\n\n')

        console.log('🧠 Multi-Speaker:',data.turns.map(turn=>turn.speaker).join(' → '))
        setReply(transcript)
        setChatNotice('')
        await speakTurns(data.turns)
      }else{
        const answer=data.reply || data.message || data.text || 'Yanıt alınamadı.'
        const speaker=String(data.speaker || 'jarvis').toLowerCase()

        console.log('🧠 Aktif ajan:',speaker)

        setReply(answer)
        setChatNotice('')
        speak(answer,speaker)
      }
    }catch(e){
      console.error(e)
      setReply(e.message || 'Bağlantıda sorun oluştu.')
    }finally{
      setLoading(false)
      setPendingUser('')
      refreshState()
    }
  }

  const state = listening ? 'listening' : loading ? 'thinking' : speaking ? 'speaking' : 'idle'
  const stateLabel = listening ? 'DİNLİYORUM' : loading ? 'DÜŞÜNÜYORUM' : speaking ? 'KONUŞUYORUM' : 'ONLINE'

  return (
    <main className={`jarvis theme-hacker state-${state}`}>
      <div className="spaceBackdrop" aria-hidden="true">
        <div className="nebula nebulaA"/><div className="nebula nebulaB"/><div className="nebula nebulaC"/>
        <div className="stars starsFar"/><div className="stars starsMid"/><div className="stars starsNear"/>
        <div className="cosmicDust">{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i}}/>)}</div>
        <div className="shootingStar ss1"/><div className="shootingStar ss2"/>
      </div>
      <div className="bg-grid"/><div className="scan"/><div className="noise"/>
      <header className="topbar glass">
        <div className="brand"><span className="brandMark">J</span><div><b>JARVIS</b><small>AI PERSONAL ASSISTANT</small></div></div>
        <div className="topStatus"><i/> {system?'CORE BAĞLI':'CORE BAĞLANTISI YOK'} <span>•</span> TR-TR <span>•</span> V6.0</div>
      </header>


      <aside className="leftRail glass">
        <h3>KOMUTLAR <span>⌕</span></h3>
        {[
          ['●','Sohbet Et',()=>document.querySelector('.commandInput')?.focus()],
          ['G','Google Ara',()=>launchApp(appByName('google'),'https://www.google.com')],
          ['▶','YouTube Aç',()=>launchApp(appByName('youtube'),'https://www.youtube.com')],
          ['♫','Spotify Çal',()=>launchApp(appByName('spotify'),'https://open.spotify.com')],
          ['✦','Harita Ara',()=>launchApp(appByName('harita'),'https://maps.google.com')],
          ['◉','Saat / Tarih',()=>{const x=`Saat ${timeText}. ${dateText}.`;setReply(x);speak(x)}],
          ['✉','E-posta Aç',()=>launchApp(appByName('gmail'),'https://mail.google.com')],
          ['▣','Takvim Aç',()=>openExternal('https://calendar.google.com')],
        ].map(([ic,tx,fn])=><button key={tx} className="hudButton" onClick={fn}><span>{ic}</span><b>{tx}</b><i/></button>)}
      </aside>

      <section className="stage glass">
        <div className="stageSpace" aria-hidden="true">
          <div className="themeWorld" aria-hidden="true">
            <div className="worldLayer worldBack"/>
            <div className="worldLayer worldMid"/>
            <div className="worldLayer worldFront"/>
            <div className="worldGlyphs"/>
            <div className="sceneArt">
              <div className="serverRack r1"/>
              <div className="serverRack r2"/>
              <div className="codeCurtain"/>
              <div className="holoPanel hp1"/>
              <div className="holoPanel hp2"/>
            </div>
          </div>
          <div className="stageDust">{Array.from({length:22},(_,i)=><i key={i} style={{'--i':i}}/>)}</div>
        </div>
        <div className="corner c1"/><div className="corner c2"/><div className="corner c3"/><div className="corner c4"/>
        <div className="stageTitle"><b>KIRMIZI SİYAH</b><small>RED CORE</small></div>
        <div className="telemetry leftT">01 // CORE<br/>SIGNAL STABLE</div>
        <div className="telemetry rightT">NEURAL LINK<br/>ERİŞİM KONTROLÜ</div>


        <AgentScene speaking={speaking} activeSpeaker={activeSpeaker} system={system}/>

<ChatPanel historyReady={memoryBridge.ready} history={history} notice={chatNotice} loading={loading} pendingUser={pendingUser}/>

        <div className="quickRow">
          {QUICK.slice(0,5).map(([ic,n,u])=><button key={n} className="quickButton" onClick={()=>{const a=appByName(n);if(a)launchApp(a,u);else openExternal(u)}}><span>{ic}</span><b>{n}</b><i/></button>)}
        </div>

        <form className="commandBar glass" onSubmit={e=>{e.preventDefault();askJarvis(command)}}>
          <button type="button" className={`mic ${listening?'active':''}`} onClick={startConversation}
            aria-label={listening?'Mikrofon dinliyor':'Mikrofonu aç'}
            title="Sesli komut">
            <svg viewBox="0 0 24 24" width="26" height="26"
                 fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>
            </svg>
          </button>
          <input className="commandInput" value={command} onChange={e=>setCommand(e.target.value)} placeholder={listening?'Seni dinliyorum…':'Komutunu söyle veya yaz…'}/>
          <button className="send" disabled={!command.trim()||loading}>➤</button>
        </form>
      </section>

      <aside className="rightRail">
        <div className="clockCard glass"><b>{timeText}</b><small>{dateText}</small></div>
        <div className="systemCard glass"><h3>SİSTEM DURUMU</h3>
          <p><i/>AI Core <b>{system ? 'Sunucu bağlı' : 'Bağlı değil'}</b></p><p><i/>Mikrofon <b>{listening?'Dinliyor':'Hazır'}</b></p>
          <p><i/>API Link <b>{system?.lastSuccess ? 'Son işlem başarılı' : 'Henüz doğrulanmadı'}</b></p><p><i/>Ses Motoru <b>{speaking?'Aktif':'Hazır'}</b></p>
        </div>
        <div className="controlCard glass">
          <h3>GÖREV MERKEZİ</h3>
          {Object.values(system?.agents || {}).map(agent=><p key={agent.name}>{agent.name}: {agent.configured?'Yapılandırıldı':'Anahtar eksik'}</p>)}
          <p>Kod üretimi: öneri ve taslak</p>
          <button onClick={stopVoice}>Sesi durdur</button>
          <details><summary>Erişim ayarı</summary>
            <input type="password" value={access} onChange={e=>setAccess(e.target.value)} placeholder="Erişim anahtarı" aria-label="Erişim anahtarı"/>
            <button onClick={()=>{sessionStorage.setItem('jarvis-access',access);setAccess('');memoryBridge.ready=false;refreshState()}}>Bağlan</button>
          </details>
          {connectionError && <p role="alert">{connectionError}</p>}
          <details><summary>Görevler ({tasks.length})</summary>
            {tasks.map(task=><p key={task.id}>{task.message} — {({running:'Çalışıyor',completed:'Yanıt hazır',partial:'Kısmi sonuç',failed:'Hata',interrupted:'Kesintiye uğradı'})[task.status] || task.status}</p>)}
          </details>
          <details><summary>Konuşma geçmişi</summary>
            {history.map((item,index)=><p key={index}><b>{item.role==='user'?'Sen':'Jarvis'}:</b> {item.content}</p>)}
            <button onClick={async()=>{try{await api('/api/history',{method:'DELETE'});await refreshState()}catch(e){setReply(e.message)}}}>Geçmişi temizle</button>
          </details>
          <button onClick={exportMemory}>Hafızayı indir</button>
          <label>Hafıza içe aktar<input type="file" accept="application/json" onChange={importMemory}/></label>
          {sources.length>0 && <details open><summary>Araştırma kaynakları</summary>{sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></p>)}</details>}
        </div>
        <div className="accessCard glass"><h3>HIZLI ERİŞİM</h3><div>
          {QUICK.map(([ic,n,u])=><button key={n} className="accessButton" onClick={()=>{const a=appByName(n);if(a)launchApp(a,u);else openExternal(u)}}><span>{ic}</span><small>{n}</small><i/></button>)}
        </div></div>
      </aside>
    </main>
  )
}
export default App
