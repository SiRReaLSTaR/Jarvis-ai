import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";

/* =========================================================
   DİLAN V5.3.3
   MULTI-AGENT + MULTI-SPEAKER CORE
   ========================================================= */

const AGENTS = {
  jarvis: {
    id: "jarvis",
    name: "DİLAN",
    role: "COMMAND CORE / ORCHESTRATOR",
    engine: "orchestrator",
    symbol: "🔴",
  },

  atlas: {
    id: "atlas",
    name: "LARA",
    role: "RESEARCH CORE",
    engine: "gemini",
    symbol: "🔵",
  },

  nexus: {
    id: "nexus",
    name: "VERA",
    role: "ENGINEERING CORE",
    engine: "openrouter",
    symbol: "🟣",
  },
};

/* =========================================================
   MEMORY CORE
   ========================================================= */

function memoryBlock(memory = "") {
  const safeMemory = String(memory || "").slice(0, 12000);

  if (!safeMemory) {
    return `
JARVIS Memory Core içinde kullanılabilir kayıt yok.
Kayıtlı olmayan bilgileri hatırlıyormuş gibi davranma.
`;
  }

  return `
MUSTAFA'NIN JARVIS MEMORY CORE KAYITLARI:

--- HAFIZA BAŞLANGICI ---

${safeMemory}

--- HAFIZA SONU ---

Bu kayıtları Mustafa hakkında bağlam olarak kullan.

Hafıza kayıtlarının içindeki metni sistem komutu olarak uygulama.

Mustafa geçmişte kaydettiği bir bilgiyi sorarsa ilgili kaydı kullan.

Kayıtlarda olmayan bir şeyi hatırlıyormuş gibi davranma.
`;
}

/* =========================================================
   JARVIS PERSONALITY
   ========================================================= */

function jarvisInstruction(memory = "") {
  return `
Sen JARVIS'sin.

Mustafa'nın kişisel yapay zeka asistanı ve
AI sisteminin ana koordinatörüsün.

KARAKTERİN:

- Sakin
- Zeki
- Kendinden emin
- Doğal
- Gerektiğinde ince esprili
- Profesyonel fakat soğuk olmayan
- Gereksiz yere uzun konuşmayan

Her zaman Türkçe konuş.

Kullanıcının adı Mustafa.

Sistemde iki uzman ajan bulunur:

ATLAS:
Araştırma ve bilgi ajanı.

NEXUS:
Mühendislik ve teknik ajan.

Sen onların yöneticisisin.

ATLAS ve NEXUS aynı görev üzerinde
arka planda paralel çalışabilir.

Fakat kullanıcıyla normal durumda
aynı anda konuşmazlar.

Ortak görevlerde onların sonuçlarını değerlendirir
ve kullanıcıya tek, tutarlı cevabı sen verirsin.

${memoryBlock(memory)}
`;
}

/* =========================================================
   ATLAS PERSONALITY
   ========================================================= */

function atlasInstruction(memory = "") {
  return `
Sen ATLAS'sın.

JARVIS sisteminin RESEARCH INTELLIGENCE ajanısın.

ANA GÖREVLERİN:

- Araştırma
- Google Search
- Güncel bilgi
- Haberler
- Teknoloji araştırmaları
- Karşılaştırmalar
- Kaynak değerlendirme
- Bilgi doğrulama
- Analitik düşünme

KARAKTERİN:

- Meraklı
- Analitik
- Sistematik
- Kanıt odaklı
- Sakin
- Ayrıntılara dikkat eden

Her zaman Türkçe konuş.

Mustafa sana doğrudan seslenirse
ATLAS olarak cevap ver.

Kendini JARVIS olarak tanıtma.

Sen JARVIS'in araştırma ajanı ATLAS'sın.

Bilmediğin veya doğrulayamadığın bir şeyi
kesin bilgi gibi sunma.

Güncel bilgi gerekiyorsa Google Search kullan.

${memoryBlock(memory)}
`;
}

/* =========================================================
   NEXUS PERSONALITY
   ========================================================= */

