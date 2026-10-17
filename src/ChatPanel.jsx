import { useEffect, useRef, useState } from 'react'

async function copyText(text) {
  if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const field=document.createElement('textarea')
  field.value=text;field.style.position='fixed';field.style.opacity='0'
  document.body.appendChild(field);field.select()
  const ok=document.execCommand('copy');field.remove()
  if(!ok) throw new Error('Kopyalanamadı')
}
function CopyButton({text}) {
  const [label,setLabel]=useState('Kopyala')
  return <button type="button" onClick={async()=>{
    try{await copyText(text);setLabel('Kopyalandı')}catch{setLabel('Tekrar dene')}
  }}>{label}</button>
}
function MessageText({text,onExpand}) {
  const parts=String(text).split(/(```[\s\S]*?```)/g)
  return parts.map((part,i)=>{
    if(!part.startsWith('```')) return <div className="chatProse" key={i}>{part}</div>
    const match=part.match(/^```([^\n]*)\n?([\s\S]*?)```$/)
    const language=match?.[1]?.trim() || 'Kod'
    const code=(match?.[2] || '').replace(/\n$/,'')
    return <section className="chatCode" key={i}>
      <header><span>{language}</span><div><CopyButton text={code}/><button type="button" onClick={()=>onExpand({language,code})}>Büyüt</button></div></header>
      <pre><code>{code}</code></pre>
    </section>
  })
}
export default function ChatPanel({history: archivedHistory,historyReady,notice,loading,pendingUser,drafts={},names={atlas:'LARA',jarvis:'DİLAN',nexus:'VERA'}}) {
  const history=historyReady ? archivedHistory || [] : []
  const scrollRef=useRef(null),nearBottom=useRef(true)
  const [unread,setUnread]=useState(false),[expanded,setExpanded]=useState(null)
  const dialogRef=useRef(null)
  const signature=JSON.stringify([history,notice,loading,pendingUser,drafts])
  useEffect(()=>{
    if(nearBottom.current){const el=scrollRef.current;if(el)el.scrollTop=el.scrollHeight;setUnread(false)}
    else setUnread(true)
  },[signature])
  useEffect(()=>{if(expanded)dialogRef.current?.showModal()},[expanded])
  const messages=history.flatMap((item,index)=>{
    if(item.role==='assistant' && item.turns?.length) return item.turns.map((turn,j)=>({key:`${index}-${j}`,role:'assistant',speaker:turn.speaker,content:turn.text,sources:item.sources}))
    return [{...item,key:String(index)}]
  })
  return <div className="chatWorkspace">
    <div className="chatMessages" ref={scrollRef} role="log" aria-label="Sohbet geçmişi" aria-live="polite" onScroll={()=>{
      const el=scrollRef.current;nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<60
      if(nearBottom.current)setUnread(false)
    }}>
      {!messages.length && !pendingUser && <div className="chatWelcome">Komutunu yaz veya mikrofona bas. Konuşmaların burada görünecek.</div>}
      {messages.map(item=><article className={`chatMessage ${item.role==='user'?'fromUser':`fromAgent agent-${item.speaker || 'jarvis'}`}`} key={item.key}>
        <header><b>{item.role==='user'?'SEN':names[item.speaker] || 'JARVIS'}</b><CopyButton text={item.content || ''}/></header>
        <MessageText text={item.content || ''} onExpand={setExpanded}/>
        {item.imageAttached && <small>Fotoğraf eklendi (görüntü saklanmadı).</small>}
        {item.sources?.length>0 && <details><summary>Kaynaklar</summary>{item.sources.filter(s=>/^https?:\/\//.test(s.url)).map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>}
      </article>)}
      {pendingUser && history.at(-2)?.content!==pendingUser && <article className="chatMessage fromUser"><header><b>SEN</b></header><div className="chatProse">{pendingUser}</div></article>}
      {Object.entries(drafts).map(([speaker,text])=><article className={`chatMessage fromAgent agent-${speaker}`} key={`draft-${speaker}`}><header><b>{speaker === 'user' ? 'SEN' : names[speaker] || 'JARVIS'} · Canlı taslak</b></header><MessageText text={text} onExpand={setExpanded}/></article>)}
      {loading && <div className="chatNotice" role="status">Yanıt hazırlanıyor…</div>}
      {!loading && notice && <article className="chatMessage chatNotice"><header><b>JARVIS</b><CopyButton text={notice}/></header><MessageText text={notice} onExpand={setExpanded}/></article>}
    </div>
    {unread && <button type="button" className="newChatMessage" onClick={()=>{
      nearBottom.current=true;const el=scrollRef.current;el.scrollTop=el.scrollHeight;setUnread(false)
    }}>Yeni mesaj ↓</button>}
    {expanded && <dialog className="expandedCode" ref={dialogRef} onCancel={()=>setExpanded(null)} onClose={()=>setExpanded(null)}>
      <header><b>{expanded.language}</b><div><CopyButton text={expanded.code}/><button type="button" onClick={()=>setExpanded(null)}>Kapat</button></div></header>
      <pre><code>{expanded.code}</code></pre>
    </dialog>}
  </div>
}

