import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FULL_LOAD,
  MAX_HOURS,
  MIN_HOURS,
  clashWord,
  freshest,
  MUSCLE_LABELS,
  READY,
  stillTired,
  recoveryHours,
  recoveryOf,
  remainingFatigue,
  sinceWord,
  todaysWord,
  type Session,
} from './recovery.ts';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { slugsOf } from './muscles.ts';

const NOW = new Date('2026-09-20T12:00:00');

function hoursAgo(h: number) {
  return new Date(NOW.getTime() - h * 3_600_000).toISOString();
}

function session(h: number, sets: Record<string, number>): Session {
  return { startedAt: hoursAgo(h), sets };
}

function find(muscles: ReturnType<typeof recoveryOf>, slug: string) {
  const m = muscles.find((x) => x.slug === slug);
  assert.ok(m, `${slug} missing`);
  return m;
}

test('a hard session needs about three days, a light one about one', () => {
  assert.equal(recoveryHours(0), MIN_HOURS);
  assert.equal(recoveryHours(FULL_LOAD), MAX_HOURS);
  assert.ok(recoveryHours(4) > MIN_HOURS && recoveryHours(4) < MAX_HOURS);
});

test('beyond a hard session nothing gets any longer', () => {
  assert.equal(recoveryHours(FULL_LOAD * 5), MAX_HOURS);
  assert.equal(remainingFatigue(FULL_LOAD * 5, 0), 1);
});

test('recovery only ever rises as time passes', () => {
  let last = -1;
  for (const h of [0, 6, 12, 24, 36, 48, 60, 72, 96]) {
    const value = recoveryOf([session(h, { quadriceps: 10 })], NOW);
    const quads = find(value, 'quadriceps').recovery;
    assert.ok(quads >= last, `${h}h went backwards: ${quads} after ${last}`);
    last = quads;
  }
  assert.equal(last, 100);
});

test('the harder the session, the less recovered at the same hour', () => {
  const at = (sets: number) =>
    find(recoveryOf([session(24, { quadriceps: sets })], NOW), 'quadriceps').recovery;
  assert.ok(at(12) < at(6));
  assert.ok(at(6) < at(2));
});

test('two hard days stack, and cannot take recovery below zero', () => {
  const both = recoveryOf(
    [session(2, { quadriceps: FULL_LOAD }), session(20, { quadriceps: FULL_LOAD })],
    NOW
  );
  const quads = find(both, 'quadriceps');
  assert.equal(quads.recovery, 0);
  assert.ok(quads.recovery >= 0);
});

test('a muscle never trained reads as untouched, not as rested from something', () => {
  const muscles = recoveryOf([session(10, { chest: 9 })], NOW);
  const calves = find(muscles, 'calves');
  assert.equal(calves.recovery, 100);
  assert.equal(calves.hoursSince, null);
  assert.equal(sinceWord(calves.hoursSince), '아직 한 적 없어요');
});

test('hours since counts from the most recent session, not the first', () => {
  const muscles = recoveryOf(
    [session(50, { chest: 4 }), session(5, { chest: 4 }), session(90, { chest: 4 })],
    NOW
  );
  assert.equal(Math.round(find(muscles, 'chest').hoursSince!), 5);
});

test('slugs the body map knows but a workout cannot aim at are left out', () => {
  const muscles = recoveryOf([session(1, { head: 40, hands: 40 })], NOW);
  assert.ok(!muscles.some((m) => m.slug === 'head' || m.slug === 'hands'));
  // And they cannot fatigue anything that is listed.
  assert.ok(muscles.every((m) => m.recovery === 100));
});

test('the list is ordered by who needs rest most', () => {
  const muscles = recoveryOf([session(6, { quadriceps: 12, chest: 3 })], NOW);
  const order = muscles.map((m) => m.slug);
  assert.ok(order.indexOf('quadriceps') < order.indexOf('chest'));
  assert.ok(order.indexOf('chest') < order.indexOf('calves'));
});

test('every recovery figure is a percentage', () => {
  const muscles = recoveryOf(
    [session(0, { quadriceps: 99 }), session(1000, { chest: 99 })],
    NOW
  );
  for (const m of muscles) {
    assert.ok(m.recovery >= 0 && m.recovery <= 100, `${m.slug} = ${m.recovery}`);
    assert.equal(m.recovery, Math.round(m.recovery));
  }
});