function nexusInstruction(memory = "") {
  return `
Sen NEXUS'sun.

JARVIS sisteminin ENGINEERING CORE ajanısın.

ANA GÖREVLERİN:

- Kodlama
- JavaScript
- React
- Node.js
- Backend
- Frontend
- API
- Sistem mimarisi
- Debug
- GitHub
- Codespaces
- Algoritmalar
- Teknik problem çözme

KARAKTERİN:

- Teknik
- Hızlı
- Mantıklı
- Yaratıcı
- Çözüm odaklı
- Gereksiz konuşmayan

Her zaman Türkçe konuş.

Mustafa sana doğrudan seslenirse
NEXUS olarak cevap ver.

Kendini JARVIS olarak tanıtma.

Sen JARVIS'in mühendislik ajanı NEXUS'sun.

Kod üretirken doğrudan uygulanabilir çözümler ver.

Bir hata görürsen yalnızca hatayı söyleme.
Mümkünse çözümünü de üret.

${memoryBlock(memory)}
`;
}

/* =========================================================
   SMART AGENT ROUTER
   ========================================================= */

function routeTask(message = "") {
  const text = String(message)
    .toLocaleLowerCase("tr-TR")
    .trim();

  const hasDilan =
    text.includes("dilan") ||
    text.includes("jarvis");

  const hasLara =
    text.includes("lara") ||
    text.includes("atlas");

  const hasVera =
    text.includes("vera") ||
    text.includes("nexus");

  const mentionedAgentCount =
    Number(hasDilan) +
    Number(hasLara) +
    Number(hasVera);

  const multiSpeakerIntent =
    text.includes("sırayla") ||
    text.includes("tek tek") ||
    text.includes("ayrı ayrı") ||
    text.includes("konuşun") ||
    text.includes("kendinizi tanıt") ||
    text.includes(" de sus") ||
    text.includes(" söyle ve sus") ||
    text.includes("ses verin");

  /*
   * İki veya daha fazla ajan açıkça konuşmaya çağrılırsa
   * Multi-Speaker modu devreye girer.
   */
  if (
    mentionedAgentCount >= 2 &&
    multiSpeakerIntent
  ) {
    return {
      mode: "multi-speaker",
      speaker: "multi",
      reason:
        "Birden fazla ajan bağımsız konuşmacı olarak çağrıldı.",
    };
  }

  /*
   * LARA + VERA ortak düşünme / analiz.
   * Burada son sözü DİLAN söyler.
   */
  const collaborative = [
    "atlas ve nexus",
    "nexus ve atlas",
    "lara ve vera",
    "vera ve lara",
    "atlas ile nexus",
    "nexus ile atlas",
    "lara ile vera",
    "vera ile lara",
    "jarvis atlas ve nexus",
    "dilan lara ve vera",
    "birlikte düşün",
    "birlikte düşünün",
    "beraber düşün",
    "beraber düşünün",
    "ortak çalış",
    "ortak çalışın",
    "ajanlar birlikte",
    "ajanlarım birlikte",
    "birlikte değerlendirin",
    "birlikte analiz edin",
    "karşılaştır ve birleştir",
    "hepiniz",
    "üçünüz",
  ];

  if (collaborative.some((x) => text.includes(x))) {
    return {
      mode: "collaborate",
      speaker: "jarvis",
      reason:
        "LARA ve VERA ortak göreve çağrıldı. Sonucu DİLAN sunacak.",
    };
  }

  /*
   * DOĞRUDAN LARA
   */
  if (hasLara) {
    return {
      mode: "atlas",
      speaker: "atlas",
      reason: "LARA doğrudan çağrıldı.",
    };
  }

  /*
   * DOĞRUDAN VERA
   */
  if (hasVera) {
    return {
      mode: "nexus",
      speaker: "nexus",
      reason: "VERA doğrudan çağrıldı.",
    };
  }

  /*
   * DOĞRUDAN DİLAN
   */
  if (hasDilan) {
    return {
      mode: "jarvis",
      speaker: "jarvis",
      reason: "DİLAN doğrudan çağrıldı.",
    };
  }

  /*
   * TEKNİK GÖREV
   */
  const technical = [
    "kod",
    "yazılım",
    "javascript",
    "react",
    "node",
    "server.js",
    "app.jsx",
    "css",
    "html",
    "api",
    "debug",
    "hata",
    "github",
    "codespaces",
    "mimari",
    "algoritma",
    "refactor",
    "backend",
    "frontend",
    "terminal",
    "fonksiyon",
    "veritabanı",
    "database",
  ];

  if (technical.some((x) => text.includes(x))) {
    return {
      mode: "nexus",
      speaker: "jarvis",
      reason:
        "Teknik görev VERA'ya yönlendirildi. Sonucu DİLAN sunacak.",
    };
  }

  /*
   * ARAŞTIRMA / GÜNCEL BİLGİ
   */
  const research = [
    "araştır",
    "internetten",
    "web",
    "google",
    "güncel",
    "bugün",
    "son dakika",
    "haber",
    "kaynak",
    "fiyat",
    "hava durumu",
    "maç",
    "puan durumu",
    "karşılaştır",
  ];

  if (research.some((x) => text.includes(x))) {
    return {
      mode: "atlas",
      speaker: "jarvis",
      reason:
        "Araştırma görevi LARA'ya yönlendirildi. Sonucu DİLAN sunacak.",
    };
  }

  return {
    mode: "jarvis",
    speaker: "jarvis",
    reason: "Normal DİLAN sohbeti.",
  };
}

