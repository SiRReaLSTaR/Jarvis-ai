import {exactAgent} from '../runtime.js'
function routeTask(message = "") {
  const text = String(message)
    .toLocaleLowerCase("tr-TR")
    .trim();

  const hasDilan =
    exactAgent(text, ["dilan", "dılan", "jarvis"]);

  const hasLara =
    exactAgent(text, ["lara", "atlas"]);

  const hasVera =
    exactAgent(text, ["vera", "nexus"]);

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
    (mentionedAgentCount >= 2 && multiSpeakerIntent) ||
    (mentionedAgentCount === 0 &&
      (exactAgent(text, ["kızlar", "kizlar", "hepiniz", "üçünüz", "ucunuz"]) || /(?:^|\s)kendinizi\s+tan[ıi]t/u.test(text)))
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
  if (hasDilan && /^(dilan|dılan|jarvis)[ ,:]*$/u.test(text)) {
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


// LIVE AGENT STATES

export { routeTask }
