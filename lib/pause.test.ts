import assert from 'node:assert/strict';
import test from 'node:test';
import { PAUSE, pauseNotice } from './pause.ts';

test('shows through the last day and not after', () => {
  assert.equal(pauseNotice(new Date(2026, 9, 9)), PAUSE.text);
  assert.equal(pauseNotice(new Date(2026, 9, 31, 23, 59)), PAUSE.text);
  assert.equal(pauseNotice(new Date(2026, 10, 1)), null);
});
