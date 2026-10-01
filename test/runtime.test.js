import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, accessControl, exactAgent, validMemory, emptyMemory } from '../lib/runtime.js';
test('Agent names cannot match inside Turkish words',()=>{
  assert.equal(exactAgent('dosyalara bak', ['lara']),false);
  assert.equal(exactAgent('LARA araştır'.toLocaleLowerCase('tr-TR'), ['lara']),true);
  assert.equal(exactAgent('vera, kod yaz', ['vera']),true);
});
test('Memory and history survive restart; unfinished tasks are interrupted',()=>{
  const dir=mkdtempSync(join(tmpdir(),'jarvis-'));
  try { const a=createStore(dir);a.state.memory.projects.push({text:'Jarvis'});a.state.history.push({role:'user',content:'merhaba'});a.task('araştır');const b=createStore(dir);assert.equal(b.state.memory.projects[0].text,'Jarvis');assert.equal(b.state.history.length,1);assert.equal(b.state.tasks[0].status,'interrupted'); } finally {rmSync(dir,{recursive:true,force:true})}
});
test('Reject malformed memory',()=>{ assert.equal(validMemory(emptyMemory()),true);assert.equal(Boolean(validMemory({memories:[{text:123}]})),false) });
test('Protect API from wrong token, origin and excessive requests',()=>{
  const guard=accessControl({token:'test-only',origins:['http://localhost:5173'],limit:1});
  let status=0, passed=0;
  const res={status(n){status=n;return this},json(){return this},set(){return this}};
  guard({headers:{},ip:'a'},res,()=>passed++);assert.equal(status,401);
  guard({headers:{authorization:'Bearer test-only',origin:'https://evil.example'},ip:'a'},res,()=>passed++);assert.equal(status,403);
  const req={headers:{authorization:'Bearer test-only'},ip:'a'};guard(req,res,()=>passed++);assert.equal(passed,1);guard(req,res,()=>passed++);assert.equal(status,429);
});
