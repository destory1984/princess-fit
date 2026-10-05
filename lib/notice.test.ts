import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noticeFor, type Seen } from './notice.ts';
import type { WorkoutFact } from './gamification.ts';
import type { Session } from './companion.ts';

const today = new Date(2026, 8, 23, 12); // a Wednesday

function fact(day: string, groups = ['가슴'], extra: Partial<WorkoutFact> = {}): WorkoutFact {
  return {
    id: day,
    started_at: `${day}T10:00:00`,
    groups,
    doneSets: 5,
    volume: 1000,
    durationSec: 0,
    distanceKm: 0,
    ...extra,
  };
}

function lifted(day: string, exercise: string, kg: number): Session {
  return { started_at: `${day}T10:00:00`, worked: true, lifts: [{ exercise, kg }] };
}

const say = (girl: string, seen: Seen, stage: 'new' | 'comfortable' = 'new') =>
  noticeFor(girl, seen, stage, today);

test('the three notice different things on the same day', () => {
  const seen: Seen = {
    facts: [fact('2026-09-10', ['하체']), fact('2026-09-21'), fact('2026-09-22')],
    sessions: [lifted('2026-09-21', '벤치프레스', 60), lifted('2026-09-22', '벤치프레스', 62.5)],
    sleep: [{ id: 's', slept_on: '2026-09-23', bed_minute: 2 * 60, wake_minute: 6 * 60 }],
    weeklyGoal: 3,
  };
  const said = ['geumhwa', 'dohwa', 'seora'].map((g) => say(g, seen));
  assert.match(said[0]!, /4시간/);
  assert.match(said[1]!, /62\.5kg, 최고 기록/);
  assert.match(said[2]!, /하체 안 한 지 13일/);
});

test('리나 tells you to rest after four days running', () => {
  const facts = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'].map((d) => fact(d));
  assert.match(say('geumhwa', { facts })!, /4일째.*쉬어도/);
});

test('리나 praises the rest day after a run of training', () => {
  const facts = [fact('2026-09-20'), fact('2026-09-21')];
  assert.match(say('geumhwa', { facts })!, /쉬는 것도 운동/);
});

test('리나 names what is still sore, on a day not yet trained', () => {
  const muscles = [{ slug: 'quads', label: '대퇴사두', recovery: 40, hoursSince: 20 }];
  assert.match(say('geumhwa', { facts: [fact('2026-09-15')], muscles })!, /대퇴사두는 아직 덜 풀렸어요/);
});

test('피아 challenges the last lift one plate up', () => {
  const sessions = [lifted('2026-09-10', '스쿼트', 80), lifted('2026-09-15', '스쿼트', 70)];
  assert.equal(
    say('dohwa', { facts: [fact('2026-09-15')], sessions }),
    '지난번 스쿼트 70kg이었죠? 오늘은 72.5kg 도전!'
  );
});

test('피아 counts the streak towards tomorrow', () => {
  const facts = [fact('2026-09-21'), fact('2026-09-22')];
  assert.match(say('dohwa', { facts })!, /2일 연속이에요! 오늘 오면 3일/);
});

test('피아 does not call a first try a record', () => {
  const sessions = [lifted('2026-09-22', '데드리프트', 100)];
  assert.doesNotMatch(say('dohwa', { facts: [fact('2026-09-15')], sessions }) ?? '', /최고 기록/);
});

test('유키 names the part left alone longest, and only one ever trained', () => {
  const facts = [fact('2026-09-01', ['등']), fact('2026-09-10', ['하체']), fact('2026-09-22', ['가슴'])];
  assert.equal(say('seora', { facts }), '등 안 한 지 22일입니다. 알고 계시죠?');
});

test('유키 warns about the weekly goal only when it is getting tight', () => {
  const facts = [fact('2026-09-21')];
  // Wednesday: one done, two owed, five days left — not yet.
  assert.equal(say('seora', { facts, weeklyGoal: 3 }), null);
  const saturday = new Date(2026, 8, 26, 12);
  assert.match(noticeFor('seora', { facts, weeklyGoal: 3 }, 'new', saturday)!, /이번 주 1번입니다/);
});

test('유키 thaws once you are comfortable with each other', () => {
  const facts = [fact('2026-09-01', ['등']), fact('2026-09-22', ['가슴'])];
  assert.match(say('seora', { facts }, 'comfortable')!, /이에요/);
});

test('nobody says anything about form', () => {
  const seen: Seen = {
    facts: [fact('2026-09-01', ['등']), fact('2026-09-22')],
    sessions: [lifted('2026-09-22', '스쿼트', 100)],
  };
  for (const g of ['geumhwa', 'dohwa', 'seora']) {
    assert.doesNotMatch(say(g, seen) ?? '', /자세|무릎|폼/);
  }
});

test('an empty session does not count towards a run of days', () => {
  const empty = (d: string) => fact(d, [], { doneSets: 0, volume: 0 });
  const facts = [empty('2026-09-20'), empty('2026-09-21'), empty('2026-09-22'), fact('2026-09-23')];
  assert.doesNotMatch(say('geumhwa', { facts }) ?? '', /4일째/);
  assert.doesNotMatch(say('dohwa', { facts }) ?? '', /연속/);
});

test('after today\'s session she does not call it last time', () => {
  // The day of the workout: 「지난번 60kg이었죠? 오늘은 62.5kg 도전!」 was said
  // an hour after the 60kg, with today's lifting already finished.
  const seen: Seen = { facts: [fact('2026-09-23')], sessions: [lifted('2026-09-23', '데드리프트', 60)] };
  const line = say('dohwa', seen)!;
  assert.match(line, /오늘 데드리프트 60kg 했죠\? 다음엔 62\.5kg 도전!/);
  assert.doesNotMatch(line, /지난번/);
});
