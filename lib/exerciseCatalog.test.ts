import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';

const track = (name: string) => DEFAULT_EXERCISES.find((e) => e.name === name)?.track_type;

// Asking for kilometres nobody knows gets a 0 typed in, or the entry skipped.
test('walking and rowing are timed, not measured in kilometres', () => {
  assert.equal(track('걷기'), 'duration');
  assert.equal(track('로잉 머신'), 'duration');
});

// Most stairs climbed are an apartment stairwell, where the floor is known.
test('stairs are counted in floors', () => {
  assert.equal(track('계단 오르기'), 'floors');
});

test('every movement has a name of its own', () => {
  const names = DEFAULT_EXERCISES.map((e) => e.name);
  assert.equal(new Set(names).size, names.length);
});

// A card with no how-to is a card that sends someone to a search engine
// between sets. The list more than doubled once; this is what kept the new
// half from arriving without words.
test('every movement says how it is done', () => {
  for (const e of DEFAULT_EXERCISES) assert.ok(e.how_to.trim().length > 0, e.name);
});

// Recovery only knows these. A part spelt any other way is a muscle that
// nothing ever tires and that therefore tops every suggestion (NOTES 3절,
// 내전근·외전근).
test('body parts are spelt the way recovery reads them', () => {
  const known = new Set([
    'abs', 'biceps', 'calves', 'chest', 'deltoids', 'forearm', 'gluteal', 'hamstring',
    'lower-back', 'obliques', 'quadriceps', 'trapezius', 'triceps', 'upper-back',
  ]);
  for (const e of DEFAULT_EXERCISES) {
    for (const part of e.body_parts.split(',')) assert.ok(known.has(part), `${e.name}: ${part}`);
  }
});

test('the catalogue is wide enough not to stop a first set', () => {
  assert.ok(DEFAULT_EXERCISES.length >= 150, String(DEFAULT_EXERCISES.length));
});
