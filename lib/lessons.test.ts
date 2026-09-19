import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attend,
  CULTURE_CAP,
  EMPTY_CULTURE,
  gainFor,
  lessonById,
  LESSONS,
  previewOf,
  refinementTitle,
} from './lessons.ts';

test('a lesson teaches what it says it teaches', () => {
  const after = attend(lessonById('etiquette')!, EMPTY_CULTURE);
  assert.equal(after.grace, 8);
  assert.equal(after.learning, 0);
  assert.equal(after.charm, 0);
});

test('repeating the same lesson teaches less each time', () => {
  const lesson = lessonById('literature')!;
  let culture = EMPTY_CULTURE;
  const gains: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    const before = culture.learning;
    culture = attend(lesson, culture);
    gains.push(culture.learning - before);
  }
  assert.equal(gains[0], 8);
  assert.ok(gains.at(-1)! < gains[0], 'the last lesson teaches less than the first');
  assert.ok(gains.every((g) => g >= 1), 'no lesson is ever a total waste');
});

test('nothing goes past the cap', () => {
  const maxed = { grace: CULTURE_CAP, learning: CULTURE_CAP, charm: CULTURE_CAP };
  assert.deepEqual(attend(LESSONS[0], maxed), maxed);
  assert.equal(gainFor(CULTURE_CAP, 9), 0);
});

test('the preview names only what would actually change', () => {
  const preview = previewOf(lessonById('dance')!, EMPTY_CULTURE);
  assert.deepEqual(
    preview.map((p) => p.name),
    ['기품', '매력']
  );
  assert.ok(preview.every((p) => p.gain > 0));
});

test('an unschooled girl and a finished one read differently', () => {
  assert.match(refinementTitle(EMPTY_CULTURE), /배운 것이 없는/);
  assert.match(refinementTitle({ grace: 95, learning: 95, charm: 95 }), /왕궁/);
});

test('every lesson has a price and teaches something', () => {
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
  for (const l of LESSONS) {
    assert.ok(l.price > 0, l.id);
    assert.ok(Object.keys(l.teaches).length > 0, l.id);
  }
});
