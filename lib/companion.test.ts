import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysTogether,
  eventMemory,
  memoriesFrom,
  memoryLine,
  RECALL_EVERY,
  stageOf,
  unrecorded,
  whenItWas,
  type Memory,
  type Session,
} from './companion.ts';

function on(day: string, lifts: Session['lifts'] = [], worked = true): Session {
  return { started_at: `${day}T10:00:00`, worked, lifts };
}

/** n consecutive days from the given one. */
function run(from: string, n: number): Session[] {
  const start = new Date(`${from}T10:00:00`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return on(key);
  });
}

const kinds = (ms: Memory[]) => ms.map((m) => m.kind);

test('the stage follows days together, not how much was lifted', () => {
  assert.equal(stageOf(0), 'new');
  assert.equal(stageOf(7), 'new');
  assert.equal(stageOf(8), 'familiar');
  assert.equal(stageOf(30), 'familiar');
  assert.equal(stageOf(31), 'comfortable');
  assert.equal(stageOf(100), 'comfortable');
  assert.equal(stageOf(101), 'old');
});

test('two sessions on one day are one day together, and empty ones are none', () => {
  const sessions = [on('2026-01-01'), on('2026-01-01'), on('2026-01-02', [], false)];
  assert.equal(daysTogether(sessions), 1);
});

test('the first day is remembered on its own date', () => {
  const found = memoriesFrom([on('2026-03-02'), on('2026-03-05')]);
  assert.deepEqual(kinds(found), ['first_day']);
  assert.equal(found[0].day, '2026-03-02');
});

test('three days running is remembered on the third, once', () => {
  const found = memoriesFrom([...run('2026-01-01', 3), ...run('2026-01-10', 3)]);
  const three = found.filter((m) => m.kind === 'three_in_a_row');
  assert.equal(three.length, 1);
  assert.equal(three[0].day, '2026-01-03');
});

test('two days, a gap, and a day are not three in a row', () => {
  const found = memoriesFrom([on('2026-01-01'), on('2026-01-02'), on('2026-01-04')]);
  assert.ok(!kinds(found).includes('three_in_a_row'));
});

test('the stages are remembered on the day they turn', () => {
  const found = memoriesFrom(run('2026-01-01', 101));
  const day = (k: string) => found.find((m) => m.kind === k)?.day;
  assert.equal(day('stage_familiar'), '2026-01-08');
  assert.equal(day('day_30'), '2026-01-30');
  assert.equal(day('stage_comfortable'), '2026-01-31');
  assert.equal(day('day_100'), '2026-04-10');
  assert.equal(day('stage_old'), '2026-04-11');
});

test('the first three-digit lift names the lift', () => {
  const found = memoriesFrom([
    on('2026-01-01', [{ exercise: '스쿼트', kg: 97.5 }]),
    on('2026-01-08', [
      { exercise: '벤치프레스', kg: 60 },
      { exercise: '스쿼트', kg: 102.5 },
    ]),
    on('2026-01-15', [{ exercise: '데드리프트', kg: 140 }]),
  ]);
  const m = found.find((f) => f.kind === 'first_triple_digit')!;
  assert.equal(m.day, '2026-01-08');
  assert.equal(m.detail, '스쿼트 102.5kg');
});

test('coming back after a long time away is remembered, a short break is not', () => {
  const short = memoriesFrom([on('2026-01-01'), on('2026-01-10')]);
  assert.ok(!kinds(short).includes('came_back'));
  const long = memoriesFrom([on('2026-01-01'), on('2026-01-20')]);
  const m = long.find((f) => f.kind === 'came_back')!;
  assert.equal(m.day, '2026-01-20');
  assert.equal(m.line, '19일 만에 돌아온 날');
});

test('a new best only counts once half a year has gone by', () => {
  const early = memoriesFrom([
    on('2026-01-01', [{ exercise: '벤치프레스', kg: 50 }]),
    on('2026-03-01', [{ exercise: '벤치프레스', kg: 70 }]),
  ]);
  assert.ok(!kinds(early).includes('best_after_half_year'));

  const late = memoriesFrom([
    on('2026-01-01', [{ exercise: '벤치프레스', kg: 50 }]),
    on('2026-08-01', [{ exercise: '벤치프레스', kg: 70 }]),
  ]);
  assert.equal(late.find((m) => m.kind === 'best_after_half_year')?.detail, '벤치프레스 70kg');
});

test('the first time an exercise is done is not a best', () => {
  const found = memoriesFrom([
    on('2026-01-01', [{ exercise: '벤치프레스', kg: 50 }]),
    on('2026-08-01', [{ exercise: '스쿼트', kg: 60 }]),
  ]);
  assert.ok(!kinds(found).includes('best_after_half_year'));
});

test('empty sessions are not remembered', () => {
  const found = memoriesFrom([on('2026-01-01', [{ exercise: '스쿼트', kg: 120 }], false)]);
  assert.deepEqual(found, []);
});

test('the order sessions arrive in does not matter', () => {
  const sessions = [...run('2026-01-01', 3), on('2026-02-01', [{ exercise: '스쿼트', kg: 100 }])];
  assert.deepEqual(memoriesFrom(sessions.slice().reverse()), memoriesFrom(sessions));
});

test('what is already written down is not written again', () => {
  const found = memoriesFrom(run('2026-01-01', 3));
  assert.deepEqual(kinds(unrecorded(found, ['first_day'])), ['three_in_a_row']);
});

test('a memory made today is said today', () => {
  const today = new Date(2026, 0, 3);
  const memories = memoriesFrom(run('2026-01-01', 3));
  assert.match(memoryLine(memories, today)!, /사흘/);
});

test('a memory is not said again the next day in the same words', () => {
  const memories = memoriesFrom(run('2026-01-01', 3));
  const fresh = memoryLine(memories, new Date(2026, 0, 3));
  for (let d = 4; d < 40; d++) {
    assert.notEqual(memoryLine(memories, new Date(2026, 0, d)), fresh);
  }
});

test('old memories come up now and then, not every day', () => {
  const memories = [eventMemory('first_garment', '리본', new Date(2026, 0, 1))];
  let said = 0;
  const days = 60;
  for (let d = 0; d < days; d++) {
    if (memoryLine(memories, new Date(2026, 1, 1 + d))) said++;
  }
  assert.ok(said > 0, 'never');
  assert.ok(said <= Math.ceil(days / RECALL_EVERY), `${said} times in ${days} days`);
});

test('nothing to remember is nothing to say', () => {
  for (let d = 1; d < 30; d++) assert.equal(memoryLine([], new Date(2026, 0, d)), null);
});

test('a first dress comes back with the right particle', () => {
  const memories = [eventMemory('first_garment', '리본', new Date(2026, 0, 1))];
  const lines = new Set<string>();
  for (let d = 0; d < 60; d++) {
    const l = memoryLine(memories, new Date(2026, 1, 1 + d));
    if (l) lines.add(l);
  }
  assert.ok([...lines].some((l) => l.includes('리본이에요')), [...lines].join(' / '));
});

test('she places a memory the way a person would', () => {
  const today = new Date(2026, 8, 23);
  assert.equal(whenItWas('2026-09-15', today), '얼마 전에');
  assert.equal(whenItWas('2026-08-20', today), '지난달에');
  assert.equal(whenItWas('2026-06-23', today), '석 달 전에');
  assert.equal(whenItWas('2025-09-25', today), '작년 이맘때');
  assert.equal(whenItWas('2024-01-01', today), '오래전에');
});
