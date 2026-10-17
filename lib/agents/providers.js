import { agentInstruction } from '../agent-context.js';
import { jarvisInstruction, atlasInstruction, nexusInstruction } from './prompts.js';

export function createAgentProviders({ gemini, context, GEMINI_MODEL, OPENROUTER_MODEL, getSettings = () => null, onState = () => {} }) {
  const agentStates = Object.fromEntries(['jarvis', 'atlas', 'nexus'].map(id => [id, { state: 'idle', activity: '', updatedAt: null }]));
  function setState(id, state, activity) {
    agentStates[id] = { state, activity, updatedAt: new Date().toISOString() };
    onState(agentStates);
  }
  const run = () => context.getStore();
  const check = () => run()?.signal?.throwIfAborted();
  function delta(speaker, text) { check(); if (text) run()?.onDelta?.({ speaker, text }); }
  function sources(response) {
    const list = run()?.sources;
    for (const chunk of response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) {
      const web = chunk.web;
      if (list && web?.uri && /^https?:\/\//.test(web.uri) && !list.some(x => x.url === web.uri)) list.push({ title: web.title || web.uri, url: web.uri });
    }
  }
  async function track(id, activity, work) {
    check(); setState(id, 'working', activity);
    try {
      const answer = await work(); check();
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('Ajan boş yanıt döndürdü.');
      if (/^(?:User Safety:\s*(?:safe|unsafe)\s*)?(?:Response Safety:\s*(?:safe|unsafe)\s*)$/i.test(answer.trim())) throw new Error('Geçerli görev yanıtı alınamadı.');
      setState(id, 'completed', 'Yanıt hazır'); return answer.trim();
    } catch (error) { setState(id, run()?.signal?.aborted ? 'idle' : 'error', run()?.signal?.aborted ? 'İptal edildi' : 'Yanıt alınamadı'); throw error; }
  }
  function ownHistory(id) { return run()?.agentHistories?.[id] || (run()?.agent === id ? run()?.history || [] : []); }
  function history(id) {
    return ownHistory(id).map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] }));
  }
  async function askGemini(id, instruction, message, search = false, useHistory = true) {
    check();
    const parts = [{ text: String(message) }];
    // Images are opt-in and request-scoped. Never persisted or put in subsequent history.
    if (run()?.image) parts.push({ inlineData: run().image });
    const stream = await gemini.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [...(useHistory ? history(id) : []), { role: 'user', parts }],
      config: { systemInstruction: `${instruction}\n${agentInstruction(getSettings(), id)}\n${getSettings()?.profiles?.[id]?.name ? `Bu konuşmada görünen adın ${getSettings().profiles[id].name}.` : ''}\n${run()?.clock ? `Sunucudan doğrulanmış zaman: ${JSON.stringify(run().clock)}` : ''}\nKullanıcı yalnızca sonucu isterse hitap veya giriş ekleme. Telefonun yerel alarm ve anımsatıcılarına yazma yetkin yok; işlem yaptım deme.`, ...(search && !run()?.image ? { tools: [{ googleSearch: {} }] } : {}), abortSignal: run()?.signal },
    });
    let text = '';
    for await (const chunk of stream) {
      check(); sources(chunk);
      if (chunk.text) { text += chunk.text; delta(id, chunk.text); }
    }
    return text;
  }
  function askAtlas(message, memory = '') { return track('atlas', 'Kaynakları araştırıyor', () => askGemini('atlas', atlasInstruction(memory), message, true)); }
  function askJarvis(message, memory = '') { return track('jarvis', 'Yanıt hazırlıyor', () => askGemini('jarvis', jarvisInstruction(memory), message)); }
  async function askNexus(message, memory = '') {
    return track('nexus', 'Teknik yanıt hazırlıyor', async () => {
      if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY tanımlı değil.');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: AbortSignal.any([run()?.signal || new AbortController().signal, AbortSignal.timeout(90_000)]),
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'JARVIS' },
        body: JSON.stringify({ model: OPENROUTER_MODEL, stream: true, messages: [{ role: 'system', content: `${nexusInstruction(memory)}\n${agentInstruction(getSettings(), 'nexus')}\nGörünen adın ${getSettings()?.profiles?.nexus?.name || 'VERA'}.\n${run()?.clock ? JSON.stringify(run().clock) : ''}\nKullanıcı yalnızca sonucu isterse hitap veya giriş ekleme. Dosya değiştirme, terminal, alarm veya takvim işlemi yapma yetkin yok; yaptım deme.` }, ...ownHistory('nexus'), { role: 'user', content: String(message) }] }),
      });
      if (!response.ok) { const error = new Error(`OpenRouter HTTP ${response.status}`); error.status = response.status; throw error; }
      let text = '';
      for await (const event of readProviderEvents(response)) {
        check(); if (event.error) throw new Error('Sağlayıcı akışı tamamlanamadı.');
        const part = event.choices?.[0]?.delta?.content;
        if (typeof part === 'string') { text += part; delta('nexus', part); }
      }
      return text;
    });
  }
  function synthesizeAgents(message, atlasAnswer, nexusAnswer, memory = '') {
    return track('jarvis', 'Uzman sonuçlarını birleştiriyor', () => askGemini('jarvis', jarvisInstruction(memory),
      `Kullanıcının isteği:\n${message}\n\nLARA RAPORU:\n${atlasAnswer}\n\nVERA RAPORU:\n${nexusAnswer}\n\nSonuçları değerlendir, tekrarları çıkar. Çelişkileri ve doğrulanmamış iddiaları açıkça belirt. Tek ve uygulanabilir bir yanıt ver.`, false, true));
  }
  return { agentStates, askAtlas, askJarvis, askNexus, synthesizeAgents };
}

export async function* readProviderEvents(response) {
  if (!response.body) throw new Error('Sağlayıcı akışı boş.');
  const decoder = new TextDecoder(); let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    if (buffer.length > 1_000_000) throw new Error('Geçersiz sağlayıcı akışı.');
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      if (data) yield JSON.parse(data);
    }
  }
  throw new Error('Sağlayıcı akışı tamamlanmadan kapandı.');
}
