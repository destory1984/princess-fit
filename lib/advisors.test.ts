import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVISORS, DEFAULT_ADVISOR_ID, advisorById } from './advisors.ts';

test('every advisor has a distinct id and a name', () => {
  assert.equal(new Set(ADVISORS.map((a) => a.id)).size, ADVISORS.length);
  for (const a of ADVISORS) assert.ok(a.name.length > 0, a.id);
});

test('an unknown or missing choice falls back to the default', () => {
  assert.equal(advisorById(null).id, DEFAULT_ADVISOR_ID);
  assert.equal(advisorById('nobody').id, DEFAULT_ADVISOR_ID);
  assert.equal(advisorById('munhui').name, '문희');
});
