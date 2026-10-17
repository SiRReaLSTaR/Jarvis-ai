import { agentHistory, retainHistory } from '../agent-context.js';
import { randomUUID } from 'node:crypto';
import { liveConfig } from './config.js';
import { clockSnapshot } from '../clock.js';
import { selectMemory } from '../memory.js';
export function createLiveService({ tokenClient, state, save, publish, providers, context, now = Date.now, model = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025' }) {
  const leases = new Map();
  function clean() { for (const [id, lease] of leases) if (lease.expiry <= now()) { lease.controller.abort(); leases.delete(id); } }
  function get(id, owner) {
    clean(); const lease = leases.get(id);
    if (!lease || lease.owner !== owner) throw new Error('Canlı oturum sona erdi.');
    return lease;
  }
  return {
    async start({ agent, owner, timeZone }) {
      clean();
      if (typeof owner !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(owner)) throw new Error('Geçersiz istemci.');
      if (leases.size >= 2) throw new Error('En fazla iki canlı oturum açılabilir. Diğer oturumu kapatın.');
      const id = randomUUID(), expiry = now() + 15 * 60_000;
      const config = liveConfig({ state, agent, timeZone, now: now() });
      const lease = { owner, expiry, agent, timeZone, controller: new AbortController(), tools: new Map(), turns: new Set(), sources: [] };
      leases.set(id, lease); // Reserve capacity before the asynchronous provider request.
      try {
        const token = await tokenClient.authTokens.create({ config: { uses: 1, expireTime: new Date(expiry).toISOString(), newSessionExpireTime: new Date(now() + 60_000).toISOString(), liveConnectConstraints: { model, config } } });
        if (!token.name?.startsWith('auth_tokens/')) throw new Error('Geçici oturum anahtarı alınamadı.');
        get(id, owner);
        return { id, token: token.name, model, config, expiresAt: new Date(expiry).toISOString() };
      } catch (e) { leases.delete(id); lease.controller.abort(); throw e; }
    },
    stop(id, owner) { const lease = get(id, owner); lease.controller.abort(); leases.delete(id); },
    async tool(id, owner, call) {
      const lease = get(id, owner);
      if (!call || typeof call.id !== 'string' || call.id.length > 160 || !['get_clock', 'ask_expert'].includes(call.name)) throw new Error('İzin verilmeyen araç.');
      const signature = JSON.stringify([call.name, call.args]);
      if (lease.tools.has(call.id)) {
        const cached = lease.tools.get(call.id);
        if (cached.signature !== signature) throw new Error('Araç kimliği çakıştı.');
        return cached.promise;
      }
      if (lease.tools.size >= 40) throw new Error('Oturum araç sınırına ulaştı.');
      const promise = (async () => {
        if (call.name === 'get_clock') return clockSnapshot(lease.timeZone, now());
        const args = call.args;
        if (!args || !['atlas', 'nexus'].includes(args.agent) || typeof args.question !== 'string' || !args.question.trim() || args.question.length > 4000) throw new Error('Geçersiz uzman sorusu.');
        const run = { signal: AbortSignal.any([lease.controller.signal, AbortSignal.timeout(100_000)]), agent: args.agent, history: agentHistory(state.history, args.agent, 12), sources: [] };
        const answer = await context.run(run, () => (args.agent === 'atlas' ? providers.askAtlas : providers.askNexus)(args.question, selectMemory(state.memory, args.question)));
        run.signal.throwIfAborted();
        get(id, owner);
        lease.sources = run.sources;
        const result = { answer: answer.slice(0, 16000), sources: run.sources };
        publish('live-sources', { owner, ...result });
        return result;
      })();
      lease.tools.set(call.id, { signature, promise });
      return promise;
    },
    turn(id, owner, { turnId, user, assistant, interrupted = false }) {
      const lease = get(id, owner);
      if (typeof turnId !== 'string' || turnId.length > 160 || typeof user !== 'string' || typeof assistant !== 'string' || user.length > 8000 || assistant.length > 20000) throw new Error('Geçersiz konuşma kaydı.');
      if (lease.turns.has(turnId)) return { saved: false };
      if (lease.turns.size >= 150) throw new Error('Konuşma sınırına ulaşıldı.');
      lease.turns.add(turnId);
      if (user.trim()) state.history.push({ role: 'user', agent: lease.agent, content: user, live: true });
      if (assistant.trim()) state.history.push({ role: 'assistant', agent: lease.agent, speaker: lease.agent, content: assistant, live: true, sources: lease.sources, interrupted: Boolean(interrupted) });
      state.history = retainHistory(state.history); if (assistant.trim() && !interrupted) state.lastSuccess = new Date(now()).toISOString(); save(); publish('state', state); return { saved: true };
    },
  };
}
