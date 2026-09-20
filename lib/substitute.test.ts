import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { HOME_EQUIPMENT } from './plan.ts';
import {
  MIN_OVERLAP,
  overlapOf,
  substitutesFor,
  substituteWord,
  substitutesHere,
  type Substitutable,
} from './substitute.ts';

function named(name: string): Substitutable {
  const found = DEFAULT_EXERCISES.find((e) => e.name === name);
  assert.ok(found, `${name} missing from the catalogue`);
  return found;
}

test('identical muscles score 1, unrelated ones score 0', () => {
  const bench = named('벤치프레스');
  assert.equal(overlapOf(bench, bench), 1);
  assert.equal(overlapOf(named('사이드 레터럴 레이즈'), named('스쿼트')), 0);
});

test('a movement is never offered as a substitute for itself', () => {
  const bench = named('벤치프레스');
  const found = substitutesFor(bench, DEFAULT_EXERCISES);
  assert.ok(!found.some((s) => s.exercise.name === '벤치프레스'));
});

test('the bench press sends you to the dumbbells, and never off the chest', () => {
  const found = substitutesFor(named('벤치프레스'), DEFAULT_EXERCISES);
  const names = found.map((s) => s.exercise.name);
  assert.ok(names.includes('덤벨 프레스'), names.join(', '));
  // 덤벨 숄더 프레스 shares two muscles of three and used to win a place here.
  assert.ok(
    found.every((s) => s.exercise.muscle_group === '가슴'),
    names.join(', ')
  );
});

test('a room with no bench in it is answered with the floor', () => {
  // The caller narrows the pool to what is to hand — this composes with
  // `byPlace` rather than growing its own idea of where you are.
  const home = DEFAULT_EXERCISES.filter((e) => HOME_EQUIPMENT.includes(e.equipment));
  const found = substitutesFor(named('벤치프레스'), home).map((s) => s.exercise.name);
  assert.ok(found.includes('푸시업'), found.join(', '));
});

test('a lat pulldown sends you to the bar, not to a leg machine', () => {
  const found = substitutesFor(named('랫 풀다운'), DEFAULT_EXERCISES).map((s) => s.exercise.name);
  assert.ok(found.includes('풀업'), found.join(', '));
  assert.ok(!found.some((n) => n.includes('레그')), found.join(', '));
});

test('other equipment comes first among equally close movements', () => {
  const machine: Substitutable = {
    name: '기준',
    equipment: '머신',
    muscle_group: '가슴',
    secondary_group: null,
    body_parts: 'chest',
  };
  const pool: Substitutable[] = [
    { ...machine, name: '같은 기구' },
    { ...machine, name: '다른 기구', equipment: '덤벨' },
  ];
  assert.equal(substitutesFor(machine, pool)[0].exercise.name, '다른 기구');
});

test('nothing distant enough is offered rather than something absurd', () => {
  const odd: Substitutable = {
    name: '아무것도 아닌 것',
    equipment: '맨몸',
    muscle_group: '기타',
    secondary_group: null,
    body_parts: 'obliques',
  };
  for (const s of substitutesFor(odd, DEFAULT_EXERCISES)) {
    assert.ok(s.overlap >= MIN_OVERLAP, `${s.exercise.name} at ${s.overlap}`);
  }
});

test('she never says more than three', () => {
  for (const e of DEFAULT_EXERCISES) {
    assert.ok(substitutesFor(e, DEFAULT_EXERCISES).length <= 3, e.name);
  }
});

test('the reason takes the particle the equipment asks for', () => {
  const said = substituteWord({
    exercise: { name: 'x', equipment: '덤벨', muscle_group: '가슴', secondary_group: null },
    overlap: 0.5,
    sameGear: false,
  });
  assert.ok(said.startsWith('덤벨로'), said);
});

test('most of the catalogue has somewhere to send you', () => {
  // Not all of it: a few movements are the only thing that does what they do,
  // and inventing a stand-in for those would be the feature lying.
  const covered = DEFAULT_EXERCISES.filter(
    (e) => substitutesFor(e, DEFAULT_EXERCISES).length > 0
  );
  assert.ok(
    covered.length >= DEFAULT_EXERCISES.length * 0.7,
    `${covered.length} of ${DEFAULT_EXERCISES.length}`
  );
});

test('at home she looks around the room first', () => {
  const found = substitutesHere(named('벤치프레스'), DEFAULT_EXERCISES, 'home');
  assert.ok(
    found.every((s) => HOME_EQUIPMENT.includes(s.exercise.equipment)),
    found.map((s) => s.exercise.name).join(', ')
  );
});

test('a room with nothing close enough gets the wider answer, not silence', () => {
  const found = substitutesHere(named('랫 풀다운'), DEFAULT_EXERCISES, 'home');
  assert.ok(found.length > 0);
});

test('anywhere else, the question is the plain one', () => {
  const target = named('벤치프레스');
  assert.deepEqual(
    substitutesHere(target, DEFAULT_EXERCISES, 'gym'),
    substitutesFor(target, DEFAULT_EXERCISES)
  );
  assert.deepEqual(
    substitutesHere(target, DEFAULT_EXERCISES, null),
    substitutesFor(target, DEFAULT_EXERCISES)
  );
});
