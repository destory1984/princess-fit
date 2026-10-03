import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wholeDots } from './dots.ts';

test('a height that already gives whole pixels per dot is kept', () => {
  assert.equal(wholeDots(192, 96, 1), 192);
  assert.equal(wholeDots(144, 96, 2), 144); // 1.5 units x 2 = 3 pixels a dot
});

test('a height between two whole sizes goes to the nearer', () => {
  // 155 / 96 = 1.61 units a dot. On a 1x screen that is 2 pixels, on a 3x screen 5.
  assert.equal(wholeDots(155, 96, 1), 192);
  assert.equal(wholeDots(155, 96, 3), 160);
});

test('every answer is a whole number of pixels per dot', () => {
  for (const density of [1, 1.5, 2, 2.625, 3]) {
    for (let wanted = 40; wanted < 400; wanted += 7) {
      const perDot = (wholeDots(wanted, 96, density) / 96) * density;
      assert.ok(Math.abs(perDot - Math.round(perDot)) < 1e-9, `${wanted} at ${density}x`);
    }
  }
});

test('she never shrinks below one pixel a dot', () => {
  assert.equal(wholeDots(10, 96, 1), 96);
});
