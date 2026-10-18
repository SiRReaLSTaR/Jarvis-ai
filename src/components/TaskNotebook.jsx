import { useRef, useState } from 'react';
import { api } from '../core/api.js';
import { clockSnapshot } from '../../lib/clock.js';
import '../styles/task-notebook.css';
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
const blank = () => ({title:'',notes:'',dueDate:'',dueTime:'',priority:'normal',timeZone:ZONE});
const priorityName = {high:'Yüksek',normal:'Normal',low:'Düşük'};
export default function TaskNotebook({ todos = [], ready, connected, onRefresh }) {
  const [draft,setDraft] = useState(blank), [editing,setEditing] = useState(null), [filter,setFilter] = useState('open'), [search,setSearch] = useState('');
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [deleting,setDeleting] = useState(null);
  const inFlight = useRef(false), attempt = useRef(null), form = useRef(null);
  const dayFor = t => clockSnapshot(t.timeZone || ZONE).localDate;
  const open = todos.filter(t => t.status === 'open');
  const overdue = t => t.status === 'open' && t.dueDate && t.dueDate < dayFor(t);
  const visible = todos.filter(t => (filter === 'all' || filter === 'open' && t.status === 'open' || filter === 'done' && t.status === 'done' || filter === 'today' && t.status === 'open' && t.dueDate === dayFor(t) || filter === 'overdue' && overdue(t)) && `${t.title} ${t.notes}`.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')))
    .sort((a,b) => (a.status === 'done') - (b.status === 'done') || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || ['high','normal','low'].indexOf(a.priority)-['high','normal','low'].indexOf(b.priority));
  async function mutate(run, success, message = 'Görev kaydedildi.') {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    let saved = false;
    try { await run(); saved = true; success(); setNotice(message); }
    catch(e) { setError(e.message); setDeleting(null); }
    finally {
      // Always refresh after a conflict or an ambiguous network result.
      try { await onRefresh(); } catch { setError(saved ? 'İşlem tamamlandı; liste yenilenemedi. Bağlantıyı kontrol edin.' : 'Sunucuya ulaşılamıyor. İşlem sonucunu kontrol etmek için listeyi yenileyin.'); }
      inFlight.current = false; setBusy(false);
    }
  }
  function reset() { setDraft(blank()); setEditing(null); attempt.current=null; }
  function edit(t) { setDeleting(null); setEditing({id:t.id,version:t.version}); setDraft({title:t.title,notes:t.notes,dueDate:t.dueDate || '',dueTime:t.dueTime || '',priority:t.priority,timeZone:t.timeZone}); attempt.current=null; setError(''); form.current?.scrollIntoView({block:'nearest',behavior:'smooth'}); }
  function submit(e) {
    e.preventDefault();
    const todo = {...draft,title:draft.title.trim(),dueDate:draft.dueDate || null,dueTime:draft.dueTime || null};
    const signature = JSON.stringify(todo);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = {signature,id:crypto.randomUUID()};
    mutate(() => editing ? api(`/api/todos/${encodeURIComponent(editing.id)}`,{method:'PATCH',body:JSON.stringify({patch:todo,version:editing.version})}) : api('/api/todos',{method:'POST',body:JSON.stringify({todo,requestId:attempt.current.id})}),reset);
  }
  function remove(t) {
    const confirmed = deleting;
    if (!confirmed || confirmed.id !== t.id) return;
    mutate(() => api(`/api/todos/${encodeURIComponent(t.id)}`, {method:'DELETE',body:JSON.stringify({version:confirmed.version,confirm:true})}), () => {
      setDeleting(null);
      if (editing?.id === t.id) reset();
    }, 'Görev silindi.');
  }
  function download() {
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),todos},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='jarvis-kisisel-gorevler.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="taskNotebook" aria-label="Kişisel görev defteri">
    <div className="tnSummary"><div><small>GÖREV DEFTERİ</small><h2>Planlarını somutlaştır.</h2><p>Kişisel görevlerin tüm ajanlarda ortak. AI işlem kayıtları aşağıda ayrı tutulur.</p></div><div className="tnCounters"><span><b>{open.length}</b>Açık</span><span><b>{open.filter(overdue).length}</b>Tarihi geçen</span><span><b>{todos.length-open.length}</b>Tamamlanan</span></div></div>
    <form ref={form} className="tnForm" onSubmit={submit}>
      <div className="tnFormHeading"><h3>{editing ? 'GÖREVİ DÜZENLE' : 'YENİ GÖREV'}</h3>{editing && <button type="button" disabled={busy} onClick={reset}>Düzenlemeyi kapat</button>}</div>
      <fieldset disabled={busy || !ready || !connected}>
        <label className="tnTitle">Görev başlığı<input required value={draft.title} maxLength={200} placeholder="Örn. Müşteri teklifini hazırla" onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
        <label>Tarih<input type="date" min="2000-01-01" max="2100-12-31" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value,dueTime:e.target.value ? draft.dueTime : ''})}/></label>
        <label>Saat · isteğe bağlı<input type="time" disabled={!draft.dueDate} value={draft.dueTime} onChange={e=>setDraft({...draft,dueTime:e.target.value})}/></label>
        <label>Öncelik<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}><option value="normal">Normal</option><option value="high">Yüksek</option><option value="low">Düşük</option></select></label>
        <label className="tnNotes">Not · isteğe bağlı<textarea value={draft.notes} maxLength={2000} rows={2} placeholder="Gerekli ayrıntılar…" onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
        <button className="tnSave" type="submit">{busy ? 'Kaydediliyor…' : editing ? 'Değişiklikleri kaydet' : '+ Görev ekle'}</button>
      </fieldset>
      <p className="tnHint">Saat dilimi: {draft.timeZone}. Görev tarihi uygulama içinde gösterilir; telefon alarmı veya arka plan bildirimi kurulmaz.</p>
    </form>
    {error && <p className="tnError" role="alert">{error}</p>}{notice && <p className="tnNotice" role="status">{notice}</p>}
    <div className="tnToolbar"><div className="tnTabs" aria-label="Görev filtresi">{[['open','Açık'],['today','Bugün'],['overdue','Tarihi geçen'],['done','Tamamlanan'],['all','Tümü']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div><label><span className="mcSrOnly">Kişisel görevlerde ara</span><input value={search} placeholder="Görevlerde ara…" onChange={e=>setSearch(e.target.value)}/></label><button onClick={download} disabled={!ready}>Dışa aktar</button></div>
    <div className="tnList" aria-live="polite">{!ready ? <p className="tnEmpty">Görev defteri yükleniyor…</p> : visible.length ? visible.map(t=><article key={t.id} className={`tnTask ${t.status==='done'?'tnDone':''} ${overdue(t)?'tnOverdue':''}`}>
      <button className="tnCheck" aria-label={`${t.title}: ${t.status==='done'?'yeniden aç':'tamamla'}`} aria-pressed={t.status==='done'} disabled={busy || !connected} onClick={()=>mutate(()=>api(`/api/todos/${encodeURIComponent(t.id)}`,{method:'PATCH',body:JSON.stringify({patch:{status:t.status==='done'?'open':'done'},version:t.version})}),()=>{if(editing?.id===t.id)reset();})}>{t.status==='done'?'✓':'○'}</button>
      <div className="tnTaskBody"><h3>{t.title}</h3><div className="tnMeta"><span className={`tnPriority tn-${t.priority}`}>{priorityName[t.priority]} öncelik</span><span>{t.dueDate ? `${t.dueDate.split('-').reverse().join('.')} ${t.dueTime || ''}` : 'Tarih belirlenmedi'}</span>{t.dueTime && <span>{t.timeZone}</span>}{overdue(t) && <span className="tnLate">Tarihi geçti</span>}</div>{t.notes && <p>{t.notes}</p>}</div>
      <div className="tnRowActions"><button className="tnEdit" disabled={busy || !connected} onClick={()=>edit(t)}>Düzenle</button><button className="tnDelete" aria-label={`${t.title}: sil`} disabled={busy || !connected} onClick={()=>{setDeleting({id:t.id,version:t.version,title:t.title});setError('');setNotice('');}}>Sil</button></div>
      {deleting?.id === t.id && <div className="tnDeleteConfirm" role="group" aria-label="Görev silme onayı"><p><strong>“{deleting.title}”</strong> görevini silmek istiyor musun? Listeden kaldırılacak.</p><div><button className="tnDelete" disabled={busy || !connected} onClick={()=>remove(t)}>{busy ? 'İşleniyor…' : 'Evet, sil'}</button><button disabled={busy} onClick={()=>setDeleting(null)}>Vazgeç</button></div></div>}
    </article>) : <p className="tnEmpty">{search ? 'Aramana uygun görev bulunamadı.' : filter==='open' ? 'Açık görevin yok. İlk görevini yukarıdan ekleyebilirsin.' : 'Bu görünümde görev yok.'}</p>}</div>
    <details className="tnHelp"><summary>Yazıyla veya sesle nasıl kullanırım?</summary><p>Sohbete “Görev ekle: yarın: Teklifi hazırla”, “Görevlerim” veya “Görevi tamamla: Teklifi hazırla” yazabilirsin. Yazılı görev kaydı için bu komut biçimlerini kullan. Canlı mikrofonda “Yarın teklif hazırlamayı görev defterime ekle” diyebilirsin. Kaydı bu ekrandan kontrol et.</p></details>
  </section>;
}
