import assert from 'node:assert/strict';
import test from 'node:test';
import { ALIASES, aliasesOf } from './aliases.ts';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { matchesAny } from './hangul.ts';

function find(query: string) {
  return DEFAULT_EXERCISES.filter((e) =>
    matchesAny([e.name, ...aliasesOf(e.name)], query)
  ).map((e) => e.name);
}

test('every alias belongs to a movement that actually exists', () => {
  // A typo in a key is silent otherwise: the alias simply never matches, and
  // nobody finds out until someone types it and sees nothing.
  const names = new Set(DEFAULT_EXERCISES.map((e) => e.name));
  for (const name of Object.keys(ALIASES)) {
    assert.ok(names.has(name), `${name} is not in the catalogue`);
  }
});

test('the English name finds it', () => {
  assert.ok(find('bench press').includes('벤치프레스'));
  assert.ok(find('deadlift').includes('데드리프트'));
  assert.ok(find('lat pulldown').includes('랫 풀다운'));
});

test('the short form people actually say finds it', () => {
  assert.ok(find('랫풀').includes('랫 풀다운'));
  assert.ok(find('사레레').includes('사이드 레터럴 레이즈'));
  assert.ok(find('rdl').includes('루마니안 데드리프트'));
});

test('the machine sticker and the gym word find it', () => {
  assert.ok(find('턱걸이').includes('풀업'));
  assert.ok(find('팔굽혀펴기').includes('푸시업'));
  assert.ok(find('런닝머신').includes('러닝'));
});

test('initials still work, and now reach the aliases too', () => {
  assert.ok(find('ㅂㅊㅍㄹㅅ').includes('벤치프레스'));
  assert.ok(find('ㅌㄱㅇ').includes('풀업'));
});

test('an alias never renames anything', () => {
  // The card still says the catalogue name, which is what the history reads.
  for (const e of DEFAULT_EXERCISES) {
    assert.ok(!aliasesOf(e.name).includes(e.name), e.name);
  }
});

test('a movement with no aliases is not an error', () => {
  assert.deepEqual(aliasesOf('있지도 않은 종목'), []);
});

test('most of the catalogue answers to a second name', () => {
  const covered = DEFAULT_EXERCISES.filter((e) => aliasesOf(e.name).length > 0);
  assert.ok(
    covered.length >= DEFAULT_EXERCISES.length * 0.9,
    `${covered.length} of ${DEFAULT_EXERCISES.length}`
  );
});
