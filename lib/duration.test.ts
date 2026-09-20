import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estimatedSeconds,
  estimateWord,
  remainingSeconds,
  remainingWord,
  SECONDS_PER_SET,
  type PlannedSet,
} from './duration.ts';

const rest60 = () => 60;
function set(over: Partial<PlannedSet> = {}): PlannedSet {
  return { done: false, duration_sec: 0, exercise_id: 'e1', ...over };
}

test('an empty board and a finished board both have nothing left', () => {
  assert.equal(remainingSeconds([], rest60), 0);
  assert.equal(remainingSeconds([set({ done: true }), set({ done: true })], rest60), 0);
});

test('one set left is that set, with no rest after it', () => {
  assert.equal(remainingSeconds([set()], rest60), SECONDS_PER_SET);
});

test('rest is counted between sets, not after the last one', () => {
  // Three sets, two rests — the third one ends the session.
  assert.equal(remainingSeconds([set(), set(), set()], rest60), SECONDS_PER_SET * 3 + 120);
});

test('what is already done is not counted again', () => {
  const board = [set({ done: true }), set({ done: true }), set(), set()];
  assert.equal(remainingSeconds(board, rest60), SECONDS_PER_SET * 2 + 60);
});

test('each movement rests for as long as it was set to', () => {
  const board = [set({ exercise_id: 'slow' }), set({ exercise_id: 'fast' }), set()];
  const restOf = (id: string) => (id === 'slow' ? 180 : 30);
  assert.equal(remainingSeconds(board, restOf), SECONDS_PER_SET * 3 + 180 + 30);
});

test('a cardio set is worth the minutes it was planned for', () => {
  assert.equal(remainingSeconds([set({ duration_sec: 1200 })], rest60), 1200);
});

test('nothing left is said by saying nothing', () => {
  assert.equal(remainingWord(0), null);
  assert.equal(remainingWord(-5), null);
});

test('the last few minutes stop being counted at you', () => {
  assert.equal(remainingWord(120), '거의 다 하셨어요');
  assert.equal(remainingWord(280), '거의 다 하셨어요');
});

test('minutes are rounded to something a person would say', () => {
  // Never 37분: the estimate is not good to the minute, and a precise-looking
  // figure invites being held to it.
  assert.equal(remainingWord(37 * 60), '35분쯤 남았어요');
  assert.equal(remainingWord(22 * 60), '20분쯤 남았어요');
  assert.equal(remainingWord(8 * 60), '10분쯤 남았어요');
});

test('an hour reads as an hour', () => {
  assert.equal(remainingWord(60 * 60), '1시간쯤 남았어요');
  assert.equal(remainingWord(85 * 60), '1시간 30분쯤 남았어요');
});

test('a session with no recorded length can still be estimated', () => {
  // The true length is gone. 「—」 was the first answer and it earned
  // 「걸린 시간은 여전히 - 네」 — an estimate is honest as long as it says so.
  const sets = [set(), set(), set(), set()];
  const seconds = estimatedSeconds(sets, rest60);
  assert.equal(seconds, SECONDS_PER_SET * 4 + 60 * 3);
  // Rounded to five, so 6분 reads as 약 5분 — an estimate that names a
  // precise minute is pretending to know something it does not.
  assert.equal(estimateWord(seconds), '약 5분');
});

test('an estimate always says it is one', () => {
  assert.match(estimateWord(25 * 60)!, /^약 /);
  assert.equal(estimateWord(0), null);
});

test('a cardio session is estimated from its own minutes', () => {
  assert.equal(estimatedSeconds([set({ duration_sec: 1800 })], rest60), 1800);
});

test('nothing on the board is nothing to estimate', () => {
  assert.equal(estimatedSeconds([], rest60), 0);
});
