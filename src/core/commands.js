const SITE_ACTIONS = [
  { names:['youtube'], label:'YouTube', web:'https://www.youtube.com', ios:'youtube://', android:'vnd.youtube://' },
  { names:['google'], label:'Google', web:'https://www.google.com', ios:'google://', android:'googlechrome://' },
  { names:['spotify'], label:'Spotify', web:'https://open.spotify.com', ios:'spotify://', android:'spotify://' },
  { names:['instagram','ınstagram','insta gram','ınsta gram'], label:'Instagram', web:'https://www.instagram.com', ios:'instagram://app', android:'instagram://app' },
  { names:['facebook'], label:'Facebook', web:'https://www.facebook.com', ios:'fb://', android:'fb://' },
  { names:['twitter','x.com'], label:'X', web:'https://x.com', ios:'twitter://', android:'twitter://' },
  { names:['github'], label:'GitHub', web:'https://github.com' },
  { names:['gmail'], label:'Gmail', web:'https://mail.google.com', ios:'googlegmail://', android:'googlegmail://' },
  { names:['google maps','haritalar','harita'], label:'Google Maps', web:'https://maps.google.com', ios:'comgooglemaps://', android:'geo:0,0?q=' },
  { names:['google drive','drive'], label:'Google Drive', web:'https://drive.google.com', ios:'googledrive://', android:'googledrive://' },
  { names:['google takvim','takvim'], label:'Google Takvim', web:'https://calendar.google.com' },
]

const QUICK = [
  ['G','Google','https://www.google.com'],
  ['▶','YouTube','https://www.youtube.com'],
  ['♫','Spotify','https://open.spotify.com'],
  ['✦','Haritalar','https://maps.google.com'],
  ['✉','Gmail','https://mail.google.com'],
  ['▣','Takvim','https://calendar.google.com'],
]


