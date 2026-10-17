import { useEffect, useRef, useState, useCallback } from 'react';
import { api, memoryBridge, watchEvents } from '../core/api.js';
import { JARVIS_MEMORY_KEY, loadJarvisMemory } from '../core/memory.js';

export function useSession(onReply) {
  const [state, setState] = useState(null), [system, setSystem] = useState(null);
  const [home, setHome] = useState(null);
  const [drafts, setDrafts] = useState({}), [error, setError] = useState(''), [connected, setConnected] = useState(false);
  const [authVersion, setAuthVersion] = useState(0);
  const callback = useRef(onReply); callback.current = onReply;
  const client = useRef(sessionStorage.getItem('jarvis-client') || crypto.randomUUID());
  sessionStorage.setItem('jarvis-client', client.current);
  const mounted = useRef(true), version = useRef(-1);
  const applyState = useCallback(data => {
    if ((data.version || 0) < version.current) return false;
    version.current = data.version || 0;
    setState(data);
    // Never overwrite a local write that has not been acknowledged yet.
    if (!memoryBridge.writes && data.revision >= memoryBridge.revision) {
      localStorage.setItem(JARVIS_MEMORY_KEY, JSON.stringify(data.memory));
      memoryBridge.revision = data.revision;
    }
    memoryBridge.ready = true;
    return true;
  }, []);
  const refresh = useCallback(async signal => {
    const [data, status] = await Promise.all([api('/api/state', { signal }), api('/api/status', { signal })]);
    if (!mounted.current || signal?.aborted) return;
    // Migrate legacy browser-only data only into an empty, unchanged server memory.
    if (!memoryBridge.ready && data.revision === 0 && Object.values(data.memory).every(items => !items.length)) {
      const legacy = loadJarvisMemory();
      if (Object.values(legacy).some(items => items.length)) {
        const result = await api('/api/memory', { method: 'PUT', signal, body: JSON.stringify({ memory: legacy, revision: data.revision }) });
        data.memory = legacy; data.revision = result.revision;
      }
    }
    if (!mounted.current || signal?.aborted) return;
    if (!applyState(data)) return;
    setSystem(status); setError('');
    if (data.active) setDrafts(data.active.partials || {}); else setDrafts({});
  }, [applyState]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    async function recover() { await refresh(controller.signal); if (!controller.signal.aborted) setConnected(true); }
    watchEvents(controller.signal, event => {
      setConnected(true);
      if (event.type === 'state') {
        if (!applyState(event.data)) return;
        const running = event.data.tasks.find(t => t.status === 'running');
        if (!running) setDrafts({});
      }
      if (event.type === 'home') setHome(event.data);
      if (event.type === 'agents') setSystem(previous => ({ ...previous, agentStates: event.data }));
      if (event.type === 'presence') setSystem(previous => ({ ...previous, screens: event.data.screens }));
      if (event.type === 'delta') setDrafts(previous => ({ ...previous, [event.data.speaker]: (previous[event.data.speaker] || '') + event.data.text }));
      if (event.type === 'reply') { setDrafts({}); if (event.data.origin === client.current) callback.current(event.data); }
      if (event.type === 'task-error') { setDrafts({}); setError(event.data.error); }
      if (event.type === 'task-end') setDrafts({});
    }, recover).catch(() => {});
    // Recovery also works on hosts that buffer SSE. Replies remain on the server.
    const timer = setInterval(() => refresh(controller.signal).catch(e => { if (!controller.signal.aborted) { setConnected(false); setError(e.message); memoryBridge.ready = false; } }), 15000);

    return () => { mounted.current = false; controller.abort(); clearInterval(timer); memoryBridge.ready = false; };
  }, [refresh, applyState, authVersion]);
  const active = state?.tasks.find(t => t.status === 'running');
  return { state, system, home, drafts, error, connected, active, refresh, client: client.current,
    reconnect() { version.current = -1; memoryBridge.ready = false; memoryBridge.revision = 0; setAuthVersion(x => x + 1); },
    async cancel() { if (active) await api(`/api/tasks/${active.id}/cancel`, { method: 'POST' }); },
  };
}
