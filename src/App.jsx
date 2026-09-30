import { useEffect, useRef, useState } from 'react'
import './App.css'

const THEMES = [
  { id:'jarvis', name:'JARVIS', sub:'Premium' },
  { id:'future', name:'Kırmızı Beyaz', sub:'Crimson Ice' },
  { id:'military', name:'Sarı Siyah', sub:'Black Gold' },
  { id:'hacker', name:'Kırmızı Siyah', sub:'Red Core' },
  { id:'cyberpunk', name:'Sarı Kırmızı', sub:'Solar Flare' },
  { id:'space', name:'Altın Gece', sub:'Dark Luxury' },
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
  return {memories:[],projects:[],ideas:[],tasks:[],preferences:[]}
}

function loadJarvisMemory(){
  try{
    const raw=window.localStorage.getItem(JARVIS_MEMORY_KEY)
    if(!raw) return emptyJarvisMemory()
    const data=JSON.parse(raw)
    return {
      memories:Array.isArray(data.memories)?data.memories:[],
      projects:Array.isArray(data.projects)?data.projects:[],
      ideas:Array.isArray(data.ideas)?data.ideas:[],
      tasks:Array.isArray(data.tasks)?data.tasks:[],
      preferences:Array.isArray(data.preferences)?data.preferences:[]
    }
  }catch(e){
    console.error('Memory read error:',e)
    return emptyJarvisMemory()
  }
}

function saveJarvisMemory(data){
  try{
    window.localStorage.setItem(JARVIS_MEMORY_KEY,JSON.stringify(data))
    return !!window.localStorage.getItem(JARVIS_MEMORY_KEY)
  }catch(e){
    console.error('Memory write error:',e)
    return false
  }
}

function memoryBucket(type='memory'){
  return {
    memory:'memories',
    project:'projects',
    idea:'ideas',
    task:'tasks',
    preference:'preferences'
  }[type] || 'memories'
}

function addJarvisMemory(text,type='memory'){
  const value=String(text||'').trim()
  if(!value) return {ok:false,duplicate:false}

  const data=loadJarvisMemory()
  const bucket=memoryBucket(type)
  const normalizedValue=commandText(value)

  // V4.2: exact/near duplicate protection.
  const duplicate=data[bucket].some(x=>commandText(x.text)===normalizedValue)
  if(duplicate) return {ok:true,duplicate:true}

  data[bucket].unshift({
    id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    text:value,
    type,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  })

  if(!saveJarvisMemory(data)) return {ok:false,duplicate:false}
  const check=loadJarvisMemory()
  return {ok:check[bucket].some(x=>commandText(x.text)===normalizedValue),duplicate:false}
}

const MEMORY_STOP_WORDS=new Set([
  'jarvis','bunu','şunu','sunu','bu','şu','su','bir','ve','ile','için','icin',
  'kaydı','kaydi','kaydını','kaydini','kayıt','kayit','hafıza','hafiza',
  'sil','unut','taşı','tasi','aktar','bölümüne','bolumune'
])

