import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../core/api.js';
export default function RecoveryNotice({ recovery, onRefresh }) {
  const ref=useRef(null), id=useId();
  const [dismissed,setDismissed]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const key=recovery ? `${recovery.at || ''}-${recovery.message}` : '';
  const visible=Boolean(recovery && dismissed!==key);
  useEffect(()=>{if(visible && !ref.current?.open) ref.current?.showModal();},[visible,key]);
  if(!visible) return null;
  async function acknowledge() {
    setBusy(true);setError('');
    try {await api('/api/recovery/ack',{method:'POST'});await onRefresh();}
    catch {setError('Bildirim kapatılamadı. Bağlantıyı kontrol edip tekrar deneyin.');}
    finally {setBusy(false);}
  }
  return <dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`} onCancel={e=>{e.preventDefault();if(!busy)setDismissed(key);}} style={{maxWidth:620,lineHeight:1.7}}>
    <h2 id={`${id}-title`} style={{fontSize:20,margin:'0 0 12px'}}>Veri kurtarma bildirimi</h2>
    <p id={`${id}-text`} style={{fontSize:14,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{recovery.message}</p>
    <p style={{fontSize:13,opacity:.8}}>Hafızanı ve son görevlerini kontrol et. Yedekten dönüşte son yedekten sonraki kayıtlar eksik olabilir. Orijinal dosya korunmuştur.</p>
    {error && <p role="alert">{error}</p>}
    <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:18}}><button onClick={acknowledge} disabled={busy}>{busy?'Kaydediliyor…':'Okudum, bildirimi kapat'}</button><button onClick={()=>setDismissed(key)} disabled={busy}>Sonra incele</button></div>
  </dialog>;
}
