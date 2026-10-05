import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVISORS } from './advisors.ts';
import {
  firstWords,
  GOALS,
  INTRODUCTIONS,
  MAX_PER_WEEK,
  MIN_PER_WEEK,
  PLACES,
  perWeekWord,
  planWord,
  previousStep,
  progressOf,
  recommendPresets,
  nextStep,
  stepsFor,
  STEPS,
  type Goal,
  type Place,
  type Step,
} from './onboarding.ts';
import { ROUTINE_PRESETS } from './routinePresets.ts';

test('every answer leads somewhere — no combination is offered nothing', () => {
  for (const { id: place } of PLACES) {
    for (let n = MIN_PER_WEEK; n <= MAX_PER_WEEK; n += 1) {
      const offered = recommendPresets(place, n);
      assert.ok(offered.length > 0, `${place} × ${n}회 had nothing to offer`);
    }
  }
});

test('every recommendation is a routine that exists', () => {
  const known = new Set(ROUTINE_PRESETS.map((p) => p.id));
  for (const { id: place } of PLACES) {
    for (let n = MIN_PER_WEEK; n <= MAX_PER_WEEK; n += 1) {
      for (const p of recommendPresets(place, n)) assert.ok(known.has(p.id));
    }
  }
});

test('training at home is never handed a routine that needs a rack', () => {
  for (let n = MIN_PER_WEEK; n <= MAX_PER_WEEK; n += 1) {
    const offered = recommendPresets('home', n);
    assert.deepEqual(
      offered.map((p) => p.id),
      ['home']
    );
  }
});

test('two days a week is offered whole-body first, not a split', () => {
  for (const n of [1, 2, 3]) {
    assert.equal(recommendPresets('gym', n)[0].id, 'full-body');
  }
});

test('four days a week is offered the split first', () => {
  for (const n of [4, 5, 6, 7]) {
    assert.ok(recommendPresets('gym', n)[0].id.startsWith('upper-lower'));
  }
});

test('she has a word for every number of days, and mentions rest at seven', () => {
  for (let n = MIN_PER_WEEK; n <= MAX_PER_WEEK; n += 1) {
    assert.ok(perWeekWord(n).length > 0, `${n}회 had nothing said about it`);
  }
  assert.ok(perWeekWord(7).includes('쉬는 날'));
});

test('she repeats the plan back with all three answers in it', () => {
  for (const { id: goal } of GOALS) {
    for (const { id: place } of PLACES) {
      const said = planWord(goal as Goal, place as Place, 3);
      assert.ok(said.includes('3번'), said);
      assert.ok(said.includes(place === 'home' ? '집' : '헬스장'), said);
    }
  }
});

test('the steps form one chain with a start and an end', () => {
  let step: Step = STEPS[0];
  const seen: Step[] = [step];
  for (;;) {
    const next = nextStep(step);
    if (!next) break;
    assert.equal(previousStep(next), step);
    step = next;
    seen.push(step);
  }
  assert.deepEqual(seen, [...STEPS]);
  assert.equal(previousStep(STEPS[0]), null);
});

test('progress rises with every step and fills at the last', () => {
  const values = STEPS.map((s) => progressOf(s));
  for (let i = 1; i < values.length; i += 1) assert.ok(values[i] > values[i - 1]);
  assert.equal(values[values.length - 1], 1);
});

test('a device that cannot send the daily word is not asked when to send it', () => {
  const web = stepsFor(false);
  assert.ok(!web.includes('nudge'));
  assert.deepEqual(stepsFor(true), [...STEPS]);
  // The step before it becomes the last one, and the bar still fills there.
  assert.equal(nextStep('routine', web), null);
  assert.equal(progressOf('routine', web), 1);
  assert.equal(previousStep('routine', web), 'place');
});

test('she is chosen first, and every girl who can be chosen is introduced', () => {
  assert.equal(STEPS[0], 'who');
  for (const a of ADVISORS.filter((x) => x.playable)) {
    const intro = INTRODUCTIONS[a.id];
    assert.ok(intro, `${a.name} has no introduction`);
    assert.ok(intro.temper && intro.about && intro.hello);
  }
});

test('the first conversation is in the hand of whoever was chosen', () => {
  const said = (girl: string) => [
    firstWords(girl).meet('이름'),
    perWeekWord(3, girl),
    firstWords(girl).goal,
    firstWords(girl).place.home,
    planWord('habit', 'gym', 3, girl),
    firstWords(girl).quiet,
    firstWords(girl).nudge(20),
  ];
  const [rina, pia, yuki] = ['geumhwa', 'dohwa', 'seora'].map(said);
  for (let i = 0; i < rina.length; i += 1) {
    assert.equal(new Set([rina[i], pia[i], yuki[i]]).size, 3, `line ${i} is shared`);
  }
  // Yuki is formal from the first word; Pia cannot say a thing quietly.
  for (const line of yuki) assert.match(line, /니다\.|십시오\.|군요\./, line);
  for (const line of pia) assert.match(line, /!/, line);
  // Seven days a week is warned about once, by all three.
  for (const g of ['geumhwa', 'dohwa', 'seora']) assert.match(perWeekWord(7, g), /쉬는 날/);
  // Someone unknown speaks as the first girl does.
  assert.equal(perWeekWord(3, 'nobody'), perWeekWord(3));
});
