import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createStore, emptyMemory, exactAgent } from '../lib/runtime.js';
import { SCHEMA_VERSION } from '../lib/state-schema.js';
import { agentHistory } from '../lib/agent-context.js';
import { defaultSettings, mergeSettings } from '../lib/settings.js';
import { agentAliases, aliasPosition } from '../lib/agents/aliases.js';
import { routeTask } from '../lib/agents/router.js';
import { createOrchestrator } from '../lib/agents/orchestrator.js';
import { publicProviderError } from '../lib/provider-errors.js';
import { createJobs } from '../lib/jobs.js';
import { createLiveService } from '../lib/live/service.js';
const fixture=()=>{const dir=mkdtempSync(join(tmpdir(),'jarvis-safe-'));return {dir,file:join(dir,'state.json'),clean(){rmSync(dir,{recursive:true,force:true});}};};
const names=(dir,prefix)=>readdirSync(join(dir,'backups')).filter(n=>n.startsWith(prefix)).sort();

test('Legacy state upgrades without losing memory, agent names, voices or personalities',()=>{
 const f=fixture();try {
  const memory=emptyMemory();memory.projects.push({id:'p',text:'Robot projesi'});
  writeFileSync(f.file,JSON.stringify({memory,history:[{role:'user',content:'Eski konuşma'}],tasks:[],settings:mergeSettings(defaultSettings(),{profiles:{nexus:{name:'Usta',voice:'Kore',personality:'Esprili ol'}}}),revision:7}));
  const s=createStore(f.dir);assert.equal(s.state.schemaVersion,SCHEMA_VERSION);assert.equal(s.state.memory.projects[0].text,'Robot projesi');assert.equal(s.state.settings.profiles.nexus.name,'Usta');assert.equal(s.state.settings.profiles.nexus.voice,'Kore');assert.equal(s.state.settings.profiles.nexus.personality,'Esprili ol');assert.equal(s.state.revision,7);assert.equal(s.state.history.length,1);assert.equal(s.state.recovery,null);
 } finally {f.clean();}
});
test('Rolling snapshots are bounded; pre-import checkpoints survive frequent turns',()=>{
 const f=fixture();try {
  const s=createStore(f.dir);s.state.memory.memories.push({text:'İçe aktarma öncesi'});s.save();const checkpoint=s.checkpoint();
  s.state.memory.memories=[{text:'İçe aktarılan'}];s.save();for(let i=0;i<14;i++){s.state.version++;s.save();}
  assert.equal(names(f.dir,'state-').length,5);assert.equal(names(f.dir,'checkpoint-').length,1);
  assert.equal(JSON.parse(readFileSync(join(f.dir,'backups',checkpoint))).memory.memories[0].text,'İçe aktarma öncesi');
  for(let i=0;i<8;i++)s.checkpoint();assert.equal(names(f.dir,'checkpoint-').length,5);
  assert.equal(statSync(f.file).mode&0o777,0o600);
 } finally {f.clean();}
});
test('Corrupt JSON restores the latest valid backup and preserves original bytes',()=>{
 const f=fixture();try {
  const s=createStore(f.dir);s.state.memory.projects=[{text:'İlk sağlam sürüm'}];s.state.revision=4;s.save();s.state.memory.projects=[{text:'Sonraki sürüm'}];s.save();
  writeFileSync(f.file,'{BROKEN');const restored=createStore(f.dir);
  assert.equal(restored.state.memory.projects[0].text,'İlk sağlam sürüm');assert.ok(restored.state.revision>4);assert.ok(restored.state.version>s.state.version);assert.match(restored.state.recovery.message,/yedeğinden geri yüklendi/);
  assert.equal(readFileSync(join(f.dir,restored.state.recovery.archive),'utf8'),'{BROKEN');
  restored.acknowledgeRecovery();assert.equal(createStore(f.dir).state.recovery,null);
 } finally {f.clean();}
});
test('Corrupt latest backup is skipped in favor of an earlier healthy one',()=>{
 const f=fixture();try {
  const s=createStore(f.dir);s.state.memory.projects=[{text:'Bir'}];s.save();s.state.memory.projects=[{text:'İki'}];s.save();s.state.memory.projects=[{text:'Üç'}];s.save();
  const latest=names(f.dir,'state-').at(-1);writeFileSync(join(f.dir,'backups',latest),'broken-backup');writeFileSync(f.file,'broken-primary');
  assert.equal(createStore(f.dir).state.memory.projects[0].text,'Bir');
 } finally {f.clean();}
});
test('Malformed list items are quarantined while valid records remain usable',()=>{
 const f=fixture();try {
  const memory=emptyMemory();memory.ideas=[null,{text:'İyi fikir'},{text:123}];
  const original=JSON.stringify({memory,history:[null,{role:'user',agent:'atlas',content:'Geçerli soru'}],tasks:[null,{id:'ok',message:'İş',status:'running'}],settings:{profiles:{nexus:{voice:'bad',name:'Usta'}}}});
  writeFileSync(f.file,original);const s=createStore(f.dir);
  assert.deepEqual(agentHistory(s.state.history,'atlas'),[{role:'user',content:'Geçerli soru'}]);assert.equal(s.state.memory.ideas.length,1);assert.equal(s.state.tasks[0].status,'interrupted');assert.equal(s.state.settings.profiles.nexus.name,'Usta');assert.equal(s.state.settings.profiles.nexus.voice,'Puck');assert.match(s.state.recovery.message,/geçersiz/);assert.equal(readFileSync(join(f.dir,s.state.recovery.archive),'utf8'),original);
 } finally {f.clean();}
});
test('No healthy backup means explicit failure, never a silently emptied memory',()=>{
 const f=fixture();try {
  writeFileSync(f.file,'only-copy-is-broken');assert.throws(()=>createStore(f.dir),e=>e.code==='STATE_RECOVERY_REQUIRED');assert.equal(readFileSync(f.file,'utf8'),'only-copy-is-broken');assert.equal(readdirSync(join(f.dir,'quarantine')).length,1);
 } finally {f.clean();}
});
test('Wrong top-level data types restore backups instead of crashing through null tasks',()=>{
 const f=fixture();try {
  const s=createStore(f.dir);s.state.memory.memories=[{text:'Korunacak'}];s.save();s.save();writeFileSync(f.file,JSON.stringify({memory:{},history:[],tasks:[]}));assert.equal(createStore(f.dir).state.memory.memories[0].text,'Korunacak');
 } finally {f.clean();}
});
test('Future schemas are never downgraded or replaced with older backup data',()=>{
 const f=fixture();try {
  const s=createStore(f.dir);s.save();const raw=JSON.stringify({...s.state,schemaVersion:999});writeFileSync(f.file,raw);assert.throws(()=>createStore(f.dir),e=>e.code==='STATE_FUTURE_VERSION');assert.equal(readFileSync(f.file,'utf8'),raw);assert.equal(readdirSync(join(f.dir,'quarantine')).length,0);
 } finally {f.clean();}
});
test('Invalid in-memory save cannot overwrite the last healthy primary',()=>{
 const f=fixture();try {
  const s=createStore(f.dir),raw=readFileSync(f.file,'utf8');s.state.history.push(null);assert.throws(()=>s.save(),/Geçersiz kayıt/);assert.equal(readFileSync(f.file,'utf8'),raw);
 } finally {f.clean();}
});
test('Renamed agents route by Unicode-safe whole names, including multiword names',()=>{
 const settings=mergeSettings(defaultSettings(),{profiles:{atlas:{name:'Bilge Kişi'},nexus:{name:'Yazılımcı'},jarvis:{name:'Komutan'}}});
 assert.equal(routeTask('Bilge Kişi, bu konuyu incele',settings).mode,'atlas');assert.equal(routeTask('YAZILIMCI, selam',settings).mode,'nexus');assert.equal(routeTask('Komutan',settings).mode,'jarvis');assert.equal(routeTask('Bilge Kişi ve Yazılımcı sırayla kendinizi tanıtın',settings).mode,'multi-speaker');assert.equal(exactAgent('dosyalara bak',['lara']),false);assert.equal(aliasPosition('bilge kişilere sor',['Bilge Kişi']),-1);
});
test('Aliases cannot turn regex punctuation into instructions or steal another canonical name',()=>{
 assert.equal(exactAgent('anything',['.*']),false);
 const aliases=agentAliases(mergeSettings(defaultSettings(),{profiles:{nexus:{name:'Lara'}}}));assert.equal(aliasPosition('Lara',aliases.nexus),-1);assert.equal(aliasPosition('Lara',aliases.atlas),0);
});
test('Renamed multi-agent identity preserves requested order without provider calls',async()=>{
 const settings=mergeSettings(defaultSettings(),{profiles:{atlas:{name:'Bilge'},nexus:{name:'Usta'},jarvis:{name:'Komutan'}}});
 const {orchestrate}=createOrchestrator({getSettings:()=>settings});const result=await orchestrate('Usta Bilge Komutan sırayla kendinizi tanıtın');assert.deepEqual(result.turns.map(t=>t.name),['Usta','Bilge','Komutan']);
});
test('Provider errors distinguish quota, key, permission, model, timeout and connection without leaking secrets',()=>{
 for(const [error,code] of [[{status:429},'QUOTA'],[{status:401},'AUTH'],[{status:403},'ACCESS'],[{status:404},'MODEL'],[{name:'TimeoutError'},'TIMEOUT'],[{status:503},'UNAVAILABLE'],[{code:'MISSING_KEY'},'MISSING_KEY'],[{message:'fetch failed',cause:{code:'ENOTFOUND'}},'NETWORK']]) assert.equal(publicProviderError(error).code,code);
 const result=publicProviderError({status:429,message:'https://provider/?key=SECRET_KEY user PRIVATE_PROMPT',request:{headers:{authorization:'SECRET_KEY'}}});assert.doesNotMatch(JSON.stringify(result),/SECRET_KEY|PRIVATE_PROMPT|https:/);
});
test('Failed jobs expose only a classified safe error, not raw provider content',async()=>{
 const f=fixture();try {
  const store=createStore(f.dir),events=[];
  const jobs=createJobs({store,context:new AsyncLocalStorage(),publish:(type,data)=>events.push({type,data}),orchestrate:async()=>{throw Object.assign(new Error('key=SECRET private prompt'),{status:429});}});
  await jobs.start('Soru','test').done;assert.equal(store.state.tasks[0].errorCode,'QUOTA');assert.match(store.state.tasks[0].error,/kota/);assert.doesNotMatch(JSON.stringify(events),/SECRET|private prompt/);
 } finally {f.clean();}
});
function liveFixture(providersFactory) {
 const context=new AsyncLocalStorage(),state={settings:defaultSettings(),memory:emptyMemory(),history:[]};
 const service=createLiveService({state,context,save(){},publish(){},providers:providersFactory(context),tokenClient:{authTokens:{create:async()=>({name:'auth_tokens/test'})}}});
 return {state,service};
}
const req={agent:'jarvis',owner:'test',timeZone:'Europe/Istanbul'};
test('Sources belong to one turn, merge experts, and never appear in a later unrelated answer',async()=>{
 const f=liveFixture(context=>({askAtlas:async()=>{context.getStore().sources.push({url:'https://example.com/a',title:'A'});return 'A';},askNexus:async()=>{context.getStore().sources.push({url:'https://example.com/b',title:'B'});return 'B';}}));
 const l=await f.service.start(req);
 for(const [id,agent] of [['a','atlas'],['b','nexus']])await f.service.tool(l.id,'test',{id,name:'ask_expert',args:{agent,question:'İncele'}},'turn-a');
 f.service.turn(l.id,'test',{turnId:'turn-a',user:'Soru',assistant:'Kaynaklı yanıt'});assert.equal(f.state.history.at(-1).sources.length,2);
 f.service.turn(l.id,'test',{turnId:'turn-b',user:'Selam',assistant:'Merhaba'});assert.deepEqual(f.state.history.at(-1).sources,[]);assert.equal(f.state.history.at(-3).sources.length,2);f.service.stop(l.id,'test');
});
test('Late expert completion after a committed turn cannot contaminate a new turn',async()=>{
 let finish;const f=liveFixture(context=>({askAtlas:()=>{const run=context.getStore();return new Promise(resolve=>{finish=()=>{run.sources.push({url:'https://example.com/late',title:'Late'});resolve('Late');};});}}));
 const l=await f.service.start(req);const work=f.service.tool(l.id,'test',{id:'late',name:'ask_expert',args:{agent:'atlas',question:'Bekle'}},'a');
 f.service.turn(l.id,'test',{turnId:'a',user:'İptal',assistant:'',interrupted:true});finish();await work;
 f.service.turn(l.id,'test',{turnId:'b',user:'Selam',assistant:'Merhaba'});assert.deepEqual(f.state.history.at(-1).sources,[]);f.service.stop(l.id,'test');
});
test('Older live clients also consume their source list exactly once',async()=>{
 const f=liveFixture(context=>({askAtlas:async()=>{context.getStore().sources.push({url:'https://example.com',title:'A'});return 'A';}}));const l=await f.service.start(req);
 await f.service.tool(l.id,'test',{id:'old',name:'ask_expert',args:{agent:'atlas',question:'Araştır'}});
 f.service.turn(l.id,'test',{turnId:'1',user:'Soru',assistant:'Yanıt'});assert.equal(f.state.history.at(-1).sources.length,1);
 f.service.turn(l.id,'test',{turnId:'2',user:'Selam',assistant:'Merhaba'});assert.equal(f.state.history.at(-1).sources.length,0);f.service.stop(l.id,'test');
});

