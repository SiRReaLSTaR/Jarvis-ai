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
  { names:['youtube'], url:'https://www.youtube.com', label:'YouTube' },
  { names:['google'], url:'https://www.google.com', label:'Google' },
  { names:['spotify'], url:'https://open.spotify.com', label:'Spotify' },
  { names:['instagram'], url:'https://www.instagram.com', label:'Instagram' },
  { names:['facebook'], url:'https://www.facebook.com', label:'Facebook' },
  { names:['twitter','x.com'], url:'https://x.com', label:'X' },
  { names:['github'], url:'https://github.com', label:'GitHub' },
  { names:['gmail'], url:'https://mail.google.com', label:'Gmail' },
  { names:['google maps','haritalar','harita'], url:'https://maps.google.com', label:'Google Maps' },
  { names:['google drive','drive'], url:'https://drive.google.com', label:'Google Drive' },
  { names:['google takvim','takvim'], url:'https://calendar.google.com', label:'Google Takvim' },
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
const stripAction = (s='') => s
  .replace(/\s+(ara|arar mısın|arar misin|bul|bulur musun|aç|ac|açar mısın|acar misin)\s*$/i,'')
  .trim()

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
    const w=window.open(url,'_blank')
    if(w) w.opener=null
  }

  function speak(text){
    if(!('speechSynthesis' in window) || !text) return
    window.speechSynthesis.cancel()
    const speech=new SpeechSynthesisUtterance(text)
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
    if(!q) return true

    if(/saat kaç|saati söyle|saat nedir/.test(q)){
      const x=`Saat ${time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}.`
      setReply(x); speak(x); return true
    }
    if(/bugünün tarihi|tarih ne|hangi gün/.test(q)){
      const x=`Bugün ${dateText}.`
      setReply(x); speak(x); return true
    }

    const yt=q.match(/(?:youtube(?:'da|da)?\s+)(.+?)(?:\s+(?:ara|bul|aç|ac))?$/i)
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

    if(/\b(aç|ac|açar mısın|acar misin)\b/i.test(q)){
      const site=SITE_ACTIONS.find(s=>s.names.some(n=>q.includes(n)))
      if(site){ openExternal(site.url); setReply(`${site.label} açılıyor.`); return true }
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
        body:JSON.stringify({message:clean})
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
        <div className="topStatus"><i/> CORE ONLINE <span>•</span> TR-TR</div>
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
          ['G','Google Ara',()=>openExternal('https://www.google.com')],
          ['▶','YouTube Aç',()=>openExternal('https://www.youtube.com')],
          ['♫','Spotify Çal',()=>openExternal('https://open.spotify.com')],
          ['✦','Harita Ara',()=>openExternal('https://maps.google.com')],
          ['◉','Saat / Tarih',()=>{const x=`Saat ${timeText}. ${dateText}.`;setReply(x);speak(x)}],
          ['✉','E-posta Aç',()=>openExternal('https://mail.google.com')],
          ['▣','Takvim Aç',()=>openExternal('https://calendar.google.com')],
        ].map(([ic,tx,fn])=><button key={tx} className="hudButton" onClick={fn}><span>{ic}</span><b>{tx}</b><i/></button>)}
      </aside>

      <section className="stage glass">
        <div className="stageSpace" aria-hidden="true">
          <div className="galaxyCloud gc1"/><div className="galaxyCloud gc2"/>
          <div className="stageStars layer1"/><div className="stageStars layer2"/><div className="stageStars layer3"/>
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
          {QUICK.slice(0,5).map(([ic,n,u])=><button key={n} className="quickButton" onClick={()=>openExternal(u)}><span>{ic}</span><b>{n}</b><i/></button>)}
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
          {QUICK.map(([ic,n,u])=><button key={n} className="accessButton" onClick={()=>openExternal(u)}><span>{ic}</span><small>{n}</small><i/></button>)}
        </div></div>
      </aside>
    </main>
  )
}
export default App
