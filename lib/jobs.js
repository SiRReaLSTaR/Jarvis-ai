import { agentHistory, retainHistory } from './agent-context.js';
import { selectMemory } from './memory.js';
export function createJobs({ store, context, orchestrate, publish, timeoutMs = 180_000 }) {
  let active = null;
  return {
    get active() { return active ? { taskId: active.task.id, origin: active.origin, partials: active.partials } : null; },
    cancel(id) {
      if (!active || active.task.id !== id) return false;
      active.controller.abort(new DOMException('Görev iptal edildi.', 'AbortError')); return true;
    },
    start(message, origin, image, { agent = 'jarvis', clock } = {}) {
      if (active) return null;
      const task = store.task(message);
      const controller = new AbortController();
      const job = { task, controller, origin, partials: {} };
      active = job;
      store.state.history.push({ role: 'user', agent, content: message, taskId: task.id, imageAttached: Boolean(image) });
      store.state.history = retainHistory(store.state.history); store.save();
      publish('state', store.state);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
      const run = { signal, image, agent, clock, history: agentHistory(store.state.history.slice(0, -1), agent), agentHistories: Object.fromEntries(['jarvis', 'atlas', 'nexus'].map(id => [id, agentHistory(store.state.history.slice(0, -1), id)])), sources: [], onDelta({ speaker, text }) {
        signal.throwIfAborted();
        job.partials[speaker] = (job.partials[speaker] || '') + text;
        if (job.partials[speaker].length > 200_000) throw new Error('Yanıt uzunluk sınırını aştı.');
        publish('delta', { taskId: task.id, speaker, text, origin });
      } };
      // Only collect the final orchestration as the committed response.
      job.done = (async () => {
        try {
          const result = await context.run(run, () => orchestrate(message, selectMemory(store.state.memory, message)));
          signal.throwIfAborted();
          if (result?.reply?.length > 100_000) throw new Error('Yanıt çok uzun.');
          if (!result?.reply?.trim()) throw new Error('Boş yanıt.');
          task.status = result.route.includes('fallback') || result.route.includes('partial') ? 'partial' : 'completed';
          task.route = result.route; task.agents = result.agents;
          store.state.history.push({ role: 'assistant', agent, content: result.reply, speaker: result.speaker, turns: result.turns || [], sources: run.sources, taskId: task.id });
          store.state.history = retainHistory(store.state.history); store.state.lastSuccess = new Date().toISOString();
          publish('reply', { ...result, sources: run.sources, taskId: task.id, origin });
        } catch (error) {
          task.status = controller.signal.aborted ? 'cancelled' : 'failed';
          task.error = controller.signal.aborted ? 'Görev iptal edildi.' : signal.aborted ? 'Görev zaman aşımına uğradı.' : 'Yanıt alınamadı. Sağlayıcı ayarlarını kontrol edin.';
          publish('task-error', { taskId: task.id, error: task.error, origin });
        } finally {
          task.finishedAt = new Date().toISOString(); active = null; store.save(); publish('state', store.state); publish('task-end', { taskId: task.id });
        }
        return task;
      })();
      return { task, done: job.done };
    },
  };
}
