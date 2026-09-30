import { useEffect, useRef, useState } from 'react'
import './App.css'

const THEMES = [
  { id:'jarvis', name:'JARVIS', sub:'Premium' },
  { id:'future', name:'Fütüristik', sub:'Tech' },
  { id:'military', name:'Askeri', sub:'Tactical' },
  { id:'hacker', name:'Hacker', sub:'Terminal' },
  { id:'cyberpunk', name:'Cyberpunk', sub:'Neon' },
  { id:'space', name:'Deep Space', sub:'Orbital' },
  { id:'stealth', name:'Stealth', sub:'Black' },
  { id:'quantum', name:'Quantum', sub:'Glass' },
  { id:'nature', name:'Doğa', sub:'Bio Tech' },
  { id:'minimal', name:'Minimal', sub:'Zero' },
]

const SITE_ACTIONS = [
  { names:['youtube'], label:'YouTube', web:'https://www.youtube.com', ios:'youtube://', android:'vnd.youtube://' },
  { names:['google'], label:'Google', web:'https://www.google.com', ios:'google://', android:'googlechrome://' },
  { names:['spotify'], label:'Spotify', web:'https://open.spotify.com', ios:'spotify://', android:'spotify://' },
  { names:['instagram'], label:'Instagram', web:'https://www.instagram.com', ios:'instagram://app', android:'instagram://app' },
  { names:['facebook'], label:'Facebook', web:'https://www.facebook.com', ios:'fb://', android:'fb://' },
  { names:['twitter','x.com'], label:'X', web:'https://x.com', ios:'twitter://', android:'twitter://' },
  { names:['github'], label:'GitHub', web:'https://github.com' },
  { names:['gmail'], label:'Gmail', web:'https://mail.google.com', ios:'googlegmail://', android:'googlegmail://' },
  { names:['google maps','haritalar','harita'], label:'Google Maps', web:'https://maps.google.com', ios:'comgooglemaps://', android:'geo:0,0?q=' },
  { names:['google drive','drive'], label:'Google Drive', web:'https://drive.google.com', ios:'googledrive://', android:'googledrive://' },
  { names:['google takvim','takvim'], label:'Google Takvim', web:'https://calendar.google.com' },
]

const QUICK = [
  ['G','Google','https://www.google.com'],
  ['▶','YouTube','https://www.youtube.com'],
  ['♫','Spotify','https://open.spotify.com'],
  ['✦','Haritalar','https://maps.google.com'],
  ['✉','Gmail','https://mail.google.com'],
  ['▣','Takvim','https://calendar.google.com'],
]

const normalize = (s='') => s.toLocaleLowerCase('tr-TR').trim()

