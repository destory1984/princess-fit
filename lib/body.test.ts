import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmi, change, latest, parseMeasurements, series, type BodyLog } from './body.ts';

const TODAY = new Date(2026, 8, 20);

function log(day: string, over: Partial<BodyLog> = {}): BodyLog {
  return {
    id: day,
    measured_on: day,
    weight_kg: null,
    body_fat_pct: null,
    muscle_kg: null,
    height_cm: null,
    ...over,
  };
}

test('the latest reading is the newest one that has that measurement', () => {
  const logs = [
    log('2026-09-20', { weight_kg: 79.4 }),
    log('2026-09-18', { weight_kg: 80.1, body_fat_pct: 23.4 }),
  ];
  assert.equal(latest(logs, 'weight_kg'), 79.4);
  // The newest row has no body fat, so the answer comes from the one before.
  assert.equal(latest(logs, 'body_fat_pct'), 23.4);
  assert.equal(latest(logs, 'muscle_kg'), null);
});

test('change measures across the window, not against yesterday', () => {
  const logs = [
    log('2026-08-25', { weight_kg: 81 }),
    log('2026-09-10', { weight_kg: 80 }),
    log('2026-09-19', { weight_kg: 79.4 }),
  ];
  const moved = change(logs, 'weight_kg', 30, TODAY)!;
  assert.equal(moved.delta, -1.6);
  assert.equal(moved.from, '2026-08-25');
  assert.equal(moved.to, '2026-09-19');
});

// Two readings a day apart say nothing; one reading says less.
test('a single reading in the window is not a trend', () => {
  const logs = [log('2026-09-19', { weight_kg: 79.4 })];
  assert.equal(change(logs, 'weight_kg', 30, TODAY), null);
});

test('readings outside the window are left out of the change', () => {
  const logs = [
    log('2026-01-01', { weight_kg: 95 }),
    log('2026-09-19', { weight_kg: 79.4 }),
  ];
  assert.equal(change(logs, 'weight_kg', 30, TODAY), null, 'January is not last month');
});

test('a series comes back oldest first and skips blank readings', () => {
  const logs = [
    log('2026-09-19', { weight_kg: 79.4 }),
    log('2026-09-10', { body_fat_pct: 23 }),
    log('2026-09-01', { weight_kg: 81 }),
  ];
  assert.deepEqual(
    series(logs, 'weight_kg').map((p) => p.value),
    [81, 79.4]
  );
});

test('parseMeasurements keeps what was typed and skips blank boxes', () => {
  assert.deepEqual(parseMeasurements({ weight_kg: '79,4', body_fat_pct: '', muscle_kg: ' 33 ', height_cm: '' }), {
    values: { weight_kg: 79.4, muscle_kg: 33 },
  });
});

test('parseMeasurements names the box it cannot read', () => {
  assert.deepEqual(parseMeasurements({ weight_kg: '79', body_fat_pct: 'abc', muscle_kg: '', height_cm: '' }), {
    bad: 'body_fat_pct',
  });
  assert.deepEqual(parseMeasurements({ weight_kg: '0', body_fat_pct: '', muscle_kg: '', height_cm: '' }), {
    bad: 'weight_kg',
  });
});

test('parseMeasurements with every box blank has nothing to save', () => {
  assert.deepEqual(parseMeasurements({ weight_kg: '', body_fat_pct: ' ', muscle_kg: '', height_cm: '' }), { empty: true });
});

test('bmi to one decimal, and none without a plausible height', () => {
  assert.equal(bmi(72, 175), 23.5);
  assert.equal(bmi(null, 175), null);
  assert.equal(bmi(72, null), null);
  assert.equal(bmi(72, 17.5), null);
  assert.equal(bmi(20, 115), 15.1); // a child

});
