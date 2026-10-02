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

export function createVoiceController({listening, setListening, setSpeaking, setActiveSpeaker, setCommand, setReply, recognitionRef, conversationModeRef, voiceGeneration, askJarvis}) {
  function stopVoice(){
    conversationModeRef.current=false; voiceGeneration.current++
    recognitionRef.current?.abort(); window.speechSynthesis?.cancel()
    setListening(false); setSpeaking(false)
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

  speech.rate = 1.20
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

          speech.rate = 1.20
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

  function startConversation(){
    if(listening){
      stopVoice()
      return
    }

    const SR=window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){
      setReply('Bu tarayıcı ses tanımayı desteklemiyor.')
      return
    }

    const previous=recognitionRef.current
    if(previous){
      previous.onstart=null
      previous.onresult=null
      previous.onerror=null
      previous.onend=null
    }
    stopVoice()

    const generation=voiceGeneration.current
    const recognition=new SR()
    recognition.lang='tr-TR'
    recognition.continuous=false
    recognition.interimResults=false
    recognitionRef.current=recognition
    conversationModeRef.current=true
    let received=false
    let failed=false

    const current=()=>recognitionRef.current===recognition &&
      voiceGeneration.current===generation &&
      conversationModeRef.current

    recognition.onstart=()=>{
      if(!current()) return
      setListening(true)
    }

    recognition.onresult=(event)=>{
      if(!current() || received || failed) return
      const transcript=(event.results?.[0]?.[0]?.transcript || '').trim()
      if(!transcript) return
      received=true
      setCommand(transcript)
      setListening(false)
      askJarvis(transcript)
    }

    recognition.onerror=(event)=>{
      if(!current()) return
      failed=true
      conversationModeRef.current=false
      recognitionRef.current=null
      setListening(false)
      const messages={
        'not-allowed':'Mikrofon izni verilmedi. Tarayıcının site ayarlarından mikrofon iznini aç.',
        'service-not-allowed':'Tarayıcı ses tanıma hizmetine izin vermiyor.',
        'audio-capture':'Mikrofona erişilemiyor. Başka bir uygulama kullanıyor olabilir.',
        'network':'Ses tanıma bağlantısı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.',
        'no-speech':'Ses duyamadım. Mikrofona basıp tekrar konuş.',
        'language-not-supported':'Tarayıcı Türkçe ses tanımayı desteklemiyor.'
      }
      if(event.error!=='aborted'){
        setReply(messages[event.error] || 'Ses tanıma durdu. Mikrofona basıp tekrar dene.')
      }
    }

    recognition.onend=()=>{
      if(!current()) return
      recognitionRef.current=null
      setListening(false)
      if(!received){
        conversationModeRef.current=false
        if(!failed) setReply('Ses duyamadım. Mikrofona basıp tekrar konuş.')
      }
    }

    try{
      recognition.start()
    }catch{
      recognitionRef.current=null
      conversationModeRef.current=false
      setListening(false)
      setReply('Mikrofon başlatılamadı. Tekrar dene.')
    }
  }


return {stopVoice,speak,speakTurns,startConversation}
}
