import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from '../lib/runtime.js';
import { createTodoService } from '../lib/todos.js';
test('Deleting one open or completed personal task preserves other tasks, memories and AI jobs across restart',t=>{
  const dir=mkdtempSync(join(tmpdir(),'jarvis-delete-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const store=createStore(dir),service=createTodoService(store);
  store.state.memory.tasks.push({text:'Eski hafıza'});store.state.tasks.push({id:'job',message:'AI işlemi',status:'completed'});
  const a=service.create({title:'Deneme'},'a'),b=service.create({title:'Deneme'},'b'),c=service.create({title:'Bitmiş',status:'done'},'c');
  assert.equal(service.remove(a.id,a.version).deleted,true);assert.equal(service.list().length,2);
  assert.ok(service.list().some(t=>t.id===b.id));service.remove(c.id,c.version);
  const restored=createStore(dir);assert.equal(restored.state.todos.length,1);assert.equal(restored.state.todos[0].id,b.id);
  assert.equal(restored.state.memory.tasks[0].text,'Eski hafıza');assert.equal(restored.state.tasks[0].id,'job');
});
test('Stale versions cannot delete edited tasks; repeated deletion does not touch other records',()=>{
  const state={todos:[]},service=createTodoService({state,save(){}}),a=service.create({title:'X'},'a');
  service.update(a.id,{title:'Değişti'},1);
  assert.throws(()=>service.remove(a.id,1),e=>e.status===409);assert.throws(()=>service.remove(a.id,undefined),e=>e.status===409);
  assert.equal(service.list()[0].title,'Değişti');service.remove(a.id,2);
  const other=service.create({title:'X'},'b');assert.throws(()=>service.remove(a.id,2),e=>e.status===404);assert.equal(service.list()[0].id,other.id);
});
test('Failed delete rolls back in-memory state and never publishes a success',()=>{
  const state={todos:[]},service=createTodoService({state,save(){}}),item=service.create({title:'Koru'},'a');
  const broken=createTodoService({state,save(){throw new Error('disk');},publish(){throw new Error('must not publish');}});
  assert.throws(()=>broken.remove(item.id,1),e=>e.status===503);assert.equal(state.todos[0].id,item.id);
});
