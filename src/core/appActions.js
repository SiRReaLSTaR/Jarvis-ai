import {SITE_ACTIONS,tabletAppFromCommand,normalize,commandText,hasOpenIntent,stripAction} from './commands.js'
import {moveJarvisMemory,removeJarvisMemory,detectMemoryType,addJarvisMemory,typeLabel,jarvisMemoryReport} from './memory.js'
export function createAppActions({lastLaunchRef,conversationModeRef,recognitionRef,setListening,setSpeaking,setReply,speak}) {
  function openExternal(url){
    // Tek açılış; ikinci bir yönlendirme yapma.
    const link=document.createElement('a')
    link.href=url
    link.target='_blank'
    link.rel='noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function launchApp(app, fallbackUrl){
    const label=app?.label
    const web=fallbackUrl || app?.web

    // Bu Android tablette masaüstü modu açık olsa da
    // YouTube ve Instagram doğrudan uygulamaya gitsin.
    const nativeTargets={
      YouTube:'intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end',
      Instagram:'intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;end'
    }

    const isAndroid=/Android/i.test(navigator.userAgent)
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)

    const target=nativeTargets[label] ||
      (isAndroid ? app?.android : isIOS ? app?.ios : null)

    const destination=target || web
    if(!destination) return

    const now=Date.now()
    if(lastLaunchRef.current.target===destination &&
       now-lastLaunchRef.current.time<3000) return
    lastLaunchRef.current={target:destination,time:now}

    // Uygulama açılırken dinleme döngüsünü durdur.
    conversationModeRef.current=false
    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
    setListening(false)
    setSpeaking(false)

    if(target){
      window.location.assign(target)
      return
    }

    openExternal(web)
  }

  function appByName(name){
    const q=normalize(name)
    return SITE_ACTIONS.find(s=>s.names.some(n=>q.includes(n)))
  }

  function localAction(raw){
    if(hasOpenIntent(raw)){
      const app=tabletAppFromCommand(raw)
      if(app){
        if(!app.target){
          setReply(`${app.label} listeye eklendi; ancak bu uygulamanın doğrulanmış açılış bağlantısı henüz tanımlı değil.`)
          return true
        }
        launchApp({
          label:app.label,
          android:app.target,
          ios:app.target
        })
        setReply(`${app.label} için uygulama açma isteği gönderildi.`)
        return true
      }
    }

    const q=normalize(raw)
    const cq=commandText(raw)
    if(!q) return true

    // MEMORY CORE V4.2 — categorized, duplicate-safe, natural Turkish commands.
    const memoryCue=/(?:\bhatırla\b|\bhatirla\b|\bkaydet\b|hafızana\s+(?:al|kaydet)|hafizana\s+(?:al|kaydet)|\bunutma\b)/i
    const isForget=/(?:\bunut\b|\bsil\b)/i.test(cq) && !/\bunutma\b/i.test(cq)

    // V4.2.1: move an existing record between memory categories.
    const moveMatch=cq.match(/(?:kaydını|kaydi|bunu|şunu|sunu)?\s*(.+?)\s+(?:kaydını\s+|kaydi\s+)?(?:görevlere|gorevlere|projelere|fikirlere|tercihlere|hafızaya|hafizaya)\s+(?:taşı|tasi|aktar)$/i)
    if(moveMatch?.[1]){
      const phrase=moveMatch[1]
        .replace(/^jarvis\s*/i,'')
        .replace(/^(?:kaydını|kaydi|bunu|şunu|sunu)\s*/i,'')
        .trim()
      const target=/görev|gorev/.test(cq)?'task'
        :/proje/.test(cq)?'project'
        :/fikir/.test(cq)?'idea'
        :/tercih/.test(cq)?'preference'
        :'memory'
      const ok=moveJarvisMemory(phrase,target)
      const x=ok
        ? `Kaydı ${target==='task'?'Görevler':target==='project'?'Projeler':target==='idea'?'Fikirler':target==='preference'?'Tercihler':'Hafıza'} bölümüne taşıdım Mustafa.`
        : 'Taşımak istediğin kaydı bulamadım Mustafa.'
      setReply(x); speak(x); return true
    }

    if(isForget){
      let value=cq
        .replace(/^jarvis\s*/i,'')
        .replace(/\b(unut|sil)\b/ig,'')
        .replace(/\b(bunu|şunu|sunu)\b/ig,'')
        .trim()
      if(value){
        const n=removeJarvisMemory(value)
        const x=n ? `${n} kayıt hafızadan silindi.` : 'Bu ifadeyle eşleşen bir kayıt bulamadım.'
        setReply(x); speak(x); return true
      }
    }

    if(memoryCue.test(cq)){
      let value=cq
        .replace(/^jarvis\s*/i,'')
        .replace(/\b(bunu|şunu|sunu)\b/ig,'')
        .replace(/\b(hatırla|hatirla|kaydet|unutma)\b/ig,'')
        .replace(/hafızana\s+(?:al|kaydet)/ig,'')
        .replace(/hafizana\s+(?:al|kaydet)/ig,'')
        .trim()

      if(value){
        const type=detectMemoryType(value)
        const result=addJarvisMemory(value,type)
        const x=!result.ok
          ? 'Hafızaya yazamadım Mustafa. Tarayıcı depolamasını kontrol etmemiz gerekiyor.'
          : result.duplicate
            ? `${typeLabel(type)} zaten hafızamda Mustafa. Tekrar kaydetmedim.`
            : `${typeLabel(type)} kaydettim Mustafa. ${type==='memory'?'Hafıza':type==='project'?'Projeler':type==='idea'?'Fikirler':type==='task'?'Görevler':'Tercihler'} bölümüne işlendi.`
        setReply(x); speak(x); return true
      }
    }

    // Short explicit forms: "proje: ...", "fikir: ...", "görev: ...", "tercih: ..."
    const explicit=raw.match(/^(?:jarvis[,.]?\s*)?(proje|projem|fikir|fikrim|görev|gorev|yapılacak|yapilacak|tercih|tercihim)\s*[:,-]?\s*(.+)$/i)
    if(explicit?.[2]){
      const head=commandText(explicit[1])
      const type=/proje/.test(head)?'project':/fikir/.test(head)?'idea':/(görev|gorev|yapılacak|yapilacak)/.test(head)?'task':'preference'
      const result=addJarvisMemory(explicit[2],type)
      const x=!result.ok
        ? `${typeLabel(type)} hafızaya yazamadım.`
        : result.duplicate
          ? `${typeLabel(type)} zaten hafızamda Mustafa.`
          : `${typeLabel(type)} kaydettim Mustafa.`
      setReply(x); speak(x); return true
    }

    if(/neleri hatırlıyorsun|neleri hatirliyorsun|ne hatırlıyorsun|ne hatirliyorsun|hafızanda ne var|hafizanda ne var|hafızayı göster|hafizayi goster|projelerim neler|fikirlerim neler|görevlerim neler|gorevlerim neler|tercihlerim neler/.test(cq)){
      const x=jarvisMemoryReport()
      setReply(x); speak(x); return true
    }

    // APP LAUNCHER V4.0.3 — Turkish suffix tolerant: YouTube'u, Instagram'ı, Spotify'ı...
    if(hasOpenIntent(cq)){
      const site=SITE_ACTIONS.find(s=>s.names.some(n=>{
        const name=normalize(n)
        return cq.includes(name) || cq.replace(/['’]/g,'').includes(name)
      }))
      if(site){
        launchApp(site)
        const x=`${site.label} uygulaması açılıyor.`
        setReply(x); speak(x); return true
      }
    }

    if(/saat kaç|saati söyle|saat nedir/.test(q)){
      const x=`Saat ${time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}.`
      setReply(x); speak(x); return true
    }
    if(/bugünün tarihi|tarih ne|hangi gün/.test(q)){
      const x=`Bugün ${dateText}.`
      setReply(x); speak(x); return true
    }

    const yt=cq.match(/(?:youtube(?:'?(?:da|de))?\s+)(.+?)(?:\s+(?:ara|bul|aç|ac))?$/i)
    if(yt?.[1]){
      const term=stripAction(yt[1])
      openExternal(`https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`)
      setReply(`YouTube'da “${term}” aranıyor.`); return true
    }
    const gg=q.match(/(?:google(?:'da|da)?\s+)(.+?)(?:\s+(?:ara|bul))?$/i)
    if(gg?.[1]){
      const term=stripAction(gg[1])
      openExternal(`https://www.google.com/search?q=${encodeURIComponent(term)}`)
      setReply(`Google'da “${term}” aranıyor.`); return true
    }
    const sp=q.match(/(?:spotify(?:'da|da)?\s+)(.+?)(?:\s+(?:ara|bul|çal|cal))?$/i)
    if(sp?.[1]){
      const term=stripAction(sp[1])
      openExternal(`https://open.spotify.com/search/${encodeURIComponent(term)}`)
      setReply(`Spotify'da “${term}” açılıyor.`); return true
    }
    const mp=q.match(/(?:haritada|haritalarda|google maps(?:'te|te)?)\s+(.+?)(?:\s+(?:ara|bul))?$/i)
    if(mp?.[1]){
      const term=stripAction(mp[1])
      openExternal(`https://www.google.com/maps/search/${encodeURIComponent(term)}`)
      setReply(`Haritalarda “${term}” aranıyor.`); return true
    }

    const domain=raw.match(/\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|ai|dev|app)(?:\/\S*)?)\b/i)
    if(domain && /\b(aç|ac)\b/i.test(q)){
      const url=/^https?:\/\//i.test(domain[1])?domain[1]:`https://${domain[1]}`
      openExternal(url); setReply(`${domain[1]} açılıyor.`); return true
    }
    return false
  }


return {openExternal,launchApp,appByName,localAction}
}
