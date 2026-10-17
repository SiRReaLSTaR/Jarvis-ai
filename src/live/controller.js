import { PcmPlayer, pcmToBase64 } from './audio.js';

export function createLiveController({ api, onState, onTranscript, onSources = () => {}, client, clientFactory = async token => {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey: token, apiVersion: 'v1alpha' });
}, media = globalThis.navigator?.mediaDevices, audioFactory = () => new (window.AudioContext || window.webkitAudioContext)(), workletFactory = ctx => new AudioWorkletNode(ctx, 'jarvis-pcm') }) {
  let generation = 0, current = null;
  function state(phase, error = '') { onState({ phase, error }); }
  function alive(run) { return current === run && run.generation === generation && !run.abort.signal.aborted; }
  function cleanup(run) {
    clearTimeout(run.timer); clearTimeout(run.startTimer); run.abort.abort();
    run.stream?.getTracks().forEach(track => track.stop());
    if (run.processor) { run.processor.port.onmessage = null; run.processor.disconnect(); }
    run.source?.disconnect(); run.silence?.disconnect(); run.player?.stop();
    try { run.session?.close(); } catch { /* already closed */ }
    run.audio?.close().catch(() => {});
    if (run.lease) api(`/api/live/${run.lease.id}/stop`, { method: 'POST', body: JSON.stringify({ client }) }).catch(() => {});
  }
  function stop() { generation++; const run = current; current = null; if (run) cleanup(run); state('idle'); }
  function fail(run, message) { if (!alive(run)) return; current = null; generation++; cleanup(run); state('error', message); }
  function commit(run, interrupted) {
    if (!run.user && !run.assistant) return;
    const turn = { turnId: `${run.lease.id}-${run.turn++}`, user: run.user, assistant: run.assistant, interrupted };
    run.user = ''; run.assistant = '';
    onTranscript({ user: '', assistant: '' });
    api(`/api/live/${run.lease.id}/turn`, { method: 'POST', body: JSON.stringify({ client, ...turn }), signal: run.abort.signal }).catch(() => { if (alive(run)) state('listening', 'Konuşma geçmişe kaydedilemedi.'); });
  }
  async function callTools(run, calls) {
    for (const call of calls || []) {
      if (!alive(run)) return;
      if (run.calls.has(call.id)) continue;
      run.calls.add(call.id);
      if (run.calls.size > 40) { fail(run, 'Oturum araç sınırına ulaştı.'); return; }
      state('thinking');
      try {
        const result = await api(`/api/live/${run.lease.id}/tool`, { method: 'POST', body: JSON.stringify({ client, call }), signal: run.abort.signal });
        if (!alive(run) || run.cancelled.has(call.id)) continue;
        if (result.sources) onSources(result.sources);
        run.session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: result }] });
      } catch (e) {
        if (alive(run) && !run.cancelled.has(call.id)) run.session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: 'İşlem tamamlanamadı. Başarılıymış gibi sunma.' } }] });
      }
    }
  }
  function message(run, event) {
    if (!alive(run)) return;
    try {
      for (const id of event.toolCallCancellation?.ids || []) run.cancelled.add(id);
      const content = event.serverContent;
      if (content?.interrupted) { run.player.stop(); commit(run, true); state('listening'); }
      if (content?.inputTranscription?.text) run.user = (run.user + content.inputTranscription.text).slice(0, 8000);
      if (content?.outputTranscription?.text) run.assistant = (run.assistant + content.outputTranscription.text).slice(0, 20000);
      if (content?.inputTranscription || content?.outputTranscription) onTranscript({ user: run.user, assistant: run.assistant });
      for (const part of content?.modelTurn?.parts || []) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) { state('speaking'); run.player.play(part.inlineData.data, part.inlineData.mimeType); }
      }
      if (content?.turnComplete) { commit(run, false); if (!run.player.nodes.size) state('listening'); }
      if (event.toolCall) void callTools(run, event.toolCall.functionCalls);
      if (event.goAway) fail(run, 'Canlı oturum süresi doluyor. Tekrar bağlanın.');
    } catch { fail(run, 'Ses akışı işlenemedi. Tekrar bağlanın.'); }
  }
  return {
    stop,
    sendText(text) {
      if (!current?.session || !alive(current)) throw new Error('Canlı bağlantı henüz hazır değil.');
      current.player.stop();
      current.user = (current.user + text).slice(0, 8000);
      onTranscript({ user: current.user, assistant: current.assistant });
      current.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
    },
    async start({ agent, timeZone }) {
      stop();
      const run = { generation, abort: new AbortController(), user: '', assistant: '', turn: 0, calls: new Set(), cancelled: new Set() };
      current = run; state('connecting');
      run.startTimer = setTimeout(() => fail(run, 'Bağlantı zaman aşımına uğradı. Tekrar deneyin.'), 25_000);
      try {
        if (!media?.getUserMedia) throw new Error('Canlı ses için HTTPS ve mikrofon destekli tarayıcı gerekir.');
        // Start/resume AudioContext in the user's click gesture (required by iOS).
        run.audio = audioFactory(); await run.audio.resume();
        run.player = new PcmPlayer(run.audio, () => { if (alive(run)) state('listening'); });
        run.stream = await media.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
        if (!alive(run)) { cleanup(run); return; }
        run.lease = await api('/api/live/start', { method: 'POST', body: JSON.stringify({ client, agent, timeZone }), signal: run.abort.signal });
        if (!alive(run)) { cleanup(run); return; }
        const sdk = await clientFactory(run.lease.token);
        if (!alive(run)) { cleanup(run); return; }
        run.timer = setTimeout(() => fail(run, 'Canlı oturum sona erdi. Tekrar bağlanın.'), Math.max(0, Date.parse(run.lease.expiresAt) - Date.now()));
        await run.audio.audioWorklet.addModule('/jarvis-pcm-worklet.js');
        if (!alive(run)) { cleanup(run); return; }
        run.session = await sdk.live.connect({ model: run.lease.model, config: run.lease.config, callbacks: {
          onmessage: event => message(run, event),
          onerror: () => fail(run, 'Canlı bağlantı kurulamadı. Gemini erişimini ve bağlantını kontrol et.'),
          onclose: () => fail(run, 'Canlı bağlantı kapandı. Tekrar bağlanın.'),
        } });
        if (!alive(run)) { cleanup(run); return; }
        run.source = run.audio.createMediaStreamSource(run.stream);
        run.processor = workletFactory(run.audio);
        run.silence = run.audio.createGain(); run.silence.gain.value = 0;
        run.source.connect(run.processor); run.processor.connect(run.silence); run.silence.connect(run.audio.destination);
        run.processor.port.onmessage = ({ data }) => {
          if (!alive(run)) return;
          try { run.session.sendRealtimeInput({ audio: { data: pcmToBase64(data), mimeType: 'audio/pcm;rate=16000' } }); }
          catch { fail(run, 'Mikrofon sesi gönderilemedi.'); }
        };
        clearTimeout(run.startTimer); state('listening');
      } catch (e) {
        const detail = /auth_tokens\/|https?:\/\/|[?&](?:key|access_token)=/.test(e.message || '') ? 'Canlı ses başlatılamadı. Gemini erişimini ve bağlantını kontrol edin.' : e.message;
        const error = e.name === 'NotAllowedError' ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilirsin.' : detail || 'Canlı ses başlatılamadı.';
        fail(run, error);
      }
    },
  };
}