test('Browser does not send late tool results into the following spoken turn',async()=>{
 const {createLiveController}=await import('../src/live/controller.js');let callbacks,finish,responseCount=0;const sourceUpdates=[];
 const audio={resume:async()=>{},close:async()=>{},audioWorklet:{addModule:async()=>{}},destination:{},createMediaStreamSource:()=>({connect(){},disconnect(){}}),createGain:()=>({gain:{},connect(){},disconnect(){}})};
 const socket={close(){},sendRealtimeInput(){},sendClientContent(){},sendToolResponse(){responseCount++;}};
 const controller=createLiveController({client:'browser',onState(){},onTranscript(){},onSources:x=>sourceUpdates.push(x),audioFactory:()=>audio,workletFactory:()=>({port:{},connect(){},disconnect(){}}),media:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})},clientFactory:async()=>({live:{connect:async opts=>{callbacks=opts.callbacks;return socket;}}}),api:async(path,options)=>{
  if(path==='/api/live/start')return {id:'lease',token:'auth_tokens/test',model:'mock',config:{},expiresAt:new Date(Date.now()+5000).toISOString()};
  if(path.endsWith('/tool')) {assert.equal(JSON.parse(options.body).turnId,'lease-0');return new Promise(resolve=>{finish=()=>resolve({answer:'late',sources:[{url:'https://example.com',title:'late'}]});});}
  return {saved:true};
 }});
 await controller.start({agent:'jarvis',timeZone:'Europe/Istanbul'});
 callbacks.onmessage({serverContent:{inputTranscription:{text:'Araştır'}}});
 callbacks.onmessage({toolCall:{functionCalls:[{id:'tool',name:'ask_expert',args:{agent:'atlas',question:'Araştır'}}]}});
 callbacks.onmessage({serverContent:{turnComplete:true}});finish();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(responseCount,0);assert.ok(sourceUpdates.every(x=>x.length===0));controller.stop();
});
