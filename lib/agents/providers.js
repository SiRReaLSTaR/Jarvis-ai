import {jarvisInstruction,atlasInstruction,nexusInstruction} from './prompts.js'
export function createAgentProviders({gemini,context,GEMINI_MODEL,OPENROUTER_MODEL}) {
const agentStates = {
  jarvis: { state:'idle', activity:'', updatedAt:null },
  atlas: { state:'idle', activity:'', updatedAt:null },
  nexus: { state:'idle', activity:'', updatedAt:null }
};

function setAgentState(id, state, activity){
  const current = {
    state,
    activity,
    updatedAt:new Date().toISOString()
  };
  agentStates[id] = current;

  if(state === 'completed'){
    const timer = setTimeout(()=>{
      if(agentStates[id] === current){
        agentStates[id] = {
          state:'idle',
          activity:'',
          updatedAt:new Date().toISOString()
        };
      }
    },5000);
    timer.unref();
  }
}

async function trackAgent(id, activity, work){
  setAgentState(id, 'working', activity);

  for(let attempt=0; attempt<2; attempt++){
    try {
      const answer=await work();
      const text=typeof answer==='string' ? answer.trim() : '';

      if(!text){
        throw new Error('Ajan boş yanıt döndürdü.');
      }

      if(/^(?:User Safety:\s*(?:safe|unsafe)\s*)?(?:Response Safety:\s*(?:safe|unsafe)\s*)$/i.test(text) ||
         /^User Safety:\s*(?:safe|unsafe)$/i.test(text)){
        throw new Error('Ajan görev cevabı yerine güvenlik etiketi döndürdü.');
      }

      setAgentState(id, 'completed', 'Yanıt hazır');
      return answer;
    } catch(error){
      const status=Number(error.status || error.statusCode || error.code);
      const temporary=[502,503,504].includes(status);

      if(temporary && attempt===0){
        setAgentState(id, 'working', 'Sağlayıcı yoğun; yeniden deneniyor');
        await new Promise(resolve=>setTimeout(resolve,2000));
        setAgentState(id, 'working', activity);
        continue;
      }

      setAgentState(id, 'error',
        temporary ? 'Sağlayıcı geçici olarak yanıt veremiyor'
                  : 'Geçerli yanıt alınamadı');
      throw error;
    }
  }
}

function askAtlas(message, memory = ''){
  return trackAgent('atlas', 'Araştırıyor',
    ()=>askAtlasCore(message, memory));
}

function askJarvis(message, memory = ''){
  return trackAgent('jarvis', 'Yanıt hazırlıyor',
    ()=>askJarvisCore(message, memory));
}

function askNexus(message, memory = ''){
  return trackAgent('nexus', 'Teknik yanıt hazırlıyor',
    ()=>askNexusCore(message, memory));
}

async function askAtlasCore(message, memory = "") {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,

    contents: [...(context.getStore()?.history || []).map(x => ({ role: x.role === "assistant" ? "model" : "user", parts: [{ text: x.content }] })), { role: "user", parts: [{ text: String(message) }] }],

    config: {
      tools: [
        {
          googleSearch: {},
        },
      ],

      systemInstruction: atlasInstruction(memory),
    },
  });

  const sources = context.getStore()?.sources;
  for (const chunk of response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) {
    const web = chunk.web;
    if (web?.uri && /^https?:\/\//.test(web.uri) && sources && !sources.some(x => x.url === web.uri)) sources.push({ title: web.title || web.uri, url: web.uri });
  }
  return response.text || "LARA şu anda araştırma sonucu üretemedi.";
}

/* =========================================================
   JARVIS CORE
   ========================================================= */

async function askJarvisCore(message, memory = "") {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,

    contents: [...(context.getStore()?.history || []).map(x => ({ role: x.role === "assistant" ? "model" : "user", parts: [{ text: x.content }] })), { role: "user", parts: [{ text: String(message) }] }],

    config: {
      systemInstruction: jarvisInstruction(memory),
    },
  });

  return (
    response.text ||
    "DİLAN şu anda yanıt üretemedi."
  );
}

/* =========================================================
   NEXUS
   OPENROUTER
   ========================================================= */

async function askNexusCore(message, memory = "") {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY tanımlı değil."
    );
  }

  /*
   * OpenRouter sonsuza kadar beklerse sistemi kilitlememesi
   * için 30 saniyelik güvenlik zaman aşımı.
   */

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 90000);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        signal: controller.signal,

        headers: {
          Authorization:
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "Content-Type": "application/json",

          "X-Title": "DILAN AI",
        },

        body: JSON.stringify({
          model: OPENROUTER_MODEL,

          messages: [
            {
              role: "system",
              content: nexusInstruction(memory),
            },

            ...(context.getStore()?.history || []),
            { role: "user", content: String(message) },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        data?.message ||
        `OpenRouter HTTP ${response.status}`
      );
    }

    return (
      data?.choices?.[0]?.message?.content ||
      "VERA şu anda teknik yanıt üretemedi."
    );
  } finally {
    clearTimeout(timeout);
  }
}

function synthesizeAgents(message, atlasAnswer, nexusAnswer, memory = ''){
  return trackAgent('jarvis', 'Sonuçları birleştiriyor',
    ()=>synthesizeAgentsCore(message, atlasAnswer, nexusAnswer, memory));
}

async function synthesizeAgentsCore(
  message,
  atlasAnswer,
  nexusAnswer,
  memory = ""
) {
  try {
    const response =
      await gemini.models.generateContent({
        model: GEMINI_MODEL,

        contents: `
MUSTAFA'NIN İSTEĞİ:

${message}


ATLAS RAPORU:

${atlasAnswer}


NEXUS RAPORU:

${nexusAnswer}


ATLAS araştırma açısından çalıştı.

NEXUS mühendislik ve teknik açıdan çalıştı.

Şimdi iki ajanın sonuçlarını değerlendir.

Tekrarları kaldır.

Birbirlerini tamamlayan bilgileri birleştir.

Çelişki varsa açıkça belirt.

Mustafa'ya tek ve uygulanabilir sonuç sun.

Son cevabı JARVIS olarak sen ver.

ATLAS veya NEXUS gibi davranma.
`,

        config: {
          systemInstruction:
            jarvisInstruction(memory),
        },
      });

    return (
      response.text ||
      nexusAnswer ||
      atlasAnswer
    );
  } catch (error) {
    console.error(
      "JARVIS SYNTHESIS ERROR:",
      error
    );

    return nexusAnswer || atlasAnswer;
  }
}


return {agentStates,askAtlas,askJarvis,askNexus,synthesizeAgents}
}
