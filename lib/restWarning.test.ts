import assert from 'node:assert/strict';
import test from 'node:test';
import { WARN_SECONDS, warningDue } from './restWarning.ts';

test('the warning comes once, in the last ten seconds of a rest long enough to have them', () => {
  assert.equal(WARN_SECONDS, 10);
  assert.equal(warningDue(11_000, 60, false), false);
  assert.equal(warningDue(10_000, 60, false), true);
  assert.equal(warningDue(3_000, 60, false), true);
  // Said already, or the rest is over: the bell's turn.
  assert.equal(warningDue(3_000, 60, true), false);
  assert.equal(warningDue(0, 60, false), false);
  // In a twenty second rest it would come halfway through.
  assert.equal(warningDue(9_000, 20, false), false);
  assert.equal(warningDue(9_000, 30, false), true);
});
