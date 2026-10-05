import assert from 'node:assert/strict';
import test from 'node:test';
import { bellOf, BELLS, DEFAULT_BELL, nextBell } from './bellKind.ts';

test('nothing chosen, or something unknown, is the clear bell', () => {
  assert.equal(DEFAULT_BELL, 'clear');
  assert.equal(bellOf(null), 'clear');
  assert.equal(bellOf('gong'), 'clear');
  assert.equal(bellOf('soft'), 'soft');
});

test('the row steps through every bell and comes back round', () => {
  let kind = BELLS[0].id;
  const seen = [kind];
  for (let i = 1; i < BELLS.length; i += 1) seen.push((kind = nextBell(kind)));
  assert.deepEqual(seen, BELLS.map((b) => b.id));
  assert.equal(nextBell(kind), BELLS[0].id);
});
