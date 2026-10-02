import assert from 'node:assert/strict';
import test from 'node:test';
import { askRelay, pollDelay, relayOutcome, STALE_AFTER_MS, RELAY_WAIT_MS, type RelayRow, type RelayStore } from './relay.ts';

const row = (status: string, answer: string | null = null, error: string | null = null): RelayRow => ({ status, answer, error });

test('waiting rows wait', () => {
  assert.deepEqual(relayOutcome(row('queued')), { state: 'waiting' });
  assert.deepEqual(relayOutcome(row('working')), { state: 'waiting' });
});

test('a done row with words is an answer, trimmed', () => {
  assert.deepEqual(relayOutcome(row('done', '  좋았어요  ')), { state: 'answered', text: '좋았어요' });
});

test('a done row with nothing in it is a failure, not an empty answer', () => {
  assert.equal(relayOutcome(row('done', '   ')).state, 'failed');
  assert.equal(relayOutcome(row('done', null)).state, 'failed');
});

test('failed and expired rows say why', () => {
  assert.deepEqual(relayOutcome(row('failed', null, 'ollama 꺼짐')), { state: 'failed', reason: 'ollama 꺼짐' });
  assert.deepEqual(relayOutcome(row('expired')), { state: 'failed', reason: 'expired' });
  assert.equal(relayOutcome(null).state, 'failed');
});

test('the worker gives up on a row only after the phone has', () => {
  assert.ok(STALE_AFTER_MS > RELAY_WAIT_MS);
});

test('polling starts quick and settles at three seconds', () => {
  assert.equal(pollDelay(0), 1000);
  assert.ok(pollDelay(3) > pollDelay(0));
  assert.equal(pollDelay(100), 3000);
});

/** 가짜 시계와 가짜 우체통. reads는 읽을 때마다 하나씩 내준다. */
function fake(reads: (RelayRow | null)[]) {
  let clock = 0;
  const inserted: { kind: string; prompt: string }[] = [];
  const store: RelayStore = {
    async insert(kind, prompt) {
      inserted.push({ kind, prompt });
      return 'id-1';
    },
    async read() {
      return reads.length > 1 ? reads.shift()! : reads[0];
    },
  };
  return {
    store,
    inserted,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
  };
}

test('asks once and returns the answer when it lands', async () => {
  const f = fake([row('queued'), row('working'), row('done', '하체가 잘 버텼어요')]);
  const text = await askRelay(f.store, 'advice', 'p', { now: f.now, sleep: f.sleep });
  assert.equal(text, '하체가 잘 버텼어요');
  assert.deepEqual(f.inserted, [{ kind: 'advice', prompt: 'p' }]);
});

test('throws when the PC never answers, so the rules can', async () => {
  const f = fake([row('queued')]);
  await assert.rejects(askRelay(f.store, 'advice', 'p', { now: f.now, sleep: f.sleep, waitMs: 10_000 }), /시간 끝/);
  assert.ok(f.now() <= 10_000, 'does not sleep past the deadline');
});

test('throws on a failed row without waiting out the clock', async () => {
  const f = fake([row('failed', null, '모두 실패')]);
  await assert.rejects(askRelay(f.store, 'advice', 'p', { now: f.now, sleep: f.sleep }), /모두 실패/);
  assert.equal(f.now(), 0);
});

test('stops when the caller cancels', async () => {
  const f = fake([row('queued')]);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(askRelay(f.store, 'advice', 'p', { now: f.now, sleep: f.sleep, signal: controller.signal }), /취소/);
});
