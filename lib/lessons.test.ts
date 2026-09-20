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
  tripTimes,
  enrol,
  daysLeft,
  isFinished,
  enrolmentWord,
  lengthWord,
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

test('a lesson bought in the small hours starts in the morning, not at once', () => {
  const { leaves, returns } = tripTimes(new Date(2026, 8, 20, 1, 30));
  assert.equal(leaves.getDate(), 20);
  assert.equal(leaves.getHours(), 9);
  assert.equal(returns.getHours(), 15);
});

test('a lesson bought after she would have left waits for tomorrow', () => {
  const { leaves } = tripTimes(new Date(2026, 8, 20, 14, 0));
  assert.equal(leaves.getDate(), 21);
  assert.equal(leaves.getHours(), 9);
});

test('she always comes back the same day she sets off', () => {
  const { leaves, returns } = tripTimes(new Date(2026, 8, 20, 9, 30));
  assert.equal(returns.getDate(), leaves.getDate());
  assert.ok(returns > leaves);
});

test('every lesson takes real days, and the longer ones teach more', () => {
  for (const lesson of LESSONS) {
    assert.ok(lesson.days >= 1, `${lesson.name} takes no time`);
    assert.equal(lesson.days, Math.round(lesson.days));
  }
  const taught = (l: (typeof LESSONS)[number]) =>
    Object.values(l.teaches).reduce((s, n) => s + (n ?? 0), 0);
  const byDays = [...LESSONS].sort((a, b) => a.days - b.days);
  assert.ok(taught(byDays[0]) <= taught(byDays[byDays.length - 1]));
});

test('a course runs from today for as many mornings as it says', () => {
  const start = new Date(2026, 8, 20, 23, 30);
  const lesson = LESSONS.find((l) => l.days === 3)!;
  const signed = enrol(lesson, start);
  assert.equal(signed.startedOn, '2026-09-20');
  assert.equal(signed.endsOn, '2026-09-22', 'inclusive: three mornings, not four');
  assert.equal(daysLeft(signed, start), 3);
});

test('the hour it was bought does not change its length', () => {
  const lesson = LESSONS[0];
  const early = enrol(lesson, new Date(2026, 8, 20, 0, 1));
  const late = enrol(lesson, new Date(2026, 8, 20, 23, 59));
  assert.deepEqual(early, late);
});

test('days left counts down and stops at zero', () => {
  const lesson = LESSONS.find((l) => l.days === 3)!;
  const signed = enrol(lesson, new Date(2026, 8, 20));
  assert.equal(daysLeft(signed, new Date(2026, 8, 20)), 3);
  assert.equal(daysLeft(signed, new Date(2026, 8, 21)), 2);
  assert.equal(daysLeft(signed, new Date(2026, 8, 22)), 1);
  assert.equal(daysLeft(signed, new Date(2026, 8, 23)), 0);
  assert.equal(daysLeft(signed, new Date(2026, 9, 30)), 0);
});

test('a course is over the morning after its last lesson, not before', () => {
  const lesson = LESSONS.find((l) => l.days === 3)!;
  const signed = enrol(lesson, new Date(2026, 8, 20));
  assert.equal(isFinished(signed, new Date(2026, 8, 22, 23, 59)), false);
  assert.equal(isFinished(signed, new Date(2026, 8, 23, 0, 1)), true);
});

test('it says what she is doing and how much is left', () => {
  const lesson = LESSONS.find((l) => l.days === 3)!;
  const signed = enrol(lesson, new Date(2026, 8, 20));
  const midway = enrolmentWord(signed, new Date(2026, 8, 21));
  assert.ok(midway.includes(lesson.name));
  assert.ok(midway.includes('2일'));
  assert.ok(enrolmentWord(signed, new Date(2026, 8, 22)).includes('마지막'));
});

test('a length reads in weeks when it is whole weeks', () => {
  assert.equal(lengthWord({ ...LESSONS[0], days: 7 }), '1주');
  assert.equal(lengthWord({ ...LESSONS[0], days: 14 }), '2주');
  assert.equal(lengthWord({ ...LESSONS[0], days: 5 }), '5일');
});
