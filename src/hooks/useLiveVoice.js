import { useEffect, useRef, useState } from 'react';
import { api } from '../core/api.js';
import { createLiveController } from '../live/controller.js';
export function useLiveVoice({ client, agent, profile }) {
  const [status, setStatus] = useState({ phase: 'idle', error: '' });
  const [transcript, setTranscript] = useState({ user: '', assistant: '' });
  const [sources, setSources] = useState([]);
  const ref = useRef(null);
  useEffect(() => {
    setTranscript({ user: '', assistant: '' }); setSources([]);
    const controller = createLiveController({ api, client, onState: setStatus, onTranscript: setTranscript, onSources: setSources });
    ref.current = controller;
    return () => { ref.current = null; controller.stop(); };
  }, [client, agent, profile.name, profile.voice, profile.personality]);
  return { ...status, transcript, sources, active: ['connecting', 'listening', 'thinking', 'speaking'].includes(status.phase),
    sendText(text) { ref.current?.sendText(text); },
    start() { setSources([]); ref.current?.start({ agent, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }); },
    stop() { ref.current?.stop(); setTranscript({ user: '', assistant: '' }); },
  };
}