function memoryTokens(text=''){
  return commandText(text)
    .replace(/['’]/g,'')
    .split(/\s+/)
    .map(x=>x.trim())
    .filter(x=>x.length>2 && !MEMORY_STOP_WORDS.has(x))
}

function memoryMatchScore(recordText,query){
  const record=commandText(recordText)
  const needle=commandText(query)
  if(!record || !needle) return 0
  if(record.includes(needle) || needle.includes(record)) return 100

  const qTokens=memoryTokens(needle)
  const rTokens=new Set(memoryTokens(record))
  if(!qTokens.length) return 0

  const hits=qTokens.filter(t=>rTokens.has(t)).length
  return hits/qTokens.length
}

function findBestMemoryMatch(data,term){
  let best=null
  for(const key of ['memories','projects','ideas','tasks','preferences']){
    data[key].forEach((item,index)=>{
      const score=memoryMatchScore(item.text,term)
      if(!best || score>best.score) best={key,index,item,score}
    })
  }
  // Require either direct containment (100) or at least half of meaningful query tokens.
  return best && (best.score===100 || best.score>=0.5) ? best : null
}

function removeJarvisMemory(term){
  const data=loadJarvisMemory()
  const match=findBestMemoryMatch(data,term)
  if(!match) return 0
  data[match.key].splice(match.index,1)
  return saveJarvisMemory(data) ? 1 : 0
}

function moveJarvisMemory(term,targetType='memory'){
  const data=loadJarvisMemory()
  const target=memoryBucket(targetType)
  const match=findBestMemoryMatch(data,term)

  if(!match) return false

  const moved=data[match.key].splice(match.index,1)[0]
  const exists=data[target].some(x=>commandText(x.text)===commandText(moved.text))

  if(!exists){
    data[target].unshift({
      ...moved,
      type:targetType,
      updatedAt:new Date().toISOString()
    })
  }

  return saveJarvisMemory(data)
}

function detectMemoryType(text=''){
  const q=commandText(text)
  if(/\b(proje|projem|projesi|project)\b/i.test(q)) return 'project'
  if(/\b(fikir|fikrim|fikirler)\b/i.test(q)) return 'idea'
  if(/\b(görev|gorev|yapılacak|yapilacak|yapmam gerek|hatırlatılacak|hatirlatilacak|gerekiyor|gerekli|lazım|lazim|yapmalıyım|yapmaliyim|etmeliyim|bakmalıyım|bakmaliyim|kontrol etmeliyim|test etmeliyim|unutmamalıyım|unutmamaliyim)\b/i.test(q)) return 'task'
  if(/\b(tercih|tercihim|seviyorum|sevmiyorum|hoşuma gidiyor|hosuma gidiyor|favorim|isterim|istemem)\b/i.test(q)) return 'preference'
  return 'memory'
}

function typeLabel(type='memory'){
  return {
    memory:'Bilgiyi',
    project:'Projeyi',
    idea:'Fikri',
    task:'Görevi',
    preference:'Tercihi'
  }[type] || 'Bilgiyi'
}

function jarvisMemoryContext(){
  const data=loadJarvisMemory()
  return [
    ...data.memories.slice(0,20).map(x=>`HAFIZA: ${x.text}`),
    ...data.projects.slice(0,20).map(x=>`PROJE: ${x.text}`),
    ...data.ideas.slice(0,20).map(x=>`FIKIR: ${x.text}`),
    ...data.tasks.slice(0,20).map(x=>`GOREV: ${x.text}`),
    ...data.preferences.slice(0,20).map(x=>`TERCIH: ${x.text}`)
  ].join('\n')
}

function jarvisMemoryReport(){
  const data=loadJarvisMemory()
  const section=(title,arr)=>arr.length
    ? `${title}:\n${arr.slice(0,10).map((x,i)=>`${i+1}. ${x.text}`).join('\n')}`
    : `${title}: kayıt yok.`
  return [
    section('Hafıza',data.memories),
    section('Projeler',data.projects),
    section('Fikirler',data.ideas),
    section('Görevler',data.tasks),
    section('Tercihler',data.preferences)
  ].join('\n\n')
}
// ======================================================
// JARVIS V5.2 // MULTI-AGENT VOICE CORE
// DİLAN = COMMAND
// LARA  = RESEARCH
// VERA  = ENGINEERING
// ======================================================

const AGENT_PROFILES = {
  jarvis: {
      id: 'jarvis',
          name: 'DİLAN',
              role: 'COMMAND CORE',

                  // Dilan: daha tok, sakin ve otoriter
                      rate: 1.02,
                          pitch: 0.88,
                              volume: 1,

                                  voiceIndex: 0
                                    },

                                      atlas: {
                                          id: 'atlas',
                                              name: 'LARA',
                                                  role: 'RESEARCH CORE',

                                                      // Lara: daha sakin, berrak ve yumuşak
                                                          rate: 0.96,
                                                              pitch: 1.08,
                                                                  volume: 1,

                                                                      voiceIndex: 1
                                                                        },

                                                                          nexus: {
                                                                              id: 'nexus',
                                                                                  name: 'VERA',
                                                                                      role: 'ENGINEERING CORE',

                                                                                          // Vera: daha enerjik ve hızlı
                                                                                              rate: 1.12,
                                                                                                  pitch: 1.18,
                                                                                                      volume: 1,

                                                                                                          voiceIndex: 2
                                                                                                            }
                                                                                                            }


                                                                                                            function getAgentProfile(speaker = 'jarvis') {
                                                                                                              const id = String(speaker || 'jarvis').toLowerCase()

                                                                                                                return AGENT_PROFILES[id] || AGENT_PROFILES.jarvis
                                                                                                                }


                                                                                                                function getTurkishVoices() {
                                                                                                                  if (!('speechSynthesis' in window)) return []

                                                                                                                    const voices = window.speechSynthesis.getVoices()

                                                                                                                      const turkish = voices.filter(voice => {
                                                                                                                          const lang = String(voice.lang || '').toLowerCase()
                                                                                                                              const name = String(voice.name || '').toLowerCase()

                                                                                                                                  return (
                                                                                                                                        lang.startsWith('tr') ||
                                                                                                                                              name.includes('turkish') ||
                                                                                                                                                    name.includes('türk')
                                                                                                                                                        )
                                                                                                                                                          })

                                                                                                                                                            return turkish.length ? turkish : voices
                                                                                                                                                            }


                                                                                                                                                            function selectAgentVoice(agent) {
                                                                                                                                                              const voices = getTurkishVoices()

                                                                                                                                                                if (!voices.length) return null

                                                                                                                                                                  /*
                                                                                                                                                                      Cihazda birden fazla Türkçe ses varsa:
                                                                                                                                                                          Dilan -> 1. ses
                                                                                                                                                                              Lara  -> 2. ses
                                                                                                                                                                                  Vera  -> 3. ses

                                                                                                                                                                                      Yeterli Türkçe ses yoksa mevcut sesler
                                                                                                                                                                                          arasında güvenli şekilde döner.
                                                                                                                                                                                            */

                                                                                                                                                                                              const index = agent.voiceIndex % voices.length

                                                                                                                                                                                                return voices[index] || voices[0]
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

function speak(text, speaker = 'jarvis'){
  if(!('speechSynthesis' in window) || !text) return

  window.speechSynthesis.cancel()

  const spokenText = cleanForSpeech(text)
  if(!spokenText) return

  const agent = getAgentProfile(speaker)
  const voice = selectAgentVoice(agent)

  const speech = new SpeechSynthesisUtterance(spokenText)

  if(voice){
    speech.voice = voice
    speech.lang = voice.lang || 'tr-TR'
  }else{
    speech.lang = 'tr-TR'
  }

  speech.rate = agent.rate
  speech.pitch = agent.pitch
  speech.volume = agent.volume

  speech.onstart = () => {
    console.log(
      `🎙️ ${agent.name} konuşuyor`,
      voice ? `// ${voice.name}` : '// Varsayılan ses'
    )
    setSpeaking(true)
  }

  speech.onend = () => {
    setSpeaking(false)

    if(conversationModeRef.current){
      setTimeout(startConversation,450)
    }
  }

  speech.onerror = (event) => {
    console.error(`${agent.name} Voice Core hatası:`,event)
    setSpeaking(false)
  }

  window.speechSynthesis.speak(speech)
}

  async function speakTurns(turns=[]){
    if(!('speechSynthesis' in window) || !Array.isArray(turns) || !turns.length) return

    window.speechSynthesis.cancel()
    setSpeaking(true)

    try{
      for(const turn of turns){
        const text=String(turn?.text || turn?.reply || '').trim()
        if(!text) continue

        const speaker=String(turn?.speaker || 'jarvis').toLowerCase()
        const agent=getAgentProfile(speaker)
        const voice=selectAgentVoice(agent)
        const spokenText=cleanForSpeech(text)
        if(!spokenText) continue

        await new Promise((resolve)=>{
          const speech=new SpeechSynthesisUtterance(spokenText)

          if(voice){
            speech.voice=voice
            speech.lang=voice.lang || 'tr-TR'
          }else{
            speech.lang='tr-TR'
          }

          speech.rate=agent.rate
          speech.pitch=agent.pitch
          speech.volume=agent.volume

          speech.onstart=()=>console.log(`🎙️ ${agent.name} konuşuyor`)
          speech.onend=resolve
          speech.onerror=(event)=>{
            console.error(`${agent.name} Voice Core hatası:`,event)
            resolve()
          }

          window.speechSynthesis.speak(speech)
        })
      }
    }finally{
      setSpeaking(false)
      if(conversationModeRef.current) setTimeout(startConversation,450)
    }
  }

  function localAction(raw){
    const q=normalize(raw)
    const cq=commandText(raw)
    if(!q) return true

    // MEMORY CORE V4.2 — categorized, duplicate-safe, natural Turkish commands.
    const memoryCue=/(?:\bhatırla\b|\bhatirla\b|\bkaydet\b|hafızana\s+(?:al|kaydet)|hafizana\s+(?:al|kaydet)|\bunutma\b)/i
    const isForget=/(?:\bunut\b|\bsil\b)/i.test(cq) && !/\bunutma\b/i.test(cq)

    // V4.2.1: move an existing record between memory categories.
    const moveMatch=cq.match(/(?:kaydını|kaydi|bunu|şunu|sunu)?\s*(.+?)\s+(?:kaydını\s+|kaydi\s+)?(?:görevlere|gorevlere|projelere|fikirlere|tercihlere|hafızaya|hafizaya)\s+(?:taşı|tasi|aktar)$/i)
    if(moveMatch?.[1]){
      const phrase=moveMatch[1]
        .replace(/^jarvis\s*/i,'')
        .replace(/^(?:kaydını|kaydi|bunu|şunu|sunu)\s*/i,'')
        .trim()
      const target=/görev|gorev/.test(cq)?'task'
        :/proje/.test(cq)?'project'
        :/fikir/.test(cq)?'idea'
        :/tercih/.test(cq)?'preference'
        :'memory'
      const ok=moveJarvisMemory(phrase,target)
      const x=ok
        ? `Kaydı ${target==='task'?'Görevler':target==='project'?'Projeler':target==='idea'?'Fikirler':target==='preference'?'Tercihler':'Hafıza'} bölümüne taşıdım Mustafa.`
        : 'Taşımak istediğin kaydı bulamadım Mustafa.'
      setReply(x); speak(x); return true
    }

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
        .trim()

      if(value){
        const type=detectMemoryType(value)
        const result=addJarvisMemory(value,type)
        const x=!result.ok
          ? 'Hafızaya yazamadım Mustafa. Tarayıcı depolamasını kontrol etmemiz gerekiyor.'
          : result.duplicate
            ? `${typeLabel(type)} zaten hafızamda Mustafa. Tekrar kaydetmedim.`
            : `${typeLabel(type)} kaydettim Mustafa. ${type==='memory'?'Hafıza':type==='project'?'Projeler':type==='idea'?'Fikirler':type==='task'?'Görevler':'Tercihler'} bölümüne işlendi.`
        setReply(x); speak(x); return true
      }
    }

    // Short explicit forms: "proje: ...", "fikir: ...", "görev: ...", "tercih: ..."
    const explicit=raw.match(/^(?:jarvis[,.]?\s*)?(proje|projem|fikir|fikrim|görev|gorev|yapılacak|yapilacak|tercih|tercihim)\s*[:,-]?\s*(.+)$/i)
    if(explicit?.[2]){
      const head=commandText(explicit[1])
      const type=/proje/.test(head)?'project':/fikir/.test(head)?'idea':/(görev|gorev|yapılacak|yapilacak)/.test(head)?'task':'preference'
      const result=addJarvisMemory(explicit[2],type)
      const x=!result.ok
        ? `${typeLabel(type)} hafızaya yazamadım.`
        : result.duplicate
          ? `${typeLabel(type)} zaten hafızamda Mustafa.`
          : `${typeLabel(type)} kaydettim Mustafa.`
      setReply(x); speak(x); return true
    }

    if(/neleri hatırlıyorsun|neleri hatirliyorsun|ne hatırlıyorsun|ne hatirliyorsun|hafızanda ne var|hafizanda ne var|hafızayı göster|hafizayi goster|projelerim neler|fikirlerim neler|görevlerim neler|gorevlerim neler|tercihlerim neler/.test(cq)){
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
      if(Array.isArray(data.turns) && data.turns.length){
        const visibleNames={jarvis:'DİLAN',atlas:'LARA',nexus:'VERA'}
        const transcript=data.turns
          .map(turn=>`${visibleNames[String(turn?.speaker || '').toLowerCase()] || 'AI'}: ${turn?.text || ''}`)
          .join('\n\n')

        console.log('🧠 Multi-Speaker:',data.turns.map(turn=>turn.speaker).join(' → '))
        setReply(transcript)
        await speakTurns(data.turns)
      }else{
        const answer=data.reply || data.message || data.text || 'Yanıt alınamadı.'
        const speaker=String(data.speaker || 'jarvis').toLowerCase()

        console.log('🧠 Aktif ajan:',speaker)

        setReply(answer)
        speak(answer,speaker)
      }
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
        <div className="topStatus"><i/> CORE ONLINE <span>•</span> TR-TR <span>•</span> V4.8.0</div>
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
          <div className="themeWorld" aria-hidden="true">
            <div className="worldLayer worldBack"/><div className="worldLayer worldMid"/><div className="worldLayer worldFront"/>
            <div className="worldGlyphs"/>
            <div className="sceneArt">
              <div className="labWall"/><div className="labTower t1"/><div className="labTower t2"/>
              <div className="serverRack r1"/><div className="serverRack r2"/><div className="codeCurtain"/>
              <div className="citySkyline"/><div className="cityRoad"/>
              <div className="radarDish"/><div className="tacticalMap"/>
              <div className="hangarDoor"/><div className="laserScan"/>
              <div className="quantumTunnel"/><div className="dnaHelix"/>
              <div className="holoPanel hp1"/><div className="holoPanel hp2"/>
            </div>
          </div>
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
