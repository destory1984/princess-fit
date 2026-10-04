import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diaryFor, type DiaryInput } from './diary.ts';
import { giftMemory, type Memory } from './companion.ts';
import type { WorkoutFact } from './gamification.ts';

function fact(day: string, extra: Partial<WorkoutFact> = {}): WorkoutFact {
  return {
    id: day,
    started_at: `${day}T10:00:00`,
    groups: ['가슴'],
    doneSets: 10,
    volume: 2000,
    durationSec: 0,
    distanceKm: 0,
    ...extra,
  };
}

function input(today: WorkoutFact, extra: Partial<DiaryInput> = {}): DiaryInput {
  return { today, history: [], lifts: [], bestBefore: new Map(), memories: [], ...extra };
}

const GIRLS = ['geumhwa', 'dohwa', 'seora'];

test('an empty session has no entry', () => {
  assert.equal(diaryFor(input(fact('2026-09-23', { doneSets: 0, volume: 0 }))), null);
});

test('the three write the same day in three hands', () => {
  const i = input(fact('2026-09-23'));
  const written = GIRLS.map((g) => diaryFor(i, g));
  assert.equal(new Set(written).size, 3, written.join(' / '));
  for (const w of written) assert.match(w!, /가슴 10세트/);
});

test('the day of a memory is written as that memory', () => {
  const first: Memory = { kind: 'first_day', day: '2026-09-23', line: '', detail: null };
  assert.match(diaryFor(input(fact('2026-09-23'), { memories: [first] }), 'seora')!, /첫날/);
});

test('a new best is named, but a first try is not a best', () => {
  const today = fact('2026-09-23');
  const lifts = [{ exercise: '벤치프레스', kg: 62.5 }];
  const better = diaryFor(input(today, { lifts, bestBefore: new Map([['벤치프레스', 60]]) }), 'dohwa');
  assert.match(better!, /벤치프레스 62\.5kg! 최고 기록/);
  const first = diaryFor(input(today, { lifts }), 'dohwa');
  assert.doesNotMatch(first!, /최고/);
});

test('a gift that day is in it', () => {
  const bow = giftMemory('ribbon', '리본', new Date(2026, 8, 23));
  assert.match(diaryFor(input(fact('2026-09-23'), { memories: [bow] }), 'geumhwa')!, /리본을 받았다/);
});

test('a part left alone is noticed when it comes back', () => {
  const history = [fact('2026-09-01', { groups: ['하체'] }), fact('2026-09-20')];
  const today = fact('2026-09-23', { groups: ['하체'] });
  assert.match(diaryFor(input(today, { history }), 'seora')!, /하체, 22일 만에/);
});

test('three days running is written as a streak', () => {
  const history = [fact('2026-09-21'), fact('2026-09-22')];
  assert.match(diaryFor(input(fact('2026-09-23'), { history }), 'geumhwa')!, /3일째/);
});

test('later sessions are not read into an earlier entry', () => {
  const later = [fact('2026-09-24'), fact('2026-09-25')];
  assert.doesNotMatch(diaryFor(input(fact('2026-09-23'), { history: later }), 'geumhwa')!, /일째/);
});

test('cardio alone is written as minutes, not as zero sets', () => {
  const run = fact('2026-09-23', { groups: [], doneSets: 0, volume: 0, durationSec: 1800 });
  const w = diaryFor(input(run), 'seora')!;
  assert.match(w, /유산소 30분/);
  assert.doesNotMatch(w, /세트/);
});

test('she writes of 「그 사람」, never of a boyfriend, and never of what she saw', () => {
  const all: string[] = [];
  const firstDay: Memory = { kind: 'first_day', day: '2026-09-23', line: '', detail: null };
  for (const g of GIRLS) {
    all.push(diaryFor(input(fact('2026-09-23')), g)!, diaryFor(input(fact('2026-09-23'), { memories: [firstDay] }), g)!);
  }
  for (const line of all) assert.doesNotMatch(line, /오빠|남친|남자친구|자세|무릎|웃었/);
});

test('the session that ends a sulk says what she kept to herself', () => {
  const back = { reason: 'returned' as const, other: 'dohwa', away: 4 };
  const written = GIRLS.map((g) => diaryFor(input(fact('2026-09-23'), { sulk: back }), g)!);
  assert.equal(new Set(written).size, 3, written.join(' / '));
  for (const w of written) assert.match(w, /4일/);
  assert.match(written[0], /피아/);
  const fickle = diaryFor(input(fact('2026-09-23'), { sulk: { reason: 'fickle', other: null, away: 0 } }), 'dohwa')!;
  assert.match(fickle, /이번 주/);
});

test('a sulk gives way to a day worth remembering, and comes before a best', () => {
  const sulk = { reason: 'returned' as const, other: 'seora', away: 2 };
  const hundred: Memory = { kind: 'day_100', day: '2026-09-23', line: '', detail: null };
  assert.match(diaryFor(input(fact('2026-09-23'), { sulk, memories: [hundred] }), 'geumhwa')!, /백 번째/);
  const lifts = [{ exercise: '벤치프레스', kg: 62.5 }];
  const w = diaryFor(input(fact('2026-09-23'), { sulk, lifts, bestBefore: new Map([['벤치프레스', 60]]) }), 'geumhwa')!;
  assert.doesNotMatch(w, /최고 기록/);
});

test('sulking in the diary is jealous, never possessive, and still only what was recorded', () => {
  for (const g of GIRLS) {
    for (const sulk of [
      { reason: 'returned' as const, other: 'dohwa', away: 3 },
      { reason: 'fickle' as const, other: null, away: 0 },
    ]) {
      const w = diaryFor(input(fact('2026-09-23'), { sulk }), g)!;
      assert.doesNotMatch(w, /가지 마|나만|저만|오빠|남친|남자친구|자세|무릎|웃었|해요|습니다/, w);
    }
  }
});
