import assert from 'node:assert/strict';
import test from 'node:test';
import {
  askRelay,
  HEARTBEAT_EVERY_MS,
  HEARTBEAT_STALE_MS,
  pollDelay,
  RelayAsleep,
  relayThenDirect,
  relayAlive,
  relayOutcome,
  STALE_AFTER_MS,
  RELAY_WAIT_MS,
  type RelayRow,
  type RelayStore,
} from './relay.ts';

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

const NOW = Date.parse('2026-10-03T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

test('a worker that wrote a minute ago is awake', () => {
  assert.equal(relayAlive(ago(HEARTBEAT_EVERY_MS), NOW), true);
});

test('one missed beat is not a worker that has gone', () => {
  // The line dropped for a moment; the next beat is on its way.
  assert.equal(relayAlive(ago(HEARTBEAT_EVERY_MS + 30_000), NOW), true);
  assert.ok(HEARTBEAT_STALE_MS >= 2 * HEARTBEAT_EVERY_MS);
});

test('two minutes of silence is a PC that is off', () => {
  assert.equal(relayAlive(ago(HEARTBEAT_STALE_MS), NOW), false);
  assert.equal(relayAlive(ago(8 * 60 * 60_000), NOW), false);
});

test('never having written is off, and so is nonsense', () => {
  assert.equal(relayAlive(null, NOW), false);
  assert.equal(relayAlive('어제쯤', NOW), false);
});

test('a phone whose clock runs slow still sees a live worker', () => {
  assert.equal(relayAlive(new Date(NOW + 20_000).toISOString(), NOW), true);
});

test('with the worker off nothing is asked and nobody waits', async () => {
  let inserted = 0;
  let slept = 0;
  const store: RelayStore = {
    async insert() {
      inserted += 1;
      return 'id';
    },
    async read() {
      return row('queued');
    },
    async lastBeat() {
      return ago(10 * 60_000);
    },
  };
  await assert.rejects(
    askRelay(store, 'advice', 'p', { now: () => NOW, sleep: async () => void (slept += 1) }),
    RelayAsleep
  );
  assert.equal(inserted, 0);
  assert.equal(slept, 0);
});

test('a heartbeat that cannot be read counts as off', async () => {
  const store: RelayStore = {
    async insert() {
      return 'id';
    },
    async read() {
      return row('done', '답');
    },
    async lastBeat() {
      throw new Error('표가 없음');
    },
  };
  await assert.rejects(askRelay(store, 'advice', 'p', { now: () => NOW }), RelayAsleep);
});

test('with the worker awake the question goes in as before', async () => {
  const store: RelayStore = {
    async insert() {
      return 'id';
    },
    async read() {
      return row('done', '좋았어요');
    },
    async lastBeat() {
      return ago(5_000);
    },
  };
  assert.equal(await askRelay(store, 'advice', 'p', { now: () => NOW }), '좋았어요');
});

test('with the worker off the question goes straight to the model', async () => {
  const ask = relayThenDirect(
    async () => {
      throw new RelayAsleep();
    },
    async (kind, prompt) => `곧장: ${kind} ${prompt}`
  );
  assert.equal(await ask('advice', 'p'), '곧장: advice p');
});

test('a relay that was asked and did not answer is not asked twice by another road', async () => {
  // Forty-five seconds are already gone. The rules answer from here.
  let direct = 0;
  const ask = relayThenDirect(
    async () => {
      throw new Error('시간 끝');
    },
    async () => {
      direct += 1;
      return '곧장';
    }
  );
  await assert.rejects(ask('advice', 'p'), /시간 끝/);
  assert.equal(direct, 0);
});

test('a relay that answers is the answer', async () => {
  const ask = relayThenDirect(
    async () => '중계의 답',
    async () => '곧장'
  );
  assert.equal(await ask('advice', 'p'), '중계의 답');
});
