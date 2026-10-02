import {exactAgent} from '../runtime.js'
import {routeTask} from './router.js'
export function createOrchestrator({askAtlas,askJarvis,askNexus,synthesizeAgents}) {
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
        const index = (exactAgent(normalized, [alias]) ? normalized.indexOf(alias) : -1);

        if (index !== -1 && index < position) {
          position = index;
        }
      }

      return { ...agent, position };
    })
    .filter((agent) =>
      agent.position !== Infinity ||
      ((exactAgent(normalized, ["kızlar", "kizlar", "hepiniz", "üçünüz", "ucunuz"]) || /(?:^|\s)kendinizi\s+tan[ıi]t/u.test(normalized)) &&
       !exactAgent(normalized, ["dilan", "dılan", "jarvis", "lara", "atlas", "vera", "nexus"]))
    )
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
      text: `Ben ${agent.name.charAt(0) + agent.name.slice(1).toLocaleLowerCase("tr-TR")}.`,
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
    return "Ben VERA. Ekibin kodcusuyum. Buglar biraz artistlik yapabilir ama beraber toparlarız Mustafa. Kod, mimari ve hata ayıklama bende; test etmediysem de ettim diye hava atmam.";
  }

  if (speaker === "atlas") {
    return "Ben LARA. Araştırma ve doğrulama bende. Tahminle kanıtı birbirine karıştırmam, Mustafa. Sorunu söyle; önce ne bildiğimize bakalım.";
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


return {orchestrate}
}
