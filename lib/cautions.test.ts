import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAUTION, cautionOf } from './cautions.ts';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';

test('every exercise the app ships with says what to watch for', () => {
  const missing = DEFAULT_EXERCISES.map((e) => e.name).filter((n) => !cautionOf(n));
  assert.deepEqual(missing, []);
});

test('no caution is written for an exercise that is not there', () => {
  const names = new Set(DEFAULT_EXERCISES.map((e) => e.name));
  assert.deepEqual(Object.keys(CAUTION).filter((n) => !names.has(n)), []);
});

test('an exercise made by hand has none', () => {
  assert.equal(cautionOf('한발 데드'), null);
});

test('a caution is general advice, not something the app saw', () => {
  for (const [name, line] of Object.entries(CAUTION)) {
    // 「무릎이 모였었죠」 would be the app claiming eyes it does not have.
    assert.doesNotMatch(line, /였죠|셨죠|봤|보니|지난번/, name);
    assert.match(line, /요\.$/, name);
    // Two short sentences at most: it sits on the workout card.
    assert.ok(line.length <= 80, `${name}: ${line.length}`);
  }
});
