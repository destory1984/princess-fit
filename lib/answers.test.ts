import assert from 'node:assert/strict';
import test from 'node:test';
import { answerNotice, seenUpTo, unreadAnswers, type Answerable } from './answers.ts';

const r = (name: string, status: string, handled_at: string | null, reply: string | null = null): Answerable => ({
  name,
  status,
  reply,
  handled_at,
});

const added = r('케이블 풀오버', 'added', '2026-09-20T10:00:00Z');
const declined = r('해머 로우', 'declined', '2026-09-21T10:00:00Z');
const seenOnly = r('벨트 스쿼트', 'seen', '2026-09-21T12:00:00Z');
const seenWithReply = r('랜드마인', 'seen', '2026-09-19T10:00:00Z', '다음 주에 넣을게요');
const waiting = r('시시 스쿼트', 'new', null);

test('only verdicts and replies count, newest first', () => {
  const all = [added, declined, seenOnly, seenWithReply, waiting];
  assert.deepEqual(unreadAnswers(all, null), [declined, added, seenWithReply]);
});

test('answers before the last look are already seen', () => {
  assert.deepEqual(unreadAnswers([added, declined], '2026-09-20T10:00:00Z'), [declined]);
  assert.deepEqual(unreadAnswers([added, declined], '2026-09-22T00:00:00Z'), []);
});

test('a blank reply is not a reply', () => {
  assert.deepEqual(unreadAnswers([r('x', 'seen', '2026-09-21T00:00:00Z', '  ')], null), []);
});

test('seenUpTo keeps the latest handled time', () => {
  assert.equal(seenUpTo([added, declined, waiting], null), '2026-09-21T10:00:00.000Z');
  assert.equal(seenUpTo([added], '2026-09-22T00:00:00.000Z'), '2026-09-22T00:00:00.000Z');
});

test('seenUpTo with nothing handled keeps what it had', () => {
  assert.equal(seenUpTo([waiting], null), null);
  assert.equal(seenUpTo([], '2026-09-01T00:00:00.000Z'), '2026-09-01T00:00:00.000Z');
});

test('notice names the newest and counts the rest', () => {
  assert.equal(answerNotice([]), null);
  assert.equal(answerNotice([declined]), '「해머 로우」 요청에 답이 왔어요');
  assert.equal(answerNotice([declined, added]), '「해머 로우」 외 1건의 요청에 답이 왔어요');
});
