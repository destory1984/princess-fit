import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { presetById, resolvePreset, ROUTINE_PRESETS } from './routinePresets.ts';

const catalogue = DEFAULT_EXERCISES.map((e, i) => ({ id: `e${i}`, name: e.name }));

// A preset naming an exercise the catalogue does not have would silently build
// a shorter routine than its card advertises.
test('every preset names exercises that ship with the app', () => {
  for (const preset of ROUTINE_PRESETS) {
    const { missing } = resolvePreset(preset, catalogue);
    assert.deepEqual(missing, [], `${preset.name} wants ${missing.join(', ')}`);
  }
});

test('presets are distinct, named and long enough to be a workout', () => {
  assert.equal(new Set(ROUTINE_PRESETS.map((p) => p.id)).size, ROUTINE_PRESETS.length);
  for (const p of ROUTINE_PRESETS) {
    assert.ok(p.exercises.length >= 4, p.name);
    assert.ok(p.minutes > 0 && p.minutes <= 90, p.name);
    assert.ok(p.exercises.every((e) => e.sets > 0), p.name);
  }
});

test('an exercise the account lacks is reported, not dropped in silence', () => {
  const preset = presetById('full-body')!;
  const thin = catalogue.filter((e) => e.name !== '랫 풀다운');
  const { found, missing } = resolvePreset(preset, thin);
  assert.deepEqual(missing, ['랫 풀다운']);
  assert.equal(found.length, preset.exercises.length - 1);
});

test('the beginner preset comes first, because it is the one to pick', () => {
  assert.equal(ROUTINE_PRESETS[0].id, 'full-body');
});
