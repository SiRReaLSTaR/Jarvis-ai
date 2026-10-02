import {commandText} from './commands.js'
import {memoryBridge,api} from './api.js'
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


export { JARVIS_MEMORY_KEY, loadJarvisMemory, addJarvisMemory, removeJarvisMemory, moveJarvisMemory, detectMemoryType, typeLabel, jarvisMemoryReport }
