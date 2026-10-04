import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomTimeOf } from './roomTime.ts';

const at = (hour: number, minute = 0) => new Date(2026, 9, 5, hour, minute);

test('the room is in daylight from six until five', () => {
  assert.equal(roomTimeOf(at(6)), 'day');
  assert.equal(roomTimeOf(at(12)), 'day');
  assert.equal(roomTimeOf(at(16, 59)), 'day');
});

test('evening is from five until eight', () => {
  assert.equal(roomTimeOf(at(17)), 'evening');
  assert.equal(roomTimeOf(at(19, 59)), 'evening');
});

test('night runs past midnight to six', () => {
  assert.equal(roomTimeOf(at(20)), 'night');
  assert.equal(roomTimeOf(at(0)), 'night');
  assert.equal(roomTimeOf(at(5, 59)), 'night');
});
