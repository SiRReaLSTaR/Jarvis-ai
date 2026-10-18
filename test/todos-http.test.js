import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../lib/runtime.js';

test('HTTP personal tasks require authentication, persist, reject conflicts, and bypass AI for explicit text commands',async()=>{
  const {createApp}=await import('../server.js');
  const dir=mkdtempSync(join(tmpdir(),'jarvis-todo-http-')),previous=process.env.JARVIS_ACCESS_TOKEN;
  process.env.JARVIS_ACCESS_TOKEN='test-todo-token';
  const store=createStore(dir);let calls=0;
  const {app,hub}=createApp({store,providersFactory:()=>({agentStates:{},askJarvis:async()=>{calls++;return 'AI yanıtı';}})});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`,headers={authorization:'Bearer test-todo-token','content-type':'application/json'};
  const call=(path,method='GET',body)=>fetch(base+path,{headers,method,...(body===undefined?{}:{body:JSON.stringify(body)})});
  try{
    assert.equal((await fetch(base+'/api/todos')).status,401);
    const created=await call('/api/todos','POST',{todo:{title:'Teklif',dueDate:'2026-10-20'},requestId:'http-1'});assert.equal(created.status,201);
    const item=(await created.json()).todo;assert.equal((await (await call('/api/todos')).json()).todos.length,1);
    const replay=await call('/api/todos','POST',{todo:{title:'Teklif',dueDate:'2026-10-20'},requestId:'http-1'});assert.equal((await replay.json()).todo.id,item.id);
    assert.equal((await call(`/api/todos/${item.id}`,'PATCH',{patch:{status:'done'},version:1})).status,200);
    assert.equal((await call(`/api/todos/${item.id}`,'PATCH',{patch:{title:'Stale'},version:1})).status,409);
    assert.equal((await call('/api/todos','POST',{todo:{title:'X',dueDate:'2026-02-30'},requestId:'bad'})).status,400);
    const chat=await call('/api/chat','POST',{message:'Görev ekle: yarın: Faturayı öde',agent:'atlas',requestId:'chat-1',timeZone:'Europe/Istanbul',client:'test'});
    assert.equal(chat.status,200);assert.equal((await chat.json()).personalTask,true);assert.equal(calls,0);
    await call('/api/chat','POST',{message:'Görevlerim',agent:'atlas',client:'test'});
    assert.equal(calls,0);assert.equal(store.state.tasks.length,0);assert.equal(store.state.todos.length,2);
    assert.equal(store.state.history.at(-1).agent,'atlas');
    const restored=createStore(dir);assert.equal(restored.state.todos.length,2);assert.equal(restored.state.todos.find(t=>t.id===item.id).status,'done');
    assert.equal((await fetch(base+`/api/todos/${item.id}`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:true,version:2})})).status,401);
    assert.equal((await call(`/api/todos/${item.id}`,'DELETE',{version:2})).status,400);
    assert.equal((await call(`/api/todos/${item.id}`,'DELETE',{confirm:true,version:1})).status,409);
    assert.equal((await call(`/api/todos/${item.id}`,'DELETE',{confirm:true,version:2})).status,200);
    assert.equal((await call(`/api/todos/${item.id}`,'DELETE',{confirm:true,version:2})).status,404);
    assert.equal((await (await call('/api/todos')).json()).todos.length,1);
    assert.equal(createStore(dir).state.todos.length,1);

  }finally{
    hub.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    if(previous===undefined)delete process.env.JARVIS_ACCESS_TOKEN;else process.env.JARVIS_ACCESS_TOKEN=previous;
    rmSync(dir,{recursive:true,force:true});
  }
});
