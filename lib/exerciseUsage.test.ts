import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortByUsage, type UsageMap } from './exerciseUsage.ts';

const items = [
  { id: 'a', name: '벤치프레스' },
  { id: 'b', name: '스쿼트' },
  { id: 'c', name: '데드리프트' },
  { id: 'd', name: '풀업' },
];

const usage: UsageMap = new Map([
  ['a', { count: 12, lastOn: '2026-09-01' }],
  ['b', { count: 3, lastOn: '2026-09-19' }],
  ['c', { count: 12, lastOn: '2026-08-01' }],
]);

const ids = (list: { id: string }[]) => list.map((i) => i.id);

test('전체 keeps the order it was given', () => {
  assert.deepEqual(ids(sortByUsage(items, usage, 'all')), ['a', 'b', 'c', 'd']);
});

test('최근 puts the most recently used first', () => {
  assert.deepEqual(ids(sortByUsage(items, usage, 'recent')), ['b', 'a', 'c']);
});

test('자주 puts the most used first, and breaks ties by name', () => {
  // a and c are both used twelve times; 데드리프트 sorts before 벤치프레스.
  assert.deepEqual(ids(sortByUsage(items, usage, 'often')), ['c', 'a', 'b']);
});

test('an exercise never used is left out of 최근 and 자주', () => {
  assert.ok(!ids(sortByUsage(items, usage, 'recent')).includes('d'));
  assert.ok(!ids(sortByUsage(items, usage, 'often')).includes('d'));
});

test('no history at all means those lists are simply empty', () => {
  assert.deepEqual(sortByUsage(items, new Map(), 'recent'), []);
  assert.deepEqual(ids(sortByUsage(items, new Map(), 'all')), ['a', 'b', 'c', 'd']);
});

const starred = [
  { id: 'a', name: '벤치프레스', favourite: true },
  { id: 'b', name: '스쿼트', favourite: false },
  { id: 'c', name: '데드리프트', favourite: true },
];

test('즐겨찾기 shows only starred, in the order they were given', () => {
  // Not ranked: a list you curated should stay the list you curated.
  assert.deepEqual(ids(sortByUsage(starred, usage, 'favourite')), ['a', 'c']);
});

test('starring nothing leaves that list empty rather than showing everything', () => {
  const none = starred.map((e) => ({ ...e, favourite: false }));
  assert.deepEqual(sortByUsage(none, usage, 'favourite'), []);
});

test('starring does not change the other lists', () => {
  assert.deepEqual(ids(sortByUsage(starred, usage, 'recent')), ['b', 'a', 'c']);
});
