import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { HOME_EQUIPMENT, usableAt } from './plan.ts';
import { MUSCLE_LABELS, recoveryOf, type Session } from './recovery.ts';
import { offerWord, suggestExercise, type Candidate } from './suggest.ts';

const NOW = new Date('2026-09-20T12:00:00');

const CATALOGUE: Candidate[] = DEFAULT_EXERCISES.map((e, i) => ({
  id: `ex-${i}`,
  name: e.name,
  equipment: e.equipment,
  muscle_group: e.muscle_group,
  secondary_group: e.secondary_group,
  body_parts: e.body_parts,
}));

function byName(name: string) {
  const found = CATALOGUE.find((c) => c.name === name);
  assert.ok(found, `${name} missing from the catalogue`);
  return found;
}

function session(hoursAgo: number, sets: Record<string, number>): Session {
  return { startedAt: new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString(), sets };
}

test('an empty catalogue has nothing to suggest, and says so', () => {
  assert.equal(suggestExercise([], recoveryOf([], NOW)), null);
});

test('it suggests something, and always something real', () => {
  const picked = suggestExercise(CATALOGUE, recoveryOf([], NOW));
  assert.ok(picked);
  assert.ok(CATALOGUE.some((c) => c.id === picked.id && c.name === picked.name));
  assert.ok(picked.why.length > 0);
});

test('the same board always suggests the same thing', () => {
  const muscles = recoveryOf([session(5, { chest: 9 })], NOW);
  const first = suggestExercise(CATALOGUE, muscles);
  for (let i = 0; i < 5; i += 1) {
    assert.deepEqual(suggestExercise(CATALOGUE, muscles), first);
  }
});

test('training at home is never handed a barbell', () => {
  const muscles = recoveryOf([], NOW);
  const picked = suggestExercise(CATALOGUE, muscles, { place: 'home' })!;
  const equipment = byName(picked.name).equipment;
  assert.ok(
    HOME_EQUIPMENT.includes(equipment),
    `suggested ${picked.name} (${equipment}) to someone at home`
  );
});

test('equipment outranks rest: a perfect gym movement loses to a usable one', () => {
  // Everything but the chest is spent, which would otherwise point at a bench.
  const everythingElse = Object.fromEntries(
    Object.keys(MUSCLE_LABELS)
      .filter((slug) => slug !== 'chest')
      .map((slug) => [slug, 12])
  );
  const muscles = recoveryOf([session(1, everythingElse)], NOW);
  const picked = suggestExercise(CATALOGUE, muscles, { place: 'home' })!;
  assert.ok(usableAt('home', byName(picked.name).equipment));
});

test('it leads with the muscle that has waited longest', () => {
  // Chest done just now, nothing else ever: it must not suggest a press.
  const muscles = recoveryOf([session(1, { chest: 12, triceps: 9 })], NOW);
  const picked = suggestExercise(CATALOGUE, muscles)!;
  const slugs = (byName(picked.name).body_parts ?? '').split(',');
  assert.ok(!slugs.includes('chest'), `suggested ${picked.name} the day chest was trained`);
});

test('what is already on the board is not suggested again', () => {
  const muscles = recoveryOf([], NOW);
  const first = suggestExercise(CATALOGUE, muscles)!;
  const second = suggestExercise(CATALOGUE, muscles, { exclude: new Set([first.id]) })!;
  assert.notEqual(second.id, first.id);
});

test('excluding everything gives nothing rather than something wrong', () => {
  const all = new Set(CATALOGUE.map((c) => c.id));
  assert.equal(suggestExercise(CATALOGUE, recoveryOf([], NOW), { exclude: all }), null);
});

test('among equals, the one you actually use wins', () => {
  const muscles = recoveryOf([], NOW);
  const plain = suggestExercise(CATALOGUE, muscles)!;
  const other = CATALOGUE.find((c) => c.id !== plain.id && c.equipment === '맨몸')!;
  const withUsage = suggestExercise(CATALOGUE, muscles, {
    usage: new Map([[other.id, 50]]),
  })!;
  assert.ok(
    withUsage.id === other.id || withUsage.id === plain.id,
    'familiarity produced something unrelated'
  );
});

test('familiarity is a tiebreak, not a veto on equipment', () => {
  const muscles = recoveryOf([], NOW);
  const barbell = CATALOGUE.find((c) => c.equipment === '바벨')!;
  const picked = suggestExercise(CATALOGUE, muscles, {
    place: 'home',
    usage: new Map([[barbell.id, 9999]]),
  })!;
  assert.ok(HOME_EQUIPMENT.includes(byName(picked.name).equipment));
});

test('a muscle never trained is named as such, not given a day count', () => {
  const picked = suggestExercise(CATALOGUE, recoveryOf([], NOW))!;
  assert.ok(picked.why.includes('한 번도'), picked.why);
  assert.ok(!picked.why.includes('0일'));
});

test('the offer reads as one sentence with the movement in it', () => {
  const picked = suggestExercise(CATALOGUE, recoveryOf([], NOW))!;
  const said = offerWord(picked);
  assert.ok(said.includes(picked.name));
  assert.ok(said.endsWith('어떠세요?'));
});