const commandText = (s='') => normalize(s)
  .replace(/[’‘`´]/g,"'")
  .replace(/[.,!?;]+/g,' ')
  .replace(/\s+/g,' ')
  .trim()

const hasOpenIntent = (s='') => /\b(aç|ac|açar mısın|acar misin|açarmısın|acarmisin|uygulamasını aç|uygulamasini ac)\b/i.test(commandText(s))
const stripAction = (s='') => s
  .replace(/\s+(ara|arar mısın|arar misin|bul|bulur musun|aç|ac|açar mısın|acar misin)\s*$/i,'')
  .trim()


function cleanForSpeech(text=''){
  return String(text)
    .replace(/```[\s\S]*?```/g,' kod bloğu ')
    .replace(/`([^`]+)`/g,'$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g,'$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
    .replace(/https?:\/\/\S+/gi,' bağlantı ')
    .replace(/[*_~#>|•●▪■◆◇★☆⭐✨⚡🔥🌌🪐🚀🤖❤️❤💙💚💜🧡💛]+/gu,' ')
    .replace(/[“”"']/g,'')
    .replace(/[-–—]{2,}/g,' ')
    .replace(/\s*\/\s*/g,' ')
    .replace(/\s+/g,' ')
    .trim()
}


const JARVIS_MEMORY_KEY='jarvis-v4-memory'

function emptyJarvisMemory(){
  return {memories:[],ideas:[],tasks:[]}
}

function loadJarvisMemory(){
  try{
    const raw=window.localStorage.getItem(JARVIS_MEMORY_KEY)
    if(!raw) return emptyJarvisMemory()
    const data=JSON.parse(raw)
    return {
      memories:Array.isArray(data.memories)?data.memories:[],
      ideas:Array.isArray(data.ideas)?data.ideas:[],
      tasks:Array.isArray(data.tasks)?data.tasks:[]
    }
  }catch(e){
    console.error('Memory read error:',e)
    return emptyJarvisMemory()
  }
}

function saveJarvisMemory(data){
  try{
    window.localStorage.setItem(JARVIS_MEMORY_KEY,JSON.stringify(data))
    const verify=window.localStorage.getItem(JARVIS_MEMORY_KEY)
    return !!verify
  }catch(e){
    console.error('Memory write error:',e)
    return false
  }
}

function addJarvisMemory(text,type='memory'){
  const value=String(text||'').trim()
  if(!value) return false
  const data=loadJarvisMemory()
  const bucket=type==='idea'?'ideas':type==='task'?'tasks':'memories'
  data[bucket].unshift({
    id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    text:value,
    createdAt:new Date().toISOString()
  })
  if(!saveJarvisMemory(data)) return false
  const check=loadJarvisMemory()
  return check[bucket].some(x=>x.text===value)
}

function removeJarvisMemory(term){
  const data=loadJarvisMemory()
  const needle=normalize(term)
  let removed=0
  for(const key of ['memories','ideas','tasks']){
    const before=data[key].length
    data[key]=data[key].filter(x=>!normalize(x.text).includes(needle))
    removed+=before-data[key].length
  }
  saveJarvisMemory(data)
  return removed
}

function jarvisMemoryContext(){
  const data=loadJarvisMemory()
  return [
    ...data.memories.slice(0,20).map(x=>`HAFIZA: ${x.text}`),
    ...data.ideas.slice(0,20).map(x=>`FIKIR: ${x.text}`),
    ...data.tasks.slice(0,20).map(x=>`GOREV: ${x.text}`)
  ].join('\n')
}

function jarvisMemoryReport(){
  const data=loadJarvisMemory()
  const section=(title,arr)=>arr.length
    ? `${title}:\n${arr.slice(0,10).map((x,i)=>`${i+1}. ${x.text}`).join('\n')}`
    : `${title}: kayıt yok.`
  return [
    section('Hafıza',data.memories),
    section('Fikirler',data.ideas),
    section('Görevler',data.tasks)
  ].join('\n\n')
}

function App(){
  const [time,setTime] = useState(new Date())
  const [command,setCommand] = useState('')
  const [reply,setReply] = useState('Sistemler çevrimiçi. Komutunu bekliyorum Mustafa.')
  const [loading,setLoading] = useState(false)
  const [listening,setListening] = useState(false)
  const [speaking,setSpeaking] = useState(false)
  const [theme,setTheme] = useState(()=>localStorage.getItem('jarvis-theme') || 'jarvis')
  const [themeOpen,setThemeOpen] = useState(false)
  const recognitionRef = useRef(null)
  const conversationModeRef = useRef(false)

  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000)
    return()=>clearInterval(t)
  },[])

  useEffect(()=>{
    localStorage.setItem('jarvis-theme',theme)
  },[theme])

  const currentTheme = THEMES.find(t=>t.id===theme) || THEMES[0]
  const dateText = time.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric',weekday:'long'})
  const timeText = time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})

  function openExternal(url){
    const w=window.open(url,'_blank','noopener,noreferrer')
    if(!w) window.location.href=url
  }

  function launchApp(app, fallbackUrl){
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)
    const isAndroid=/Android/i.test(navigator.userAgent)
    const deepLink=isIOS ? app?.ios : isAndroid ? app?.android : null
    const web=fallbackUrl || app?.web

    if(!deepLink){
      if(web) openExternal(web)
      return
    }

    let leftPage=false
    const markHidden=()=>{ if(document.hidden) leftPage=true }
    document.addEventListener('visibilitychange',markHidden,{once:true})

    // Deep links work best directly inside the user's click/voice-result event.
    window.location.href=deepLink

    // If no native app handled the link, fall back to the website.
    setTimeout(()=>{
      if(!leftPage && document.visibilityState==='visible' && web) openExternal(web)
    },1300)
  }

  function appByName(name){
    const q=normalize(name)
    return SITE_ACTIONS.find(s=>s.names.some(n=>q.includes(n)))
  }

  function speak(text){
    if(!('speechSynthesis' in window) || !text) return
    window.speechSynthesis.cancel()
    const spokenText=cleanForSpeech(text)
    if(!spokenText) return
    const speech=new SpeechSynthesisUtterance(spokenText)
    speech.lang='tr-TR'
    speech.rate=1.4
    speech.pitch=.9
    speech.volume=1
    speech.onstart=()=>setSpeaking(true)
    speech.onend=()=>{
      setSpeaking(false)
      if(conversationModeRef.current) setTimeout(startConversation,450)
    }
    speech.onerror=()=>setSpeaking(false)
    window.speechSynthesis.speak(speech)
  }

  function localAction(raw){
    const q=normalize(raw)
    const cq=commandText(raw)
    if(!q) return true

    // MEMORY CORE V4.0.3 — command may place "hatırla/kaydet" before OR after the fact.
    const memoryCue=/(?:\bhatırla\b|\bhatirla\b|\bkaydet\b|hafızana\s+(?:al|kaydet)|hafizana\s+(?:al|kaydet)|\bunutma\b)/i
    const isIdea=/\b(fikir|fikrim)\b/i.test(cq)
    const isTask=/\b(görev|gorev|yapılacak|yapilacak)\b/i.test(cq)
    const isForget=/(?:\bunut\b|\bsil\b)/i.test(cq) && !/\bunutma\b/i.test(cq)

    if(isForget){
      let value=cq
        .replace(/^jarvis\s*/i,'')
        .replace(/\b(unut|sil)\b/ig,'')
        .replace(/\b(bunu|şunu|sunu)\b/ig,'')
        .trim()
      if(value){
        const n=removeJarvisMemory(value)
        const x=n ? `${n} kayıt hafızadan silindi.` : 'Bu ifadeyle eşleşen bir kayıt bulamadım.'
        setReply(x); speak(x); return true
      }
    }

    if(memoryCue.test(cq)){
      let value=cq
        .replace(/^jarvis\s*/i,'')
        .replace(/\b(bunu|şunu|sunu)\b/ig,'')
        .replace(/\b(hatırla|hatirla|kaydet|unutma)\b/ig,'')
        .replace(/hafızana\s+(?:al|kaydet)/ig,'')
        .replace(/hafizana\s+(?:al|kaydet)/ig,'')
        .replace(/^(fikir|fikrim|görev|gorev|yapılacak|yapilacak)\s*/i,'')
        .trim()

      if(value){
        const type=isIdea?'idea':isTask?'task':'memory'
        const ok=addJarvisMemory(value,type)
        const x=ok
          ? (type==='idea'?'Fikri kaydettim Mustafa. Hafızaya yazıldığını doğruladım.'
            :type==='task'?'Görevi kaydettim Mustafa. Hafızaya yazıldığını doğruladım.'
            :'Kaydettim Mustafa. Hafızaya yazıldığını doğruladım.')
          : 'Hafızaya yazamadım Mustafa. Tarayıcı depolamasını kontrol etmemiz gerekiyor.'
        setReply(x); speak(x); return true
      }
    }

    // Short explicit forms: "fikir: ...", "görev: ..."
    const idea=raw.match(/^(?:jarvis[,.]?\s*)?(?:fikir|fikrim)\s*[:,-]?\s*(.+)$/i)
    if(idea?.[1]){
      const ok=addJarvisMemory(idea[1],'idea')
      const x=ok?'Fikri kaydettim Mustafa. Hafızaya yazıldığını doğruladım.':'Fikri hafızaya yazamadım.'
      setReply(x); speak(x); return true
    }
    const task=raw.match(/^(?:jarvis[,.]?\s*)?(?:görev|gorev|yapılacak|yapilacak)\s*[:,-]?\s*(.+)$/i)
    if(task?.[1]){
      const ok=addJarvisMemory(task[1],'task')
      const x=ok?'Görevi kaydettim Mustafa. Hafızaya yazıldığını doğruladım.':'Görevi hafızaya yazamadım.'
      setReply(x); speak(x); return true
    }

    if(/neleri hatırlıyorsun|neleri hatirliyorsun|ne hatırlıyorsun|ne hatirliyorsun|hafızanda ne var|hafizanda ne var|hafızayı göster|hafizayi goster|fikirlerim neler|görevlerim neler|gorevlerim neler/.test(cq)){
      const x=jarvisMemoryReport()
      setReply(x); speak(x); return true
    }

    // APP LAUNCHER V4.0.3 — Turkish suffix tolerant: YouTube'u, Instagram'ı, Spotify'ı...
    if(hasOpenIntent(cq)){
      const site=SITE_ACTIONS.find(s=>s.names.some(n=>{
        const name=normalize(n)
        return cq.includes(name) || cq.replace(/['’]/g,'').includes(name)
      }))
      if(site){
        launchApp(site)
        const x=`${site.label} uygulaması açılıyor.`
        setReply(x); speak(x); return true
      }
    }

    if(/saat kaç|saati söyle|saat nedir/.test(q)){
      const x=`Saat ${time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}.`
      setReply(x); speak(x); return true
    }
    if(/bugünün tarihi|tarih ne|hangi gün/.test(q)){
      const x=`Bugün ${dateText}.`
      setReply(x); speak(x); return true
    }

    const yt=cq.match(/(?:youtube(?:'?(?:da|de))?\s+)(.+?)(?:\s+(?:ara|bul|aç|ac))?$/i)
    if(yt?.[1]){
      const term=stripAction(yt[1])
      openExternal(`https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`)
      setReply(`YouTube'da “${term}” aranıyor.`); return true
    }
    const gg=q.match(/(?:google(?:'da|da)?\s+)(.+?)(?:\s+(?:ara|bul))?$/i)
    if(gg?.[1]){
      const term=stripAction(gg[1])
      openExternal(`https://www.google.com/search?q=${encodeURIComponent(term)}`)
      setReply(`Google'da “${term}” aranıyor.`); return true
    }
    const sp=q.match(/(?:spotify(?:'da|da)?\s+)(.+?)(?:\s+(?:ara|bul|çal|cal))?$/i)
    if(sp?.[1]){
      const term=stripAction(sp[1])
      openExternal(`https://open.spotify.com/search/${encodeURIComponent(term)}`)
      setReply(`Spotify'da “${term}” açılıyor.`); return true
    }
    const mp=q.match(/(?:haritada|haritalarda|google maps(?:'te|te)?)\s+(.+?)(?:\s+(?:ara|bul))?$/i)
    if(mp?.[1]){
      const term=stripAction(mp[1])
      openExternal(`https://www.google.com/maps/search/${encodeURIComponent(term)}`)
      setReply(`Haritalarda “${term}” aranıyor.`); return true
    }

    const domain=raw.match(/\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|ai|dev|app)(?:\/\S*)?)\b/i)
    if(domain && /\b(aç|ac)\b/i.test(q)){
      const url=/^https?:\/\//i.test(domain[1])?domain[1]:`https://${domain[1]}`
      openExternal(url); setReply(`${domain[1]} açılıyor.`); return true
    }
    return false
  }

  async function askJarvis(text){
    const clean=text.trim()
    if(!clean || loading) return
    setCommand('')
    if(localAction(clean)) return
    setLoading(true)
    setReply('İşleniyor…')
    try{
      const r=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:clean,
          memory:jarvisMemoryContext()
        })
      })
      const data=await r.json()
      if(!r.ok) throw new Error(data?.error || 'API hatası')
      const answer=data.reply || data.message || data.text || 'Yanıt alınamadı.'
      setReply(answer)
      speak(answer)
    }catch(e){
      console.error(e)
      setReply('Bağlantıda bir sorun oluştu. Gemini Core ve API bağlantısını kontrol et.')
    }finally{
      setLoading(false)
    }
  }

  function startConversation(){
    const SR=window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){ setReply('Bu tarayıcı ses tanımayı desteklemiyor.'); return }
    if(speaking) window.speechSynthesis?.cancel()
    try{ recognitionRef.current?.abort() }catch{}
    const recognition=new SR()
    recognition.lang='tr-TR'
    recognition.continuous=false
    recognition.interimResults=false
    recognitionRef.current=recognition
    conversationModeRef.current=true
    recognition.onstart=()=>setListening(true)
    recognition.onresult=(e)=>{
      const transcript=e.results?.[0]?.[0]?.transcript || ''
      setCommand(transcript)
      setListening(false)
      askJarvis(transcript)
    }
    recognition.onerror=()=>setListening(false)
    recognition.onend=()=>setListening(false)
    recognition.start()
  }

  const state = listening ? 'listening' : loading ? 'thinking' : speaking ? 'speaking' : 'idle'
  const stateLabel = listening ? 'DİNLİYORUM' : loading ? 'DÜŞÜNÜYORUM' : speaking ? 'KONUŞUYORUM' : 'ONLINE'

  return (
    <main className={`jarvis theme-${theme} state-${state}`}>
      <div className="spaceBackdrop" aria-hidden="true">
        <div className="nebula nebulaA"/><div className="nebula nebulaB"/><div className="nebula nebulaC"/>
        <div className="stars starsFar"/><div className="stars starsMid"/><div className="stars starsNear"/>
        <div className="cosmicDust">{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i}}/>)}</div>
        <div className="shootingStar ss1"/><div className="shootingStar ss2"/>
      </div>
      <div className="bg-grid"/><div className="scan"/><div className="noise"/>
      <header className="topbar glass">
        <div className="brand"><span className="brandMark">J</span><div><b>JARVIS</b><small>AI PERSONAL ASSISTANT</small></div></div>
        <div className="topStatus"><i/> CORE ONLINE <span>•</span> TR-TR <span>•</span> V4.0.3</div>
        <div className="themeWrap">
          <button className="themeTrigger" onClick={()=>setThemeOpen(v=>!v)}>
            <span>◈</span><div><b>{currentTheme.name}</b><small>{currentTheme.sub}</small></div><em>⌄</em>
          </button>

        </div>
      </header>

      {themeOpen && <div className="themeMenu themeMenuGlobal glass">
        <div className="themeTitle">ARAYÜZ PROFİLİ <button onClick={()=>setThemeOpen(false)}>×</button></div>
        <div className="themeGrid">
          {THEMES.map(t=><button key={t.id} className={theme===t.id?'active':''} onClick={()=>{setTheme(t.id);setThemeOpen(false)}}>
            <span className="themeDot"/><b>{t.name}</b><small>{t.sub}</small>
          </button>)}
        </div>
      </div>}

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
          <div className="galaxyCloud gc1"/><div className="galaxyCloud gc2"/>
          <div className="stageStars layer1"/><div className="stageStars layer2"/><div className="stageStars layer3"/>
          <div className="planet planetA"><i/></div>
          <div className="planet planetB"><i/></div>
          <div className="planet planetC"><i/></div>
          <div className="meteor meteor1"/><div className="meteor meteor2"/><div className="meteor meteor3"/>
          <div className="spaceHorizon"/>
          <div className="stageDust">{Array.from({length:22},(_,i)=><i key={i} style={{'--i':i}}/>)}</div>
        </div>
        <div className="corner c1"/><div className="corner c2"/><div className="corner c3"/><div className="corner c4"/>
        <div className="stageTitle"><b>{currentTheme.name.toUpperCase()}</b><small>{currentTheme.sub.toUpperCase()}</small></div>
        <div className="telemetry leftT">01 // CORE<br/>SIGNAL STABLE</div>
        <div className="telemetry rightT">NEURAL LINK<br/>98.7% SECURE</div>

        <div className="energy" aria-label={`JARVIS ${stateLabel}`}>
          <div className="halo h1"/><div className="halo h2"/><div className="halo h3"/>
          <div className="orbit o1"><i/><i/><i/></div>
          <div className="orbit o2"><i/><i/><i/><i/></div>
          <div className="energyTrails">
            {Array.from({length:14},(_,i)=><i key={i} style={{'--i':i}}/>)}
          </div>
          <div className="plasma"><span/><span/><span/><span/><span/></div>
          <div className="core"><i/><span className="coreSpark"/><span className="coreSpark s2"/><span className="coreSpark s3"/></div>
          <div className="pulse p1"/><div className="pulse p2"/>
        </div>

        <div className="reply glass">
          <div className="replyIcon">J</div>
          <div className="replyText"><b>JARVIS // {stateLabel}</b><p>{reply}</p></div>
          <div className={`wave ${speaking||listening?'active':''}`}>{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i}}/>)}</div>
        </div>

        <div className="quickRow">
          {QUICK.slice(0,5).map(([ic,n,u])=><button key={n} className="quickButton" onClick={()=>{const a=appByName(n);a?launchApp(a,u):openExternal(u)}}><span>{ic}</span><b>{n}</b><i/></button>)}
        </div>

        <form className="commandBar glass" onSubmit={e=>{e.preventDefault();askJarvis(command)}}>
          <button type="button" className={`mic ${listening?'active':''}`} onClick={startConversation}>◉</button>
          <input className="commandInput" value={command} onChange={e=>setCommand(e.target.value)} placeholder={listening?'Seni dinliyorum…':'Komutunu söyle veya yaz…'}/>
          <button className="send" disabled={!command.trim()||loading}>➤</button>
        </form>
      </section>

      <aside className="rightRail">
        <div className="clockCard glass"><b>{timeText}</b><small>{dateText}</small></div>
        <div className="systemCard glass"><h3>SİSTEM DURUMU</h3>
          <p><i/>AI Core <b>Online</b></p><p><i/>Mikrofon <b>{listening?'Dinliyor':'Hazır'}</b></p>
          <p><i/>API Link <b>Bağlı</b></p><p><i/>Ses Motoru <b>{speaking?'Aktif':'Hazır'}</b></p>
        </div>
        <div className="accessCard glass"><h3>HIZLI ERİŞİM</h3><div>
          {QUICK.map(([ic,n,u])=><button key={n} className="accessButton" onClick={()=>{const a=appByName(n);a?launchApp(a,u):openExternal(u)}}><span>{ic}</span><small>{n}</small><i/></button>)}
        </div></div>
      </aside>
    </main>
  )
}
export default App
