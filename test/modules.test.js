import test from 'node:test'
import assert from 'node:assert/strict'
import {routeTask} from '../lib/agents/router.js'
import {createOrchestrator} from '../lib/agents/orchestrator.js'
import {tabletAppFromCommand,hasOpenIntent} from '../src/core/commands.js'
import {createVoiceController} from '../src/core/voice.js'

test('Team calls produce three independent identities without provider calls',async()=>{
  const fail=()=>{throw new Error('Identity should not call a provider')}
  const {orchestrate}=createOrchestrator({askAtlas:fail,askJarvis:fail,askNexus:fail,synthesizeAgents:fail})
  for(const word of ['Kızlar','Hepiniz','Üçünüz']){
    const response=await orchestrate(`${word}, sırayla kendinizi tanıtın`)
    assert.equal(response.route,'multi-speaker')
    assert.deepEqual(new Set(response.turns.map(t=>t.speaker)),new Set(['atlas','nexus','jarvis']))
    assert.ok(response.turns.every(t=>/^Ben [^.]+\.$/.test(t.text) && !t.text.includes("'")))
  }
})
test('A named agent answers its own identity and explicit sequence keeps order',async()=>{
  const {orchestrate}=createOrchestrator({})
  for(const [name,id] of [['Lara','atlas'],['Vera','nexus'],['Dilan','jarvis']]){
    const response=await orchestrate(`${name}, kendini tanıt`)
    assert.equal(response.speaker,id)
    assert.equal(response.route,'fast-identity-direct')
  }
  const response=await orchestrate('Dilan Lara Vera sırayla kendinizi tanıtın')
  assert.deepEqual(response.turns.map(t=>t.speaker),['jarvis','atlas','nexus'])
  assert.equal(routeTask('Lara ve Vera birlikte analiz edin').mode,'collaborate')
})
test('Turkish app commands keep suffix handling and avoid accidental app matches',()=>{
  assert.equal(hasOpenIntent("YouTube'u aç"),true)
  assert.equal(tabletAppFromCommand("YouTube'u aç").label,'YouTube')
  assert.equal(tabletAppFromCommand("Instagram’ı aç").label,'Instagram')
  assert.equal(tabletAppFromCommand('Bugün hava nasıl'),undefined)
})
test('Single and multi-agent speech retain equal 1.20 rate and distinct pitch',async()=>{
  const oldWindow=globalThis.window,oldUtterance=globalThis.SpeechSynthesisUtterance
  const spoken=[]
  globalThis.window={speechSynthesis:{cancel(){},getVoices(){return []},speak(s){spoken.push(s);s.onstart?.();queueMicrotask(()=>s.onend?.())}}}
  globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}}
  const noop=()=>{}
  try{
    const voice=createVoiceController({listening:false,setListening:noop,setSpeaking:noop,setActiveSpeaker:noop,setCommand:noop,setReply:noop,recognitionRef:{current:null},conversationModeRef:{current:false},voiceGeneration:{current:0},askJarvis:noop})
    voice.speak('Merhaba','jarvis')
    await voice.speakTurns([{speaker:'atlas',text:'Araştırma'},{speaker:'nexus',text:'Kod'}])
    assert.deepEqual(spoken.map(s=>s.rate),[1.2,1.2,1.2])
    assert.equal(new Set(spoken.map(s=>s.pitch)).size,3)
  }finally{globalThis.window=oldWindow;globalThis.SpeechSynthesisUtterance=oldUtterance}
})
test('Stopping the microphone invalidates callbacks from its former session',()=>{
  const oldWindow=globalThis.window
  let recognition,asked=0
  class Recognition{constructor(){recognition=this}start(){}abort(){}}
  globalThis.window={SpeechRecognition:Recognition,speechSynthesis:{cancel(){}}}
  const noop=()=>{},generation={current:0},mode={current:false}
  try{
    const voice=createVoiceController({listening:false,setListening:noop,setSpeaking:noop,setActiveSpeaker:noop,setCommand:noop,setReply:noop,recognitionRef:{current:null},conversationModeRef:mode,voiceGeneration:generation,askJarvis:()=>asked++})
    voice.startConversation()
    voice.stopVoice()
    recognition.onresult({results:[[{transcript:'Vera kendini tanıt'}]]})
    assert.equal(asked,0)
    assert.equal(mode.current,false)
  }finally{globalThis.window=oldWindow}
})
