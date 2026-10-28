import test from 'node:test'
import assert from 'node:assert/strict'
import {dailyActivity,memoryTotals,relativeTime,sparklineGeometry,systemHealth,taskSummary,weatherInfo} from '../src/core/dashboardMetrics.js'

const task=(status,createdAt='2026-01-15T09:00:00.000Z')=>({id:status+createdAt,message:'x',status,createdAt})

test('Task summary counts every status and never invents a success rate',()=>{
  const empty=taskSummary([])
  assert.equal(empty.total,0)
  assert.equal(empty.successRate,null)
  const summary=taskSummary([task('completed'),task('completed'),task('failed'),task('partial'),task('running'),{status:'unknown'}])
  assert.equal(summary.total,5)
  assert.equal(summary.counts.completed,2)
  assert.equal(summary.active,1)
  assert.equal(summary.finished,4)
  assert.equal(summary.successRate,50)
})

test('Daily activity buckets tasks into the last seven local days',()=>{
  const now=new Date(2026,0,15,12).getTime()
  const tasks=[
    task('completed',new Date(2026,0,15,9).toISOString()),
    task('completed',new Date(2026,0,15,10).toISOString()),
    task('failed',new Date(2026,0,13,23).toISOString()),
    task('completed',new Date(2025,11,20,10).toISOString()),
    task('completed','not-a-date'),
  ]
  const days=dailyActivity(tasks,{now})
  assert.equal(days.length,7)
  assert.equal(days.at(-1).count,2)
  assert.equal(days.at(-3).count,1)
  assert.equal(days.reduce((sum,day)=>sum+day.count,0),3)
  assert.deepEqual(days.map(day=>day.label),['Cum','Cmt','Paz','Pzt','Sal','Çar','Per'])
})

test('Memory totals use the server key names and ignore malformed values',()=>{
  const totals=memoryTotals({memories:[{text:'a'}],projects:[{text:'b'},{text:'c'}],ideas:'bozuk',tasks:[],preferences:[{text:'d'}]})
  assert.equal(totals.total,4)
  assert.equal(totals.max,2)
  assert.equal(totals.entries.find(entry=>entry.key==='ideas').count,0)
  assert.equal(memoryTotals().total,0)
})

test('System health derives its score only from real configuration flags',()=>{
  const health=systemHealth({connected:true,agents:{jarvis:{configured:true},atlas:{configured:true},nexus:{configured:false}},liveEnabled:false,screens:2})
  assert.equal(health.total,5)
  assert.equal(health.ready,3)
  assert.equal(health.score,60)
  assert.equal(health.screens,2)
  assert.deepEqual(health.items.filter(item=>!item.ok).map(item=>item.id),['vera','live'])
  assert.equal(systemHealth().score,0)
})

test('Relative time is deterministic and does not go negative',()=>{
  const now=Date.parse('2026-01-15T12:00:00.000Z')
  assert.equal(relativeTime('2026-01-15T11:59:30.000Z',now),'az önce')
  assert.equal(relativeTime('2026-01-15T11:50:00.000Z',now),'10 dk önce')
  assert.equal(relativeTime('2026-01-15T09:00:00.000Z',now),'3 sa önce')
  assert.equal(relativeTime('bozuk',now),'—')
  assert.equal(relativeTime('2026-01-15T12:05:00.000Z',now),'az önce')
})

test('Weather codes map to readable Turkish conditions',()=>{
  assert.equal(weatherInfo(0).label,'Açık')
  assert.equal(weatherInfo(2).icon,'cloud-sun')
  assert.equal(weatherInfo(3).label,'Bulutlu')
  assert.equal(weatherInfo(48).icon,'fog')
  assert.equal(weatherInfo(63).label,'Yağmurlu')
  assert.equal(weatherInfo(75).label,'Karlı')
  assert.equal(weatherInfo(96).label,'Fırtına')
  assert.equal(weatherInfo(undefined).label,'Bilinmiyor')
})

test('Sparkline geometry stays inside its box for flat and rising series',()=>{
  assert.deepEqual(sparklineGeometry([]),{line:'',area:'',points:[]})
  const flat=sparklineGeometry([0,0,0],{width:100,height:32,padding:3})
  assert.ok(flat.points.every(([,y])=>y===16))
  const rising=sparklineGeometry([0,5,10],{width:100,height:32,padding:3})
  assert.deepEqual(rising.points,[[3,29],[50,16],[97,3]])
  assert.ok(rising.line.startsWith('M3 29'))
  assert.ok(rising.area.endsWith('Z'))
})
