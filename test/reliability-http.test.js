import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, emptyMemory } from '../lib/runtime.js';

test('HTTP: renamed status, classified quota errors, pre-import checkpoint, recovery acknowledgement',async()=>{
  const {createApp}=await import('../server.js');
  const dir=mkdtempSync(join(tmpdir(),'jarvis-safe-http-')),previous=process.env.JARVIS_ACCESS_TOKEN;
  process.env.JARVIS_ACCESS_TOKEN='test-reliability-token';
  const store=createStore(dir);store.state.settings.profiles.jarvis.name='Komutan';store.state.memory.memories.push({text:'Önceki hafıza'});store.save();
  const {app,hub}=createApp({store,providersFactory:()=>({agentStates:{},askJarvis:async()=>{throw Object.assign(new Error('private key=SECRET'),{status:429});}})});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`,headers={authorization:'Bearer test-reliability-token','content-type':'application/json'};
  const call=(path,body)=>fetch(base+path,{headers,...(body!==undefined?{method:'POST',body:JSON.stringify(body)}:{})});
  try {
    const status=await (await call('/api/status')).json();assert.equal(status.agents.jarvis.name,'Komutan');assert.equal(status.dataSchemaVersion,1);assert.equal(status.usageMode,'single-user');
    assert.equal((await fetch(base+'/api/recovery/ack',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401);
    const memory=emptyMemory();memory.projects.push({text:'Yeni kayıt'});
    const result=await fetch(base+'/api/memory',{method:'PUT',headers,body:JSON.stringify({memory,revision:store.state.revision})});assert.equal(result.status,200);
    const checkpoint=readdirSync(join(dir,'backups')).find(n=>n.startsWith('checkpoint-'));assert.ok(checkpoint);assert.equal(JSON.parse(readFileSync(join(dir,'backups',checkpoint))).memory.memories[0].text,'Önceki hafıza');
    store.state.recovery={at:new Date().toISOString(),message:'Kurtarma testi'};store.save();assert.equal((await call('/api/recovery/ack',{})).status,200);assert.equal((await (await call('/api/state')).json()).recovery,null);
    const job=await call('/api/chat',{message:'Merhaba',agent:'jarvis'});assert.equal(job.status,202);
    for(let i=0;i<100&&store.state.tasks[0].status==='running';i++)await new Promise(resolve=>setTimeout(resolve,10));
    const state=await (await call('/api/state')).json();assert.equal(state.tasks[0].errorCode,'QUOTA');assert.match(state.tasks[0].error,/kota/);assert.doesNotMatch(JSON.stringify(state),/SECRET/);
  } finally {
    hub.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    if(previous===undefined)delete process.env.JARVIS_ACCESS_TOKEN;else process.env.JARVIS_ACCESS_TOKEN=previous;
    rmSync(dir,{recursive:true,force:true});
  }
});