test('with no history it says so rather than claiming everything is rested', () => {
  assert.ok(todaysWord(recoveryOf([], NOW)).includes('기록이 없'));
});

test('the day word names the tired ones, and stays quiet when none are', () => {
  const rested = todaysWord(recoveryOf([session(200, { chest: 12 })], NOW));
  assert.ok(rested.includes('전부 쉬었어요'));

  const oneTired = todaysWord(recoveryOf([session(3, { quadriceps: 12 })], NOW));
  assert.ok(oneTired.includes(MUSCLE_LABELS.quadriceps));
});

test('a whole-body session is called out as one, not listed muscle by muscle', () => {
  const everything = Object.fromEntries(
    Object.keys(MUSCLE_LABELS).map((slug) => [slug, FULL_LOAD])
  );
  const word = todaysWord(recoveryOf([session(1, everything)], NOW));
  assert.ok(word.includes('쉬거나'));
});

test('READY sits where a muscle is worth training again', () => {
  assert.ok(READY > 50 && READY < 100);
});

test('the suggestion prefers the one left alone longest, not the highest number', () => {
  const muscles = recoveryOf(
    [session(200, { chest: 6 }), session(100, { biceps: 6 })],
    NOW
  );
  const picked = freshest(muscles, 2).map((m) => m.slug);
  // Both are back to 100; never-trained ones have waited longer than either.
  assert.ok(picked.every((slug) => slug !== 'chest' && slug !== 'biceps'));
});

test('among rested muscles, longer since beats shorter since', () => {
  const muscles = recoveryOf(
    [session(200, { chest: 6 }), session(100, { biceps: 6 })],
    NOW
  ).filter((m) => m.slug === 'chest' || m.slug === 'biceps');
  assert.equal(freshest(muscles, 1)[0].slug, 'chest');
});

test('nothing rested enough is suggested as ready', () => {
  const everything = Object.fromEntries(
    Object.keys(MUSCLE_LABELS).map((slug) => [slug, FULL_LOAD])
  );
  assert.equal(freshest(recoveryOf([session(1, everything)], NOW)).length, 0);
});

test('the tired list is worst first and stops where rest stops being owed', () => {
  const muscles = recoveryOf([session(6, { quadriceps: 12, chest: 6 })], NOW);
  const tired = stillTired(muscles);
  assert.equal(tired[0].slug, 'quadriceps');
  assert.ok(tired.every((m) => m.recovery < READY));
});

test('a plan that hits a sore muscle gets a word, and one that does not gets none', () => {
  const muscles = recoveryOf([session(4, { quadriceps: 12 })], NOW);
  const warned = clashWord(['quadriceps', 'gluteal'], muscles);
  assert.ok(warned?.includes(MUSCLE_LABELS.quadriceps));
  assert.equal(clashWord(['chest', 'triceps'], muscles), null);
  assert.equal(clashWord([], muscles), null);
});

test('the word names the sorest, not whichever came first', () => {
  const muscles = recoveryOf([session(4, { quadriceps: 12, hamstring: 4 })], NOW);
  const warned = clashWord(['hamstring', 'quadriceps'], muscles);
  assert.ok(warned?.startsWith(MUSCLE_LABELS.quadriceps));
});

test('it advises, and never refuses', () => {
  const muscles = recoveryOf([session(0, { quadriceps: 99 })], NOW);
  const warned = clashWord(['quadriceps'], muscles)!;
  for (const forbidding of ['하지 마', '안 돼', '금지', '쉬세요.']) {
    assert.ok(!warned.includes(forbidding), warned);
  }
});

test('every muscle listed is one some exercise can actually work', () => {
  // Otherwise it sits at 100% for ever, never having been trained — which
  // sorts it to the front of the suggestions, recommending a muscle nothing
  // in the app can help with.
  const reachable = new Set(
    DEFAULT_EXERCISES.flatMap((e) =>
      slugsOf({
        muscle_group: e.muscle_group,
        secondary_group: e.secondary_group,
        body_parts: e.body_parts,
      })
    )
  );
  for (const slug of Object.keys(MUSCLE_LABELS)) {
    assert.ok(reachable.has(slug), `${slug} (${MUSCLE_LABELS[slug]}) cannot be trained`);
  }
});
