import test from 'node:test';
import assert from 'node:assert/strict';
import { missionSummary, displayTime } from '../src/core/mission.js';

test('Dashboard has unknown readiness before loading and never fabricates metrics', () => {
  const before = missionSummary(null, null, false);
  assert.equal(before.configured, null);
  assert.equal(before.ready, false);
  assert.equal(before.revision, null);
  assert.equal(before.tasks.length, 0);
  assert.equal(before.memory.length, 0);
});
test('Dashboard counts actual task outcomes and only valid memory categories', () => {
  const state = { revision: 4, memory: { projects: [{ text: 'Robot' }], preferences: [{ text: 'Türkçe' }], unknown: [{ text: 'Excluded' }] }, tasks: [
    { id:'a', status:'completed' }, { id:'b', status:'running' }, { id:'c', status:'partial' }, { id:'d', status:'failed' },
  ] };
  const system = { agents: { jarvis: { configured: true }, atlas: { configured: true }, nexus: { configured: false } } };
  const result = missionSummary(state, system, true);
  assert.equal(result.running, 1); assert.equal(result.completed, 1); assert.equal(result.configured, 2);
  assert.equal(result.memory.length, 2); assert.equal(result.revision, 4);
  assert.deepEqual(result.memory.map(x => x.category), ['projects','preferences']);
  assert.equal(missionSummary(state, system, false).configured, null);
  assert.equal(missionSummary(state, system, false).ready, false);
});
test('Missing and invalid dates are not displayed as fabricated current times', () => {
  assert.equal(displayTime(null), 'Zaman bilgisi yok');
  assert.equal(displayTime('bad-date'), 'Zaman bilgisi yok');
  assert.notEqual(displayTime('2026-10-17T12:00:00Z'), 'Zaman bilgisi yok');
});
