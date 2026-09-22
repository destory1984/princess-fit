import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  arrivedLines,
  arrivedTotal,
  displayName,
  GIFT_AMOUNTS,
  isCode,
  lastTrainedLine,
  normaliseCode,
  TOGETHER_BONUS,
  trainedToday,
} from './friends.ts';

test('a code is found however it was typed', () => {
  assert.equal(normaliseCode(' abc-def '), 'ABCDEF');
  assert.equal(normaliseCode('ab cd 23'), 'ABCD23');
  assert.ok(isCode('ABCD23'));
});

test('a code with letters the alphabet leaves out is not a code', () => {
  // 0, O, 1, I and L are never issued: they are misread aloud.
  assert.ok(!isCode('ABCDE0'));
  assert.ok(!isCode('ABCDEO'));
  assert.ok(!isCode('ABCDEI'));
  assert.ok(!isCode('ABCDE'));
  assert.ok(!isCode('ABCDEFG'));
});

test('a friend with no name is still somebody', () => {
  assert.equal(displayName('  '), '이름 없는 친구');
  assert.equal(displayName(' 민수 '), '민수');
});

test('when a friend last trained is said as a day', () => {
  const today = new Date('2026-09-22T20:00:00');
  assert.equal(lastTrainedLine(null, today), '아직 운동 기록이 없어요');
  assert.equal(lastTrainedLine('2026-09-22T07:00:00', today), '오늘 운동했어요');
  assert.equal(lastTrainedLine('2026-09-21T23:00:00', today), '어제 운동했어요');
  assert.equal(lastTrainedLine('2026-09-18T10:00:00', today), '4일 전에 운동했어요');
  assert.ok(trainedToday('2026-09-22T07:00:00', today));
  assert.ok(!trainedToday('2026-09-21T07:00:00', today));
  assert.ok(!trainedToday(null, today));
});

test('what arrived reads as one line per friend, with the particle chosen', () => {
  const lines = arrivedLines([
    { kind: 'gift', amount: 10, from_name: '민수' },
    { kind: 'gift', amount: 30, from_name: '민수' },
    { kind: 'together', amount: 20, from_name: '지우' },
    { kind: 'gift', amount: 50, from_name: '' },
  ]);
  assert.deepEqual(lines, [
    '민수가 40G를 보냈어요',
    '지우와 같은 날 운동했어요 +20G',
    '이름 없는 친구가 50G를 보냈어요',
  ]);
  assert.equal(arrivedTotal([{ amount: 10 }, { amount: 20 }]), 30);
});

test('the bonus the app announces is the one the database pays', () => {
  const sql = readFileSync('supabase/social.sql', 'utf8');
  assert.match(sql, new RegExp(`bonus constant integer := ${TOGETHER_BONUS};`));
  assert.match(sql, new RegExp(`p_amount not in \\(${GIFT_AMOUNTS.join(', ')}\\)`));
});