// TABLET APPLICATION REGISTRY
const TABLET_APPS = [
  {
    "label": "YouTube",
    "names": [
      "youtube",
      "you tube"
    ],
    "target": "intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end"
  },
  {
    "label": "Instagram",
    "names": [
      "instagram",
      "ınstagram",
      "insta gram"
    ],
    "target": "intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;end"
  },
  {
    "label": "WhatsApp",
    "names": [
      "whatsapp",
      "whats app",
      "vatsap"
    ],
    "target": "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.whatsapp;end"
  },
  {
    "label": "Telegram",
    "names": [
      "telegram"
    ],
    "target": "tg://"
  },
  {
    "label": "Discord",
    "names": [
      "discord",
      "diskord"
    ],
    "target": "discord://"
  },
  {
    "label": "TikTok",
    "names": [
      "tiktok",
      "tik tok"
    ],
    "target": "intent://www.tiktok.com/#Intent;scheme=https;package=com.zhiliaoapp.musically;end"
  },
  {
    "label": "ChatGPT",
    "names": [
      "chatgpt",
      "chat gpt",
      "çat gpt"
    ],
    "target": "intent://chatgpt.com/#Intent;scheme=https;package=com.openai.chatgpt;end"
  },
  {
    "label": "Gemini",
    "names": [
      "gemini",
      "cemini"
    ],
    "target": "intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;end"
  },
  {
    "label": "GitHub",
    "names": [
      "github",
      "git hub"
    ],
    "target": "intent://github.com/#Intent;scheme=https;package=com.github.android;end"
  },
  {
    "label": "Pinterest",
    "names": [
      "pinterest"
    ],
    "target": "intent://www.pinterest.com/#Intent;scheme=https;package=com.pinterest;end"
  },
  {
    "label": "Prime Video",
    "names": [
      "prime video",
      "amazon prime"
    ],
    "target": "intent://www.primevideo.com/#Intent;scheme=https;package=com.amazon.avod.thirdpartyclient;end"
  },
  {
    "label": "Google",
    "names": [
      "google",
      "gugıl"
    ],
    "target": "intent://www.google.com/#Intent;scheme=https;package=com.google.android.googlequicksearchbox;end"
  },
  {
    "label": "Chrome",
    "names": [
      "chrome",
      "krom",
      "google chrome"
    ],
    "target": "intent://www.google.com/#Intent;scheme=https;package=com.android.chrome;end"
  },
  {
    "label": "Opera",
    "names": [
      "opera"
    ],
    "target": "intent://www.google.com/#Intent;scheme=https;package=com.opera.browser;end"
  },
  {
    "label": "Play Store",
    "names": [
      "play store",
      "play market",
      "google play"
    ],
    "target": "market://search?q="
  },
  {
    "label": "Keep Notları",
    "names": [
      "keep",
      "keep notları",
      "google keep"
    ],
    "target": "intent://keep.google.com/#Intent;scheme=https;package=com.google.android.keep;end"
  },
  {
    "label": "Gmail",
    "names": [
      "gmail",
      "g mail"
    ],
    "target": "intent://mail.google.com/#Intent;scheme=https;package=com.google.android.gm;end"
  },
  {
    "label": "Haritalar",
    "names": [
      "haritalar",
      "google maps",
      "harita"
    ],
    "target": "geo:0,0?q="
  },
  {
    "label": "Google Drive",
    "names": [
      "google drive",
      "drive"
    ],
    "target": "intent://drive.google.com/#Intent;scheme=https;package=com.google.android.apps.docs;end"
  },
  {
    "label": "Takvim",
    "names": [
      "takvim",
      "google takvim"
    ],
    "target": "intent://calendar.google.com/#Intent;scheme=https;package=com.google.android.calendar;end"
  },
  {
    "label": "Spotify",
    "names": [
      "spotify"
    ],
    "target": "spotify://"
  },
  {
    "label": "Ayarlar",
    "names": [
      "ayarlar"
    ],
    "target": "intent:#Intent;action=android.settings.SETTINGS;end"
  },
  {
    "label": "Kamera",
    "names": [
      "kamera"
    ],
    "target": "intent:#Intent;action=android.media.action.STILL_IMAGE_CAMERA;end"
  },
  {
    "label": "Saat",
    "names": [
      "saat",
      "alarmlar"
    ],
    "target": "intent:#Intent;action=android.intent.action.SHOW_ALARMS;end"
  },
  {
    "label": "Garanti BBVA",
    "names": [
      "garanti",
      "garanti bbva"
    ],
    "target": null
  },
  {
    "label": "MobilDeniz",
    "names": [
      "mobildeniz",
      "mobil deniz",
      "denizbank"
    ],
    "target": null
  },
  {
    "label": "İşCep",
    "names": [
      "işcep",
      "iş cep",
      "iscep"
    ],
    "target": null
  },
  {
    "label": "GSPara",
    "names": [
      "gspara",
      "gs para"
    ],
    "target": null
  },
  {
    "label": "NETV GOLD V11",
    "names": [
      "netv",
      "netv gold",
      "netv gold v11"
    ],
    "target": null
  },
  {
    "label": "VPN Super Unlimited Proxy",
    "names": [
      "vpn",
      "vpn super unlimited proxy"
    ],
    "target": null
  },
  {
    "label": "Sunday City",
    "names": [
      "sunday city"
    ],
    "target": null
  },
  {
    "label": "OneState",
    "names": [
      "onestate",
      "one state"
    ],
    "target": null
  },
  {
    "label": "Mobile Legends: Bang Bang",
    "names": [
      "mobile legends",
      "mobile legends bang bang"
    ],
    "target": null
  },
  {
    "label": "Sistem Yöneticisi",
    "names": [
      "sistem yöneticisi",
      "sistem yoneticisi"
    ],
    "target": null
  },
  {
    "label": "Flow",
    "names": [
      "flow"
    ],
    "target": null
  },
  {
    "label": "Dosyalar",
    "names": [
      "dosyalar",
      "dosya yöneticisi"
    ],
    "target": null
  },
  {
    "label": "Galeri",
    "names": [
      "galeri",
      "fotoğraflar"
    ],
    "target": null
  },
  {
    "label": "Notlar",
    "names": [
      "notlar"
    ],
    "target": null
  },
  {
    "label": "Temalar",
    "names": [
      "temalar"
    ],
    "target": null
  },
  {
    "label": "Araçlar klasörü",
    "names": [
      "araçlar",
      "araclar"
    ],
    "target": null
  },
  {
    "label": "Klasör 1",
    "names": [
      "klasör 1",
      "klasor 1"
    ],
    "target": null
  }
]

function tabletAppFromCommand(raw){
  const fold = value => commandText(value)
    .replace(/ı/g,'i').replace(/ş/g,'s')
    .replace(/ğ/g,'g').replace(/ü/g,'u')
    .replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/['’]/g,'')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim()

  const text=' '+fold(raw)+' '
  const endings=['','i','u','yi','yu','ni','nu']

  const candidates=TABLET_APPS
    .flatMap(app=>app.names.map(name=>({app,name:fold(name)})))
    .sort((a,b)=>b.name.length-a.name.length)

  return candidates.find(({name})=>
    endings.some(ending=>text.includes(' '+name+ending+' '))
  )?.app
}

const normalize = (s='') => s.toLocaleLowerCase('tr-TR').trim()

const commandText = (s='') => normalize(s)
  .replace(/[’‘`´]/g,"'")
  .replace(/[.,!?;]+/g,' ')
  .replace(/\s+/g,' ')
  .trim()

const hasOpenIntent = (s='') =>
  /(?:^|\s)(?:aç|ac|açar mısın|acar misin|açarmısın|acarmisin|açabilir misin|acabilir misin|açsana)(?=$|\s)/u.test(commandText(s))

const stripAction = (s='') => s
  .replace(/\s+(ara|arar mısın|arar misin|bul|bulur musun|aç|ac|açar mısın|acar misin)\s*$/i,'')
  .trim()



export { SITE_ACTIONS, QUICK, TABLET_APPS, tabletAppFromCommand, normalize, commandText, hasOpenIntent, stripAction }