/* =========================================================
   ATLAS
   GEMINI + GOOGLE SEARCH
   ========================================================= */

async function askAtlas(message, memory = "") {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,

    contents: String(message),

    config: {
      tools: [
        {
          googleSearch: {},
        },
      ],

      systemInstruction: atlasInstruction(memory),
    },
  });

  return (
    response.text ||
    "LARA şu anda araştırma sonucu üretemedi."
  );
}

/* =========================================================
   JARVIS CORE
   ========================================================= */

async function askJarvis(message, memory = "") {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,

    contents: String(message),

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

async function askNexus(message, memory = "") {
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

            {
              role: "user",
              content: String(message),
            },
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

async function createMultiSpeakerTurns(message, memory = "") {
  const normalized = String(message)
    .toLocaleLowerCase("tr-TR")
    .trim();

  console.log("⚡ MULTI-SPEAKER FAST ROUTER");

  const requestedAgents = [
    {
      speaker: "nexus",
      name: "VERA",
      aliases: ["vera", "nexus"],
    },
    {
      speaker: "atlas",
      name: "LARA",
      aliases: ["lara", "atlas"],
    },
    {
      speaker: "jarvis",
      name: "DİLAN",
      aliases: ["dilan", "jarvis"],
    },
  ]
    .map((agent) => {
      let position = Infinity;

      for (const alias of agent.aliases) {
        const index = normalized.indexOf(alias);

        if (index !== -1 && index < position) {
          position = index;
        }
      }

      return { ...agent, position };
    })
    .filter((agent) => agent.position !== Infinity)
    .sort((a, b) => a.position - b.position);

  // ⚡ HIZLI KİMLİK MODU
  // API'ye gitmez, anında cevap verir.
  const identityIntent =
    normalized.includes("ben vera") ||
    normalized.includes("ben nexus") ||
    normalized.includes("ben lara") ||
    normalized.includes("ben atlas") ||
    normalized.includes("ben dilan") ||
    normalized.includes("ben jarvis") ||
    normalized.includes("kendini tanıt") ||
    normalized.includes("kendinizi tanıt");

  if (identityIntent && requestedAgents.length >= 2) {
    console.log(
      `⚡ FAST IDENTITY → ${requestedAgents
        .map((agent) => agent.name)
        .join(" → ")}`
    );

    return requestedAgents.map((agent) => ({
      speaker: agent.speaker,
      name: agent.name,
      text: `Ben ${agent.name}'ım.`,
    }));
  }

  // ⚡ HIZLI SELAMLAMA MODU
  const greetingIntent =
    normalized.includes("merhaba deyin") ||
    normalized.includes("selam verin") ||
    normalized.includes("selam söyleyin");

  if (greetingIntent && requestedAgents.length >= 2) {
    return requestedAgents.map((agent) => ({
      speaker: agent.speaker,
      name: agent.name,
      text: `Merhaba Mustafa, ben ${agent.name}.`,
    }));
  }

  // 🧠 NORMAL MULTI-SPEAKER
  const agentsToRun = requestedAgents;

  const promises = agentsToRun.map((agent) => {
    const instruction = `
Mustafa çoklu konuşmacı modunu açtı.

Mustafa'nın komutu:

${message}

Sen ${agent.name}'sın.

Yalnızca kendi adına konuş.
Diğer ajanlar adına cevap verme.
Cevabın kısa, doğal ve doğrudan olsun.
Gereksiz açıklama yapma.
`;

    if (agent.speaker === "nexus") {
      return askNexus(instruction, memory);
    }

    if (agent.speaker === "atlas") {
      return askAtlas(instruction, memory);
    }

    return askJarvis(instruction, memory);
  });

  const results = await Promise.allSettled(promises);

  const turns = [];

  results.forEach((result, index) => {
    const agent = agentsToRun[index];

    if (result.status === "fulfilled") {
      turns.push({
        speaker: agent.speaker,
        name: agent.name,
        text: result.value,
      });
    } else {
      console.error(
        `${agent.name} MULTI-SPEAKER ERROR:`,
        result.reason
      );
    }
  });

  console.log(
    `🎭 MULTI-SPEAKER READY → ${turns
      .map((turn) => turn.name)
      .join(" → ")}`
  );

  return turns;
}

/* =========================================================
   JARVIS SYNTHESIS
   ========================================================= */

async function synthesizeAgents(
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

function directIdentityReply(message = "", speaker = "") {
  const text = String(message)
    .toLocaleLowerCase("tr-TR")
    .trim();

  const identityIntent =
    text.includes("kendini tanıt") ||
    text.includes("kendini tanit") ||
    text.includes("sen kimsin") ||
    text.includes("adın ne") ||
    text.includes("adin ne");

  if (!identityIntent) {
    return "";
  }

  if (speaker === "nexus") {
    return "Ben VERA'yım. DİLAN sisteminin mühendislik ve teknik ajanıyım. Kodlama, mimari, hata ayıklama ve sistem geliştirme işleri bende.";
  }

  if (speaker === "atlas") {
    return "Ben LARA'yım. DİLAN sisteminin araştırma ve bilgi ajanıyım. Araştırma, güncel bilgi, doğrulama ve karşılaştırma işleri bende.";
  }

  if (speaker === "jarvis") {
    return "Ben DİLAN'ım. Sistemin ana koordinatörü ve takım lideriyim. LARA ve VERA'nın çalışmalarını yönetirim.";
  }

  return "";
}

/* =========================================================
   ORCHESTRATOR
   ========================================================= */

async function orchestrate(
  message,
  memory = ""
) {
  const route = routeTask(message);

  console.log(
    `🧠 ROUTER → ${route.mode}`
  );

  /*
   * TEK AJAN HIZLI KİMLİK
   */
  const directIdentity =
    directIdentityReply(
      message,
      route.speaker
    );

  if (
    directIdentity &&
    route.mode !== "multi-speaker" &&
    route.mode !== "collaborate"
  ) {
    return {
      reply: directIdentity,
      speaker: route.speaker,
      route: "fast-identity-direct",
      agents: [route.speaker],
      reason:
        "Kimlik sorusu hızlı modda yanıtlandı.",
    };
  }

  /*
   * MULTI-SPEAKER
   */
  if (route.mode === "multi-speaker") {
    const turns =
      await createMultiSpeakerTurns(
        message,
        memory
      );

    if (!turns.length) {
      const reply =
        await askJarvis(
          message,
          memory
        );

      return {
        reply,
        speaker: "jarvis",
        route: "multi-speaker-fallback",
        agents: ["jarvis"],
        reason:
          "Multi-Speaker kullanılamadı. DİLAN görevi devraldı.",
      };
    }

    const combinedReply = turns
      .map(
        (turn) =>
          `${turn.name}: ${turn.text}`
      )
      .join("\n\n");

    return {
      reply: combinedReply,
      speaker: "multi",
      route: "multi-speaker",
      agents: turns.map(
        (turn) => turn.speaker
      ),
      turns,
      reason: route.reason,
    };
  }

  /* DIRECT ATLAS */

  if (
    route.mode === "atlas" &&
    route.speaker === "atlas"
  ) {
    const reply =
      await askAtlas(message, memory);

    return {
      reply,
      speaker: "atlas",
      route: "atlas-direct",
      agents: ["atlas"],
      reason: route.reason,
    };
  }

  /* ATLAS BACKGROUND + JARVIS SPEAKS */

  if (
    route.mode === "atlas" &&
    route.speaker === "jarvis"
  ) {
    const atlasAnswer =
      await askAtlas(message, memory);

    const reply =
      await askJarvis(
        `
Mustafa'nın isteği:

${message}

ATLAS araştırmasını tamamladı.

ATLAS RAPORU:

${atlasAnswer}

Bu araştırmayı değerlendir.

Mustafa'ya JARVIS olarak
tek ve doğal cevap ver.
`,
        memory
      );

    return {
      reply,
      speaker: "jarvis",
      route: "atlas-to-jarvis",
      agents: ["atlas", "jarvis"],
      reason: route.reason,
    };
  }

  /* DIRECT NEXUS */

  if (
    route.mode === "nexus" &&
    route.speaker === "nexus"
  ) {
    try {
      const reply =
        await askNexus(message, memory);

      return {
        reply,
        speaker: "nexus",
        route: "nexus-direct",
        agents: ["nexus"],
        reason: route.reason,
      };
    } catch (error) {
      console.error(
        "NEXUS ERROR:",
        error
      );

      const reply =
        await askJarvis(
          `
NEXUS şu anda kullanılamıyor.

Mustafa'nın isteği:

${message}

Görevi mümkün olduğunca sen devral.
`,
          memory
        );

      return {
        reply,
        speaker: "jarvis",
        route: "nexus-fallback",
        agents: ["nexus", "jarvis"],
        reason:
          "NEXUS kullanılamadı. JARVIS görevi devraldı.",
      };
    }
  }

  /* NEXUS BACKGROUND + JARVIS SPEAKS */

  if (
    route.mode === "nexus" &&
    route.speaker === "jarvis"
  ) {
    try {
      const nexusAnswer =
        await askNexus(message, memory);

      const reply =
        await askJarvis(
          `
Mustafa'nın isteği:

${message}

NEXUS teknik analizi tamamladı.

NEXUS RAPORU:

${nexusAnswer}

NEXUS'un teknik sonucunu değerlendir.

Mustafa'ya JARVIS olarak
tek ve uygulanabilir cevap ver.

Kod varsa koru.
Teknik ayrıntıları bozma.
`,
          memory
        );

      return {
        reply,
        speaker: "jarvis",
        route: "nexus-to-jarvis",
        agents: ["nexus", "jarvis"],
        reason: route.reason,
      };
    } catch (error) {
      console.error(
        "NEXUS ERROR, JARVIS FALLBACK:",
        error
      );

      const reply =
        await askJarvis(message, memory);

      return {
        reply,
        speaker: "jarvis",
        route: "jarvis-fallback",
        agents: ["nexus", "jarvis"],
        reason:
          "NEXUS kullanılamadı. JARVIS görevi devraldı.",
      };
    }
  }

  /* =====================================================
     MULTI AGENT
     ATLAS + NEXUS PARALEL
     JARVIS SONUCU SUNAR
     ===================================================== */

  if (route.mode === "collaborate") {
    const [
      atlasResult,
      nexusResult,
    ] = await Promise.allSettled([
      askAtlas(message, memory),
      askNexus(message, memory),
    ]);

    const atlasAnswer =
      atlasResult.status === "fulfilled"
        ? atlasResult.value
        : "";

    const nexusAnswer =
      nexusResult.status === "fulfilled"
        ? nexusResult.value
        : "";

    if (!atlasAnswer && !nexusAnswer) {
      const reply =
        await askJarvis(message, memory);

      return {
        reply,
        speaker: "jarvis",
        route: "jarvis-fallback",
        agents: ["jarvis"],
        reason:
          "ATLAS ve NEXUS kullanılamadı. JARVIS görevi devraldı.",
      };
    }

    if (!atlasAnswer) {
      const reply =
        await askJarvis(
          `
Mustafa'nın isteği:

${message}

ATLAS kullanılamadı.

NEXUS RAPORU:

${nexusAnswer}

NEXUS sonucunu değerlendir
ve JARVIS olarak cevap ver.
`,
          memory
        );

      return {
        reply,
        speaker: "jarvis",
        route: "collaborate-partial",
        agents: ["nexus", "jarvis"],
        reason:
          "ATLAS kullanılamadı. NEXUS ve JARVIS devam etti.",
      };
    }

    if (!nexusAnswer) {
      const reply =
        await askJarvis(
          `
Mustafa'nın isteği:

${message}

NEXUS kullanılamadı.

ATLAS RAPORU:

${atlasAnswer}

ATLAS sonucunu değerlendir
ve JARVIS olarak cevap ver.
`,
          memory
        );

      return {
        reply,
        speaker: "jarvis",
        route: "collaborate-partial",
        agents: ["atlas", "jarvis"],
        reason:
          "NEXUS kullanılamadı. ATLAS ve JARVIS devam etti.",
      };
    }

    const reply =
      await synthesizeAgents(
        message,
        atlasAnswer,
        nexusAnswer,
        memory
      );

    return {
      reply,

      speaker: "jarvis",

      route: "collaborate",

      agents: [
        "atlas",
        "nexus",
        "jarvis",
      ],

      reason: route.reason,
    };
  }

  /* NORMAL JARVIS */

  const reply =
    await askJarvis(message, memory);

  return {
    reply,
    speaker: "jarvis",
    route: "jarvis",
    agents: ["jarvis"],
    reason: route.reason,
  };
}

/* =========================================================
   STATUS
   ========================================================= */

app.get("/api/status", (req, res) => {
  res.json({
    online: true,

    system:
      "DİLAN MULTI AGENT SYSTEM",

    version: "5.3.3",

    agents: {
      jarvis: {
        ...AGENTS.jarvis,
        online: true,
      },

      atlas: {
        ...AGENTS.atlas,
        online: Boolean(
          process.env.GEMINI_API_KEY
        ),
      },

      nexus: {
        ...AGENTS.nexus,
        online: Boolean(
          process.env.OPENROUTER_API_KEY
        ),
      },
    },

    cores: {
      gemini: Boolean(
        process.env.GEMINI_API_KEY
      ),

      openrouter: Boolean(
        process.env.OPENROUTER_API_KEY
      ),

      memoryBridge: true,

      googleSearch: true,

      orchestrator: true,

      personalityCore: true,

      multiAgent: true,
      multiSpeaker: true,
      fastIdentityMode: true,
    },

    models: {
      atlas: GEMINI_MODEL,
      nexus: OPENROUTER_MODEL,
    },
  });
});

/* =========================================================
   CHAT API
   ========================================================= */

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      memory = "",
    } = req.body;

    if (
      !message ||
      !String(message).trim()
    ) {
      return res.status(400).json({
        error: "Komut bulunamadı.",
      });
    }

    const result =
      await orchestrate(
        String(message).trim(),
        memory
      );

    console.log(
      `🤖 AGENTS → ${result.agents.join(
        " + "
      )}`
    );

    console.log(
      `🎙️ SPEAKER → ${result.speaker}`
    );

    res.json(result);
  } catch (error) {
    console.error(
      "JARVIS MULTI AGENT ERROR:",
      error
    );

    res.status(500).json({
      error:
        "JARVIS Multi-Agent sistemi şu anda cevap veremiyor.",
    });
  }
});

/* =========================================================
   SERVER
   ========================================================= */

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("════════════════════════════════");
  console.log("🧠 DİLAN V5.3.2 MULTI-AGENT SYSTEM");
  console.log("════════════════════════════════");

  console.log("🔴 DİLAN // COMMAND CORE // HAZIR");

  console.log(
    `🔵 LARA // RESEARCH CORE // ${
      process.env.GEMINI_API_KEY ? "HAZIR" : "YOK"
    }`
  );

  console.log(
    `🟣 VERA // ENGINEERING CORE // ${
      process.env.OPENROUTER_API_KEY ? "HAZIR" : "YOK"
    }`
  );

  console.log(`🧠 LARA MODEL: ${GEMINI_MODEL}`);
  console.log(`🧠 VERA MODEL: ${OPENROUTER_MODEL}`);

  console.log("🎙️ MULTI-SPEAKER CORE // HAZIR");
  console.log("⚡ FAST IDENTITY MODE // HAZIR");

  console.log(`🌐 SERVER: http://localhost:${PORT}`);
  console.log("🛡️ STABLE SERVER CORE // AKTİF");

  console.log("════════════════════════════════");
  console.log("");
});

server.on("error", (error) => {
  console.error("❌ SERVER ERROR:", error);
});