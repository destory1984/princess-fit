import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodyRuleAdvice, buildBodyPrompt, describeBody, requestBodyAdvice } from './bodyAdvice.ts';
import { staysInTheFacts } from './advice.ts';
import type { BodyLog } from './body.ts';

const TODAY = new Date('2026-09-23T09:00:00');

function log(day: string, w: number | null, fat: number | null, muscle: number | null): BodyLog {
  return {
    id: day,
    measured_on: day,
    weight_kg: w,
    body_fat_pct: fat,
    muscle_kg: muscle,
    height_cm: null,
  };
}

test('with nothing recorded, it says how to start', () => {
  assert.match(bodyRuleAdvice([], TODAY), /처음 잰 값이 기준/);
});

test('a single reading has no trend and says so', () => {
  assert.match(bodyRuleAdvice([log('2026-09-22', 70, 22, 30)], TODAY), /두 번은 재야/);
});

test('a scale left alone for two weeks is the thing worth saying', () => {
  const text = bodyRuleAdvice([log('2026-09-01', 70, 22, 30), log('2026-08-20', 71, 23, 30)], TODAY);
  assert.match(text, /22일 지났어요/);
});

test('muscle going up is praised', () => {
  const logs = [log('2026-09-22', 70, 21.5, 30.6), log('2026-09-01', 70, 22, 30)];
  assert.match(bodyRuleAdvice(logs, TODAY), /골격근량이 늘고/);
});

test('losing weight along with muscle is flagged, not praised', () => {
  const logs = [log('2026-09-22', 68, 22, 29.2), log('2026-09-01', 70, 22, 30)];
  assert.match(bodyRuleAdvice(logs, TODAY), /골격근량도 줄고/);
});

test('small wobbles are called stable', () => {
  const logs = [log('2026-09-22', 70.2, 22.1, 30.1), log('2026-09-01', 70, 22, 30)];
  assert.match(bodyRuleAdvice(logs, TODAY), /안정적/);
});

test('the facts carry the readings and the month, nothing to judge against', () => {
  const facts = describeBody([log('2026-09-22', 68, 21, 30), log('2026-09-01', 70, 22, 30)], TODAY);
  assert.match(facts, /몸무게: 지금 68kg, 최근 한 달 -2kg/);
  assert.match(facts, /마지막으로 잰 날: 1일 전/);
  const prompt = buildBodyPrompt([log('2026-09-22', 68, 21, 30)], TODAY);
  assert.match(prompt, /목표 체중을 말하지 마세요/);
});

test('a target weight the model invents is caught', () => {
  const facts = describeBody([log('2026-09-22', 68, 21, 30), log('2026-09-01', 70, 22, 30)], TODAY);
  assert.ok(staysInTheFacts('몸무게가 2kg 줄었어요.', facts));
  assert.ok(!staysInTheFacts('목표를 65kg으로 잡아 보세요.', facts));
});

test('with the model off, the rules answer without touching the network', async () => {
  const reply = await requestBodyAdvice([], undefined, false, TODAY);
  assert.equal(reply.source, 'rules');
});
