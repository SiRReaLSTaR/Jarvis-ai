import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [time, setTime] = useState(new Date())
  const [command, setCommand] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const speech = new SpeechSynthesisUtterance(text)

    speech.lang = 'tr-TR'
    speech.rate = 0.95
    speech.pitch = 0.9
    speech.volume = 1

    const voices = window.speechSynthesis.getVoices()

    const turkishVoice = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith('tr')
    )

    if (turkishVoice) {
      speech.voice = turkishVoice
    }

    window.speechSynthesis.speak(speech)
  }

  const askJarvis = async (messageOverride = null) => {
    const message =
      typeof messageOverride === 'string'
        ? messageOverride
        : command

    if (!message.trim() || loading) return

    setLoading(true)
    setReply('Düşünüyorum...')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu.')
      }

      setReply(data.reply)
      setCommand('')

      speak(data.reply)
    } catch (error) {
      console.error(error)
      setReply('Bağlantı kurulamadı. JARVIS CORE kontrol edilmeli.')
    } finally {
      setLoading(false)
    }
  }

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setReply(
        'Bu tarayıcı sesli komut özelliğini desteklemiyor.'
      )
      return
    }

    const recognition = new SpeechRecognition()

    recognition.lang = 'tr-TR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setListening(true)
      setReply('Seni dinliyorum...')
    }

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript

      setCommand(transcript)
      setListening(false)

      askJarvis(transcript)
    }

    recognition.onerror = (event) => {
      console.error('Mikrofon hatası:', event.error)
      setListening(false)

      setReply(
        'Seni duyamadım. Mikrofon iznini kontrol edelim.'
      )
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognition.start()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      askJarvis()
    }
  }

  return (
    <main className="jarvis">
      <header>
        <div className="logo">J.A.R.V.I.S</div>

        <div className="status">
          <span className="dot"></span>
          {listening ? 'DİNLİYORUM' : 'SİSTEM AKTİF'}
        </div>
      </header>

      <section className="center">
        <p className="welcome">
          HOŞ GELDİN MUSTAFA
        </p>

        <div className="core">
          <div className="ring ring1"></div>
          <div className="ring ring2"></div>
          <div className="ring ring3"></div>
          <div className="coreCenter">
            {listening ? '●' : 'J'}
          </div>
        </div>

        <h1>JARVIS</h1>

        <p className="subtitle">
          KİŞİSEL YAPAY ZEKA ASİSTANI
        </p>

        <div className="clock">
          {time.toLocaleTimeString('tr-TR')}
        </div>

        {reply && (
          <div className="jarvisReply">
            {reply}
          </div>
        )}

        <div className="commandBox">
          <input
            value={command}
            onChange={(e) =>
              setCommand(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={
              listening
                ? 'Seni dinliyorum...'
                : loading
                  ? 'Jarvis düşünüyor...'
                  : "Jarvis'e bir komut ver..."
            }
            disabled={loading}
          />

          <button
            onClick={() => askJarvis()}
            disabled={loading}
          >
            {loading ? '◌' : '➤'}
          </button>

          <button
            className="mic"
            onClick={startListening}
            disabled={loading || listening}
          >
            {listening ? '🔴' : '🎙️'}
          </button>
        </div>
      </section>

      <footer>
        <span>
          ● {listening ? 'DİNLİYOR' : 'YAPAY ZEKA HAZIR'}
        </span>

        <span>JARVIS CORE v0.3</span>
      </footer>
    </main>
  )
}

export default App