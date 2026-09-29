import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [time, setTime] = useState(new Date())
  const [command, setCommand] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const askJarvis = async () => {
    if (!command.trim() || loading) return

    setLoading(true)
    setReply('Düşünüyorum...')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: command,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu.')
      }

      setReply(data.reply)
      setCommand('')
    } catch (error) {
      console.error(error)
      setReply('Bağlantı kurulamadı. JARVIS CORE kontrol edilmeli.')
    } finally {
      setLoading(false)
    }
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
          SİSTEM AKTİF
        </div>
      </header>

      <section className="center">
        <p className="welcome">HOŞ GELDİN MUSTAFA</p>

        <div className="core">
          <div className="ring ring1"></div>
          <div className="ring ring2"></div>
          <div className="ring ring3"></div>
          <div className="coreCenter">J</div>
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
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              loading
                ? 'Jarvis düşünüyor...'
                : "Jarvis'e bir komut ver..."
            }
            disabled={loading}
          />

          <button
            onClick={askJarvis}
            disabled={loading}
          >
            {loading ? '◌' : '➤'}
          </button>

          <button className="mic">
            🎙️
          </button>
        </div>
      </section>

      <footer>
        <span>● YAPAY ZEKA HAZIR</span>
        <span>JARVIS CORE v0.2</span>
      </footer>
    </main>
  )
}

export default App