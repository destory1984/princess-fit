import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, describeContext, localRuleAdvice, type AdviceContext } from './advice.ts';
import type { WorkoutFact } from './gamification.ts';
import type { Stats } from './character.ts';

function fact(partial: Partial<WorkoutFact> & { id: string }): WorkoutFact {
  return {
    started_at: '2026-09-20T10:00:00',
    groups: ['가슴'],
    doneSets: 12,
    volume: 3000,
    durationSec: 0,
    distanceKm: 0,
    ...partial,
  };
}

const stats: Stats = {
  strength: 50,
  stamina: 50,
  vitality: 50,
  balance: 50,
  discipline: 50,
};

function ctx(partial: Partial<AdviceContext> & { today: WorkoutFact }): AdviceContext {
  return { history: [], stats, streak: 1, ...partial };
}

test('the context block states today, the recent average and the streak', () => {
  const text = describeContext(
    ctx({
      today: fact({ id: 'a', doneSets: 10, volume: 2000 }),
      history: [fact({ id: 'b', doneSets: 20, volume: 4000, groups: ['등'] })],
      streak: 3,
    })
  );
  assert.match(text, /오늘 세트 10개/);
  assert.match(text, /최근 1회 평균: 세트 20개/);
  assert.match(text, /연속 운동 3일/);
});

test('the context block says so when there is no history to compare', () => {
  assert.match(describeContext(ctx({ today: fact({ id: 'a' }) })), /첫 운동/);
});

test('today is never counted as its own history', () => {
  const today = fact({ id: 'a', volume: 1000 });
  const text = describeContext(ctx({ today, history: [today] }));
  assert.match(text, /첫 운동/);
});

test('the prompt carries the rules and the facts', () => {
  const p = buildPrompt(ctx({ today: fact({ id: 'a' }) }));
  assert.match(p, /세 문장 이내/);
  assert.match(p, /진단이나 치료 이야기는 하지 마세요/);
  assert.match(p, /오늘 운동/);
});

test('rule advice flags an unusually heavy day', () => {
  const advice = localRuleAdvice(
    ctx({
      today: fact({ id: 'a', volume: 9000 }),
      history: [fact({ id: 'b', volume: 3000 }), fact({ id: 'c', volume: 3000 })],
    })
  );
  assert.match(advice, /많이 들었어요/);
});

test('rule advice flags neglected body parts with the right particle', () => {
  const advice = localRuleAdvice(
    ctx({
      today: fact({ id: 'a', groups: ['가슴'] }),
      history: [fact({ id: 'b', groups: ['가슴'] }), fact({ id: 'c', groups: ['가슴'] })],
    })
  );
  // The particle follows the last word in the list, not the first.
  assert.match(advice, /등, 어깨를 쓰지 않았어요/);
  assert.doesNotMatch(advice, /어깨을/);
});

test('rule advice greets a first-ever workout without comparing', () => {
  const advice = localRuleAdvice(ctx({ today: fact({ id: 'a' }) }));
  assert.match(advice, /첫 기록/);
});
