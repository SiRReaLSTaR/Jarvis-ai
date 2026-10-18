import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, mergeSettings } from '../lib/settings.js';
import { createOrchestrator } from '../lib/agents/orchestrator.js';
import { atlasInstruction, jarvisInstruction, nexusInstruction } from '../lib/agents/prompts.js';
test('Exact user wording routes Bilge and returns one sentence under the new name without provider calls',async()=>{
 const settings=mergeSettings(defaultSettings(),{profiles:{atlas:{name:'Bilge'}}});
 const {orchestrate}=createOrchestrator({getSettings:()=>settings,askAtlas:async()=>{throw Error('Identity should be local');}});
 const result=await orchestrate('Bilge, kendini bir cümleyle tanıt.');
 assert.equal(result.speaker,'atlas');assert.match(result.reply,/Ben Bilge,/);assert.match(result.reply,/araştırma/);assert.doesNotMatch(result.reply,/LARA/);assert.equal((result.reply.match(/[.!?]/g)||[]).length,1);
});
test('Agent prompts use current self name without rewriting historical memory references',()=>{
 const memory='Eski not: LARA ile konuşuldu.';
 const instruction=atlasInstruction(memory,'Bilge');
 assert.match(instruction,/Sen Bilge/);assert.match(instruction,/Bilge olarak/);assert.doesNotMatch(instruction,/Sen LARA|kendini LARA|LARA olarak/);assert.ok(instruction.includes(memory));
 assert.match(jarvisInstruction('','Komutan'),/Sen Komutan/);assert.match(nexusInstruction('','Usta'),/Sen Usta/);
 assert.match(atlasInstruction(''),/Sen LARA/);
});
