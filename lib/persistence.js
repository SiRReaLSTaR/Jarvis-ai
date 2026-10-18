import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, unlinkSync, statSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { normalizeState, SCHEMA_VERSION } from './state-schema.js';
const MAX_BYTES=4_000_000, KEEP=5;
let sequence=0;
const stamp=()=>`${new Date().toISOString().replace(/[^0-9]/g,'')}-${String(++sequence).padStart(6,'0')}-${randomUUID().slice(0,8)}`;
export function createPersistentStore(directory) {
  mkdirSync(directory,{recursive:true});
  const file=resolve(directory,'state.json'), backups=resolve(directory,'backups'), quarantine=resolve(directory,'quarantine');
  mkdirSync(backups,{recursive:true,mode:0o700});mkdirSync(quarantine,{recursive:true,mode:0o700});
  const read = path => {if (statSync(path).size>MAX_BYTES) throw new Error('STATE_FILE_TOO_LARGE');return readFileSync(path,'utf8');};
  const parse = raw => normalizeState(JSON.parse(raw));
  const list = prefix => readdirSync(backups).filter(n=>n.startsWith(prefix) && n.endsWith('.json')).map(name=>({name,time:statSync(resolve(backups,name)).mtimeMs})).sort((a,b)=>b.time-a.time || b.name.localeCompare(a.name));
  function archive(raw) {
    const name=`state-${stamp()}.json`;
    const path=resolve(quarantine,name), fd=openSync(path,'wx',0o600);
    try {writeFileSync(fd,raw);fsyncSync(fd);}finally{closeSync(fd);}
    return `quarantine/${name}`;
  }
  function snapshot(raw,prefix='state-') {
    const path=resolve(backups,`${prefix}${stamp()}.json`);
    const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,raw);fsyncSync(fd);}finally{closeSync(fd);}
    // Retain independent sets: frequent turns cannot evict pre-import checkpoints.
    for (const item of list(prefix).slice(KEEP)) unlinkSync(resolve(backups,item.name));
    return basename(path);
  }
  let state,lastGood=null,raw=null,initialError=null;
  try {
    raw=read(file);const loaded=parse(raw);state=loaded.state;
    if (loaded.warnings.length) {
      const archived=archive(raw);state.revision=Math.max(Date.now(),state.revision+1);state.version=Math.max(Date.now(),state.version+1);
      state.recovery={at:new Date().toISOString(),archive:archived,message:`Bozuk kayıtlar ayrıldı; geçerli kayıtlar korundu. ${loaded.warnings.join('; ')}. Orijinal dosya ${archived} içinde saklandı.`};
    } else lastGood=raw;
  } catch (error) {
    if (error.code==='STATE_FUTURE_VERSION') throw error;
    if (error.code==='ENOENT' && raw===null) state=normalizeState({}).state;
    else initialError=error;
  }
  if (initialError) {
    // Never fall back on permission/I/O errors, or replace a file we could not read safely.
    if (raw===null) throw new Error('Hafıza dosyası okunamadı veya çok büyük. Orijinal dosya korunuyor; veri kurtarma gerekli.');
    const archived=archive(raw);
    for (const item of [...list('state-'),...list('checkpoint-')].sort((a,b)=>b.time-a.time || b.name.localeCompare(a.name))) {
      try {
        const good=read(resolve(backups,item.name)), loaded=parse(good);
        if (loaded.warnings.length) continue;
        state=loaded.state;lastGood=good;
        // Increment memory revision after recovery so stale windows cannot overwrite restored memory.
        state.revision=Math.max(Date.now(),state.revision+1);state.version=Math.max(Date.now(),state.version+1);
        state.recovery={at:new Date().toISOString(),archive:archived,message:`Hafıza dosyası bozulduğu için ${item.name} yedeğinden geri yüklendi. Son yedekten sonraki kayıtlar eksik olabilir. Bozuk orijinal: ${archived}.`};break;
      } catch(error) {if (error.code==='STATE_FUTURE_VERSION') throw error;}
    }
    if (!state) {const error=new Error(`Hafıza dosyası bozuk; sağlam yedek bulunamadı. Boş hafıza oluşturulmadı. Orijinal kayıt ${archived} içinde korunuyor.`);error.code='STATE_RECOVERY_REQUIRED';throw error;}
  }
  state.tasks=state.tasks.map(t=>['running','queued'].includes(t.status)?{...t,status:'interrupted'}:t);
  function save() {
    const previousVersion=state.version;state.version++;state.schemaVersion=SCHEMA_VERSION;
    let tmp;
    try {
      const check=normalizeState(state);if(check.warnings.length) throw new Error('Geçersiz kayıt kaydedilmedi; son sağlam dosya korunuyor.');
      const next=JSON.stringify(state);if(Buffer.byteLength(next)>MAX_BYTES) throw new Error('Hafıza dosyası boyut sınırına ulaştı.');
      if (lastGood!==null) snapshot(lastGood);
      tmp=resolve(directory,`.state-${randomUUID()}.tmp`);
      const fd=openSync(tmp,'wx',0o600);try{writeFileSync(fd,next);fsyncSync(fd);}finally{closeSync(fd);}
      renameSync(tmp,file);lastGood=next;
    } catch(error) {state.version=previousVersion;if(tmp){try{unlinkSync(tmp);}catch{ /* no temporary file */ }}throw error;}
  }
  save();
  return {state,save,checkpoint(){return snapshot(lastGood,'checkpoint-');},acknowledgeRecovery(){state.recovery=null;save();},
    task(message){const task={id:randomUUID(),message:message.slice(0,2000),status:'running',createdAt:new Date().toISOString()};state.tasks.unshift(task);state.tasks=state.tasks.slice(0,100);save();return task;}};
}
