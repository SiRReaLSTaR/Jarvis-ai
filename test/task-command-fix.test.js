import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppActions } from '../src/core/appActions.js';
import { isTodoCommand,parseTodoCommand } from '../lib/todo-intent.js';
import { createTodoService,todoCommand } from '../lib/todos.js';

test('Completion with colon, no colon, fullwidth punctuation and spoken trailing dot reaches the personal task',async()=>{
  const actions=createAppActions({});
  for(const message of ['Görevi tamamla: Müşteri teklifini hazırla','Görevi tamamla Müşteri teklifini hazırla','GÖREVİ TAMAMLA： Müşteri teklifini hazırla','Görevi\u00a0tamamla – Müşteri teklifini hazırla.','Görevi tamamla:\u200b Müşteri teklifini hazırla']){
    assert.equal(isTodoCommand(message),true,message);
    assert.equal(await actions.localAction(message),false,message);
    const state={todos:[]},service=createTodoService({state,save(){}});
    service.create({title:'Müşteri teklifini hazırla'},'create');
    assert.match(todoCommand(message,service),/Tamamlandı olarak kaydedildi/);
    assert.equal(state.todos[0].status,'done');
  }
});
test('Task listing aliases bypass legacy memory and malformed task commands ask for a title',async()=>{
  const actions=createAppActions({});
  for(const message of ['Görevlerim neler','Görevlerimi göster','Görev ekle','Görevi tamamla:','Görev ekle: kaydet tuşunu düzelt'])assert.equal(await actions.localAction(message),false,message);
  assert.match(todoCommand('Görevi tamamla:',{list(){throw new Error('should not read');}}),/Komut örneği/);
  for(const message of ['Görevi tamamlamak ne demek?','Görev ekleme ekranı nasıl?','Bunu hafızana kaydet'])assert.equal(isTodoCommand(message),false,message);
  assert.deepEqual(parseTodoCommand('Görev ekle Yeni plan'),{type:'create',title:'Yeni plan'});
});
test('Duplicate titles remain ambiguous, and exact punctuation titles win before spoken punctuation fallback',()=>{
  const state={todos:[]},service=createTodoService({state,save(){}});
  service.create({title:'Teklif'},'a');service.create({title:'Teklif'},'b');
  assert.match(todoCommand('Görevi tamamla Teklif.',service),/birden fazla/);assert.ok(state.todos.every(t=>t.status==='open'));
  service.create({title:'Teklif.'},'c');assert.match(todoCommand('Görevi tamamla Teklif.',service),/Tamamlandı/);
  assert.equal(state.todos.filter(t=>t.status==='done').length,1);assert.equal(state.todos.find(t=>t.status==='done').title,'Teklif.');
});
