import { useEffect, useRef, useState } from 'react'
import './App.css'

const SITE_ACTIONS = [
  { names:['youtube'], label:'YouTube', web:'https://www.youtube.com', ios:'youtube://', android:'vnd.youtube://' },
  { names:['google'], label:'Google', web:'https://www.google.com', ios:'google://', android:'googlechrome://' },
  { names:['spotify'], label:'Spotify', web:'https://open.spotify.com', ios:'spotify://', android:'spotify://' },
  { names:['instagram','ınstagram','insta gram','ınsta gram'], label:'Instagram', web:'https://www.instagram.com', ios:'instagram://app', android:'instagram://app' },
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


// TABLET APPLICATION REGISTRY
const TABLET_APPS = [
  {
    "label": "YouTube",
    "names": [
      "youtube",
      "you tube"
    ],
    "target": "intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end"
  },
  {
    "label": "Instagram",
    "names": [
      "instagram",
      "ınstagram",
      "insta gram"
    ],
    "target": "intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;end"
  },
  {
    "label": "WhatsApp",
    "names": [
      "whatsapp",
      "whats app",
      "vatsap"
    ],
    "target": "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.whatsapp;end"
  },
  {
    "label": "Telegram",
    "names": [
      "telegram"
    ],
    "target": "tg://"
  },
  {
    "label": "Discord",
    "names": [
      "discord",
      "diskord"
    ],
    "target": "discord://"
  },
  {
    "label": "TikTok",
    "names": [
      "tiktok",
      "tik tok"
    ],
    "target": "intent://www.tiktok.com/#Intent;scheme=https;package=com.zhiliaoapp.musically;end"
  },
  {
    "label": "ChatGPT",
    "names": [
      "chatgpt",
      "chat gpt",
      "çat gpt"
    ],
    "target": "intent://chatgpt.com/#Intent;scheme=https;package=com.openai.chatgpt;end"
  },
  {
    "label": "Gemini",
    "names": [
      "gemini",
      "cemini"
    ],
    "target": "intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;end"
  },
  {
    "label": "GitHub",
    "names": [
      "github",
      "git hub"
    ],
    "target": "intent://github.com/#Intent;scheme=https;package=com.github.android;end"
  },
  {
    "label": "Pinterest",
    "names": [
      "pinterest"
    ],
    "target": "intent://www.pinterest.com/#Intent;scheme=https;package=com.pinterest;end"
  },
  {
    "label": "Prime Video",
    "names": [
      "prime video",
      "amazon prime"
    ],
    "target": "intent://www.primevideo.com/#Intent;scheme=https;package=com.amazon.avod.thirdpartyclient;end"
  },
  {
    "label": "Google",
    "names": [
      "google",
      "gugıl"
    ],
    "target": "intent://www.google.com/#Intent;scheme=https;package=com.google.android.googlequicksearchbox;end"
  },
  {
    "label": "Chrome",
    "names": [
      "chrome",
      "krom",
      "google chrome"
    ],
    "target": "intent://www.google.com/#Intent;scheme=https;package=com.android.chrome;end"
  },
  {
    "label": "Opera",
    "names": [
      "opera"
    ],
    "target": "intent://www.google.com/#Intent;scheme=https;package=com.opera.browser;end"
  },
  {
    "label": "Play Store",
    "names": [
      "play store",
      "play market",
      "google play"
    ],
    "target": "market://search?q="
  },
  {
    "label": "Keep Notları",
    "names": [
      "keep",
      "keep notları",
      "google keep"
    ],
    "target": "intent://keep.google.com/#Intent;scheme=https;package=com.google.android.keep;end"
  },
  {
    "label": "Gmail",
    "names": [
      "gmail",
      "g mail"
    ],
    "target": "intent://mail.google.com/#Intent;scheme=https;package=com.google.android.gm;end"
  },
  {
    "label": "Haritalar",
    "names": [
      "haritalar",
      "google maps",
      "harita"
    ],
    "target": "geo:0,0?q="
  },
  {
    "label": "Google Drive",
    "names": [
      "google drive",
      "drive"
    ],
    "target": "intent://drive.google.com/#Intent;scheme=https;package=com.google.android.apps.docs;end"
  },
  {
    "label": "Takvim",
    "names": [
      "takvim",
      "google takvim"
    ],
    "target": "intent://calendar.google.com/#Intent;scheme=https;package=com.google.android.calendar;end"
  },
  {
    "label": "Spotify",
    "names": [
      "spotify"
    ],
    "target": "spotify://"
  },
  {
    "label": "Ayarlar",
    "names": [
      "ayarlar"
    ],
    "target": "intent:#Intent;action=android.settings.SETTINGS;end"
  },
  {
    "label": "Kamera",
    "names": [
      "kamera"
    ],
    "target": "intent:#Intent;action=android.media.action.STILL_IMAGE_CAMERA;end"
  },
  {
    "label": "Saat",
    "names": [
      "saat",
      "alarmlar"
    ],
    "target": "intent:#Intent;action=android.intent.action.SHOW_ALARMS;end"
  },
  {
    "label": "Garanti BBVA",
    "names": [
      "garanti",
      "garanti bbva"
    ],
    "target": null
  },
  {
    "label": "MobilDeniz",
    "names": [
      "mobildeniz",
      "mobil deniz",
      "denizbank"
    ],
    "target": null
  },
  {
    "label": "İşCep",
    "names": [
      "işcep",
      "iş cep",
      "iscep"
    ],
    "target": null
  },
  {
    "label": "GSPara",
    "names": [
      "gspara",
      "gs para"
    ],
    "target": null
  },
  {
    "label": "NETV GOLD V11",
    "names": [
      "netv",
      "netv gold",
      "netv gold v11"
    ],
    "target": null
  },
  {
    "label": "VPN Super Unlimited Proxy",
    "names": [
      "vpn",
      "vpn super unlimited proxy"
    ],
    "target": null
  },
  {
    "label": "Sunday City",
    "names": [
      "sunday city"
    ],
    "target": null
  },
  {
    "label": "OneState",
    "names": [
      "onestate",
      "one state"
    ],
    "target": null
  },
  {
    "label": "Mobile Legends: Bang Bang",
    "names": [
      "mobile legends",
      "mobile legends bang bang"
    ],
    "target": null
  },
  {
    "label": "Sistem Yöneticisi",
    "names": [
      "sistem yöneticisi",
      "sistem yoneticisi"
    ],
    "target": null
  },
  {
    "label": "Flow",
    "names": [
      "flow"
    ],
    "target": null
  },
  {
    "label": "Dosyalar",
    "names": [
      "dosyalar",
      "dosya yöneticisi"
    ],
    "target": null
  },
  {
    "label": "Galeri",
    "names": [
      "galeri",
      "fotoğraflar"
    ],
    "target": null
  },
  {
    "label": "Notlar",
    "names": [
      "notlar"
    ],
    "target": null
  },
  {
    "label": "Temalar",
    "names": [
      "temalar"
    ],
    "target": null
  },
  {
    "label": "Araçlar klasörü",
    "names": [
      "araçlar",
      "araclar"
    ],
    "target": null
  },
  {
    "label": "Klasör 1",
    "names": [
      "klasör 1",
      "klasor 1"
    ],
    "target": null
  }
]

function tabletAppFromCommand(raw){
  const fold = value => commandText(value)
    .replace(/ı/g,'i').replace(/ş/g,'s')
    .replace(/ğ/g,'g').replace(/ü/g,'u')
    .replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/['’]/g,'')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim()

  const text=' '+fold(raw)+' '
  const endings=['','i','u','yi','yu','ni','nu']

  const candidates=TABLET_APPS
    .flatMap(app=>app.names.map(name=>({app,name:fold(name)})))
    .sort((a,b)=>b.name.length-a.name.length)

  return candidates.find(({name})=>
    endings.some(ending=>text.includes(' '+name+ending+' '))
  )?.app
}

const normalize = (s='') => s.toLocaleLowerCase('tr-TR').trim()

const commandText = (s='') => normalize(s)
  .replace(/[’‘`´]/g,"'")
  .replace(/[.,!?;]+/g,' ')
  .replace(/\s+/g,' ')
  .trim()

const hasOpenIntent = (s='') =>
  /(?:^|\s)(?:aç|ac|açar mısın|acar misin|açarmısın|acarmisin|açabilir misin|acabilir misin|açsana)(?=$|\s)/u.test(commandText(s))

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


const memoryBridge = { ready:false, pending:Promise.resolve() }
function authHeaders(){ return { 'Content-Type':'application/json', ...(sessionStorage.getItem('jarvis-access') ? {Authorization:`Bearer ${sessionStorage.getItem('jarvis-access')}`} : {}) } }
async function api(path, options={}) {
  const response = await fetch(path, {...options, headers:authHeaders()})
  const data = await response.json()
  if(!response.ok) throw new Error(data.error || 'Bağlantı hatası')
  return data
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
    if(memoryBridge.ready) memoryBridge.pending = memoryBridge.pending.catch(()=>{}).then(()=>api('/api/memory',{method:'PUT',body:JSON.stringify(data)}))
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
  function stopVoice(){
    conversationModeRef.current=false; voiceGeneration.current++
    recognitionRef.current?.abort(); window.speechSynthesis?.cancel()
    setListening(false); setSpeaking(false)
  }
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
  const [reply,setReply] = useState('Sistemler çevrimiçi. Komutunu bekliyorum Mustafa.')
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

  function openExternal(url){
    // Tek açılış; ikinci bir yönlendirme yapma.
    const link=document.createElement('a')
    link.href=url
    link.target='_blank'
    link.rel='noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function launchApp(app, fallbackUrl){
    const label=app?.label
    const web=fallbackUrl || app?.web

    // Bu Android tablette masaüstü modu açık olsa da
    // YouTube ve Instagram doğrudan uygulamaya gitsin.
    const nativeTargets={
      YouTube:'intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end',
      Instagram:'intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;end'
    }

    const isAndroid=/Android/i.test(navigator.userAgent)
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)

    const target=nativeTargets[label] ||
      (isAndroid ? app?.android : isIOS ? app?.ios : null)

    const destination=target || web
    if(!destination) return

    const now=Date.now()
    if(lastLaunchRef.current.target===destination &&
       now-lastLaunchRef.current.time<3000) return
    lastLaunchRef.current={target:destination,time:now}

    // Uygulama açılırken dinleme döngüsünü durdur.
    conversationModeRef.current=false
    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
    setListening(false)
    setSpeaking(false)

    if(target){
      window.location.assign(target)
      return
    }

    openExternal(web)
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
    setActiveSpeaker(speaker)
    console.log(
      `🎙️ ${agent.name} konuşuyor`,
      voice ? `// ${voice.name}` : '// Varsayılan ses'
    )
    setSpeaking(true)
  }

  speech.onend = () => {
    setSpeaking(false)

    if(conversationModeRef.current){
      setTimeout(()=>{if(conversationModeRef.current)startConversation()},450)
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
    const generation=voiceGeneration.current

    try{
      for(const turn of turns){
        if(generation!==voiceGeneration.current) break
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

          speech.onstart=()=>{setActiveSpeaker(speaker);setSpeaking(true);console.log(`🎙️ ${agent.name} konuşuyor`)}
          const watcher=setInterval(()=>{if(generation!==voiceGeneration.current){clearInterval(watcher);resolve()}},100)
          speech.onend=()=>{clearInterval(watcher);resolve()}
          speech.onerror=(event)=>{
            console.error(`${agent.name} Voice Core hatası:`,event)
            clearInterval(watcher);resolve()
          }

          window.speechSynthesis.speak(speech)
        })
      }
    }finally{
      setSpeaking(false)
      if(conversationModeRef.current) setTimeout(()=>{if(conversationModeRef.current)startConversation()},450)
    }
  }

  function localAction(raw){
    if(hasOpenIntent(raw)){
      const app=tabletAppFromCommand(raw)
      if(app){
        if(!app.target){
          setReply(`${app.label} listeye eklendi; ancak bu uygulamanın doğrulanmış açılış bağlantısı henüz tanımlı değil.`)
          return true
        }
        launchApp({
          label:app.label,
          android:app.target,
          ios:app.target
        })
        setReply(`${app.label} için uygulama açma isteği gönderildi.`)
        return true
      }
    }

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
      setReply(e.message || 'Bağlantıda sorun oluştu.')
    }finally{
      setLoading(false)
      refreshState()
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


        <div className="agentScene">
          {[
            ['atlas','LARA','ARAŞTIRMA'],
            ['jarvis','DİLAN','KOORDİNATÖR'],
            ['nexus','VERA','MÜHENDİSLİK']
          ].map(([id,name,role])=>(
            <div className={`agentPod agent-${id}${speaking && activeSpeaker===id ? ' isSpeaking' : ''}${system?.agentStates?.[id]?.state==='working' ? ' isWorking' : ''}${system?.agentStates?.[id]?.state==='error' ? ' hasError' : ''}`} key={id}>
              <div className="avatarHalo"/>
              <div className="avatarFigure">
                <div className="avatarHead"/>
                <div className="avatarBody"/>
                <div className="avatarScan"/>
              </div>
              <div className="avatarBase"/>
              <b>{name}</b>
              <small>{role}</small>
              <span className="agentStatus" role="status">
                {speaking && activeSpeaker===id
                  ? 'Konuşuyor'
                  : !system
                    ? 'Bağlantı yok'
                    : system.agentStates?.[id]?.state==='working'
                      ? system.agentStates[id].activity
                      : system.agentStates?.[id]?.state==='error'
                        ? 'İşlem hatası'
                        : system.agentStates?.[id]?.state==='completed'
                          ? 'Yanıt hazır'
                          : 'Bekliyor'}
              </span>
            </div>
          ))}
          <div className="agentLink linkLeft"/>
          <div className="agentLink linkRight"/>
        </div>

<div className="reply glass">
          <div className="replyIcon">J</div>
          <div className="replyText"><b>JARVIS // {stateLabel}</b><p>{reply}</p></div>
          <div className={`wave ${speaking||listening?'active':''}`}>{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i}}/>)}</div>
        </div>

        <div className="quickRow">
          {QUICK.slice(0,5).map(([ic,n,u])=><button key={n} className="quickButton" onClick={()=>{const a=appByName(n);if(a)launchApp(a,u);else openExternal(u)}}><span>{ic}</span><b>{n}</b><i/></button>)}
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
