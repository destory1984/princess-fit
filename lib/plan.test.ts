import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import type { Insight } from './insight.ts';
import { GOALS, PLACES, type Goal } from './onboarding.ts';
import { byPlace, HOME_EQUIPMENT, rankByGoal, usableAt, watchingWord } from './plan.ts';

const INSIGHTS: Insight[] = [
  { id: 'streak', tone: 'good', title: 'streak', detail: '' },
  { id: 'cardio', tone: 'watch', title: 'cardio', detail: '' },
  { id: 'lopsided', tone: 'watch', title: 'lopsided', detail: '' },
  { id: 'sparse', tone: 'watch', title: 'sparse', detail: '' },
  { id: 'neglected', tone: 'watch', title: 'neglected', detail: '' },
];

test('a gym has everything, a room has what fits in one', () => {
  assert.ok(usableAt('gym', '바벨'));
  assert.ok(usableAt('gym', '맨몸'));
  assert.ok(usableAt('home', '맨몸'));
  assert.ok(!usableAt('home', '바벨'));
  assert.ok(!usableAt('home', '머신'));
});

test('training at home reorders and never removes', () => {
  const before = DEFAULT_EXERCISES.map((e) => e.name);
  const after = byPlace(DEFAULT_EXERCISES, 'home').map((e) => e.name);
  assert.equal(after.length, before.length);
  assert.deepEqual([...after].sort(), [...before].sort());
});

test('what a room can do comes first, and the rack still exists below it', () => {
  const ordered = byPlace(DEFAULT_EXERCISES, 'home');
  const firstGymOnly = ordered.findIndex((e) => !usableAt('home', e.equipment));
  const lastHome = ordered.map((e) => usableAt('home', e.equipment)).lastIndexOf(true);
  assert.ok(firstGymOnly > 0, 'nothing could be done at home');
  assert.ok(lastHome < firstGymOnly, 'home and gym movements are interleaved');
  assert.ok(ordered.slice(firstGymOnly).length > 0, 'gym movements vanished');
});

test('a gym, or no answer at all, changes nothing', () => {
  assert.deepEqual(byPlace(DEFAULT_EXERCISES, 'gym'), DEFAULT_EXERCISES);
  assert.deepEqual(byPlace(DEFAULT_EXERCISES, null), DEFAULT_EXERCISES);
});

test('every home movement is in the catalogue, so the promise can be kept', () => {
  const available = DEFAULT_EXERCISES.filter((e) => HOME_EQUIPMENT.includes(e.equipment));
  assert.ok(available.length >= 20, `only ${available.length} movements work at home`);
  // And they cover enough of the body to be a workout rather than a gesture.
  const groups = new Set(available.map((e) => e.muscle_group));
  for (const group of ['가슴', '등', '하체', '복근']) {
    assert.ok(groups.has(group), `nothing for ${group} without equipment`);
  }
});

test('ranking reorders the same findings and invents none', () => {
  for (const { id: goal } of GOALS) {
    const ranked = rankByGoal(INSIGHTS, goal as Goal);
    assert.equal(ranked.length, INSIGHTS.length);
    assert.deepEqual(
      [...ranked.map((i) => i.id)].sort(),
      [...INSIGHTS.map((i) => i.id)].sort()
    );
  }
});

test('each goal leads with what that goal is about', () => {
  assert.equal(rankByGoal(INSIGHTS, 'shape')[0].id, 'lopsided');
  assert.equal(rankByGoal(INSIGHTS, 'weight')[0].id, 'sparse');
  assert.equal(rankByGoal(INSIGHTS, 'habit')[0].id, 'sparse');
  assert.equal(rankByGoal(INSIGHTS, 'strength')[0].id, 'neglected');
});

test('no goal, no reordering', () => {
  assert.deepEqual(rankByGoal(INSIGHTS, null), INSIGHTS);
});

test('a finding no goal has an opinion about keeps its place among its peers', () => {
  const withNew: Insight[] = [
    { id: 'brand-new', tone: 'watch', title: 'new', detail: '' },
    { id: 'another-new', tone: 'good', title: 'new2', detail: '' },
  ];
  const ranked = rankByGoal(withNew, 'habit');
  assert.deepEqual(ranked.map((i) => i.id), ['brand-new', 'another-new']);
});

test('ranking never mutates what it was given', () => {
  const original = INSIGHTS.map((i) => i.id);
  rankByGoal(INSIGHTS, 'weight');
  assert.deepEqual(INSIGHTS.map((i) => i.id), original);
});

test('she says what she is watching for, and says nothing when never asked', () => {
  for (const { id } of GOALS) {
    const word = watchingWord(id as Goal);
    assert.ok(word && word.length > 0);
  }
  assert.equal(watchingWord(null), null);
  // Four goals, four different lines — a shared one would make the question
  // decorative.
  const said = GOALS.map((g) => watchingWord(g.id as Goal));
  assert.equal(new Set(said).size, GOALS.length);
});

test('every place the onboarding offers is one this file understands', () => {
  for (const { id } of PLACES) {
    assert.doesNotThrow(() => byPlace(DEFAULT_EXERCISES, id));
  }
});
