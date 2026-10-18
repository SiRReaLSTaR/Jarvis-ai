import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createTodoService, todoCommand, todoFields } from '../lib/todos.js';
import { isTodoCommand } from '../lib/todo-intent.js';
import { createStore } from '../lib/runtime.js';
import { createLiveService } from '../lib/live/service.js';
const instant = Date.parse('2026-10-18T22:30:00Z');
function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'jarvis-todos-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const store=createStore(dir), events=[];
  return {dir,store,events,service:createTodoService({...store,publish:(...e)=>events.push(e),now:()=>instant})};
}
test('Schema 1 migrates to separate personal tasks without changing shared memory, profiles or AI logs', t=>{
  const f=fixture(t), memory={...f.store.state.memory,tasks:[{text:'Eski hafıza görevi'}]};
  const raw={...f.store.state,schemaVersion:1,memory,tasks:[{id:'job',message:'Araştır',status:'completed'}]};delete raw.todos;
  raw.settings.profiles.atlas.name='BİLGE';writeFileSync(join(f.dir,'state.json'),JSON.stringify(raw));
  const migrated=createStore(f.dir);assert.equal(migrated.state.schemaVersion,2);assert.deepEqual(migrated.state.todos,[]);
  assert.equal(migrated.state.tasks[0].id,'job');assert.equal(migrated.state.memory.tasks[0].text,'Eski hafıza görevi');assert.equal(migrated.state.settings.profiles.atlas.name,'BİLGE');
  assert.ok(readdirSync(join(f.dir,'backups')).some(n=>JSON.parse(readFileSync(join(f.dir,'backups',n))).schemaVersion===1));
});
test('Create, edit, complete and reopen survive restart; returned lists cannot mutate stored records', t=>{
  const f=fixture(t), item=f.service.create({title:'Teklif',dueDate:'2026-10-20',dueTime:'09:30',priority:'high'},'create-1');
  assert.equal(item.version,1);assert.equal(f.events.length,1);
  const changed=f.service.update(item.id,{notes:'Ek dosyaları hazırla',status:'done'},1);
  assert.equal(changed.version,2);assert.equal(changed.completedAt,new Date(instant).toISOString());
  const reopened=f.service.update(item.id,{status:'open'},2);assert.equal(reopened.completedAt,null);
  f.service.list()[0].title='BAD';assert.equal(f.service.list()[0].title,'Teklif');
  const restored=createStore(f.dir);assert.deepEqual(restored.state.todos,f.store.state.todos);assert.equal(restored.state.history.length,0);assert.equal(restored.state.tasks.length,0);
});
test('Repeated creation is idempotent across restarts and does not overwrite later edits', t=>{
  const f=fixture(t), item=f.service.create({title:'Fatura'},'request-1');
  assert.equal(f.service.create({title:'Fatura'},'request-1').id,item.id);
  const restarted=createStore(f.dir), service=createTodoService(restarted);
  assert.equal(service.create({title:'Fatura'},'request-1').id,item.id);assert.equal(service.list().length,1);
  assert.throws(()=>service.create({title:'Farklı'},'request-1'),e=>e.status===409);
  service.update(item.id,{status:'done'},1);
  assert.throws(()=>service.create({title:'Fatura'},'request-1'),e=>e.status===409);assert.equal(service.list().length,1);
});
test('Stale edits and missing task ids cannot modify current tasks', t=>{
  const f=fixture(t), item=f.service.create({title:'Plan'},'id');
  f.service.update(item.id,{title:'Yeni plan'},1);
  assert.throws(()=>f.service.update(item.id,{status:'done'},1),e=>e.status===409);
  assert.throws(()=>f.service.update('missing',{title:'X'},1),e=>e.status===404);
  assert.equal(f.service.list()[0].title,'Yeni plan');assert.equal(f.service.list()[0].status,'open');
});
test('Disk failure rolls back in-memory tasks and publishes no false success', t=>{
  const f=fixture(t), service=createTodoService({state:f.store.state,save(){throw new Error('disk failure');},publish(){throw new Error('should not publish');}});
  const before=structuredClone(f.store.state.todos);
  assert.throws(()=>service.create({title:'Kaydedilemez'},'no-disk'),e=>e.status===503);assert.deepEqual(f.store.state.todos,before);
  const item=f.service.create({title:'Sağlam kayıt'},'yes-disk');
  assert.throws(()=>service.update(item.id,{status:'done'},1),e=>e.status===503);assert.equal(f.store.state.todos[0].status,'open');
});
test('Reject invalid calendar dates, unbounded strings, time without date, invalid zones and unknown fields', t=>{
  const f=fixture(t);
  for(const input of [{title:''},{title:'x'.repeat(201)},{title:'X',notes:'n'.repeat(2001)},{title:'X',dueDate:'2026-02-29'},{title:'X',dueDate:'2026-04-31'},{title:'X',dueTime:'09:00'},{title:'X',dueDate:'2026-10-20',dueTime:'24:00'},{title:'X',timeZone:'invalid'},{title:'X',timeZone:null},{title:'X',timeZone:undefined},{title:'X',execute:'shell'},{title:'X',priority:'urgent'}]) assert.throws(()=>f.service.create(input,'bad'));
  assert.equal(f.service.list().length,0);assert.equal(todoFields({title:'X',dueDate:'2028-02-29'}).dueDate,'2028-02-29');
});
test('Turkish text commands use local midnight and exact unambiguous titles; unrelated chat is untouched',t=>{
  const f=fixture(t), options={timeZone:'Europe/Istanbul',now:instant,requestId:'tomorrow'};
  const answer=todoCommand('Görev ekle: yarın: Teklifi hazırla',f.service,options);assert.match(answer,/2026-10-20/);
  assert.equal(f.service.list()[0].title,'Teklifi hazırla');
  assert.match(todoCommand('Görevlerim',f.service,options),/Teklifi hazırla/);
  assert.match(todoCommand('Bugünkü görevlerim',f.service,options),/açık kişisel görevin yok/);
  assert.equal(todoCommand('Bana proje fikri ver',f.service,options),null);
  f.service.create({title:'Teklifi hazırla'},'second');
  assert.match(todoCommand('Görevi tamamla: Teklifi hazırla',f.service,options),/birden fazla/);assert.equal(f.service.list().filter(t=>t.status==='done').length,0);
  f.service.update(f.service.list()[0].id,{title:'Başka görev'},1);
  assert.match(todoCommand('GÖREVİ TAMAMLA: Teklifi hazırla',f.service,options),/Tamamlandı/);
  assert.match(todoCommand('Görev ekle:',f.service,options),/Komut örneği/);assert.equal(isTodoCommand('Görev ekle: kaydet tuşunu düzelt'),true);assert.equal(isTodoCommand('Görevlerim'),true);assert.equal(isTodoCommand('Görev ekleme nasıl çalışır?'),false);
});
test('Malformed todo is quarantined and valid todo survives', t=>{
  const f=fixture(t);f.service.create({title:'Sağlam'},'valid');
  const path=join(f.dir,'state.json'), raw=JSON.parse(readFileSync(path));raw.todos.push({title:'bozuk'});writeFileSync(path,JSON.stringify(raw));
  const recovered=createStore(f.dir);assert.equal(recovered.state.todos.length,1);assert.match(recovered.state.recovery.message,/Kişisel görevler/);assert.ok(readdirSync(join(f.dir,'quarantine')).length);
});
test('Live task tools validate owners, cache mutations, reject changed replay, and do not mutate closed turns', async t=>{
  const f=fixture(t), live=createLiveService({state:f.store.state,save:f.store.save,publish(){},todos:f.service,providers:{},context:new AsyncLocalStorage(),now:()=>instant,tokenClient:{authTokens:{create:async()=>({name:'auth_tokens/test'})}}});
  const lease=await live.start({agent:'atlas',owner:'client',timeZone:'Europe/Istanbul'});
  const call={id:'create-1',name:'create_todo',args:{title:'Sesli görev',dueDate:'2026-10-20'}};
  await assert.rejects(live.tool(lease.id,'other',call,'turn-1'));assert.equal(f.service.list().length,0);
  const [a,b]=await Promise.all([live.tool(lease.id,'client',call,'turn-1'),live.tool(lease.id,'client',call,'turn-1')]);
  assert.equal(a.todo.id,b.todo.id);assert.equal(f.service.list().length,1);
  await assert.rejects(live.tool(lease.id,'client',{...call,args:{title:'Farklı'}},'turn-1'));
  const listed=await live.tool(lease.id,'client',{id:'list',name:'list_todos',args:{}},'turn-1');assert.equal(listed.todos[0].title,'Sesli görev');
  const done=await live.tool(lease.id,'client',{id:'finish',name:'update_todo',args:{id:a.todo.id,version:1,status:'done'}},'turn-1');assert.equal(done.saved,true);
  const conflict=await live.tool(lease.id,'client',{id:'stale',name:'update_todo',args:{id:a.todo.id,version:1,title:'stale'}},'turn-1');assert.equal(conflict.saved,false);
  live.turn(lease.id,'client',{turnId:'turn-1',user:'Görev ekle',assistant:'Eklendi'});
  const late=await live.tool(lease.id,'client',{id:'late',name:'create_todo',args:{title:'Geç kayıt'}},'turn-1');assert.ok(late.error);assert.equal(f.service.list().length,1);
  live.stop(lease.id,'client');await assert.rejects(live.tool(lease.id,'client',{id:'after',name:'list_todos'}));
});
