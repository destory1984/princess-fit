import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headline, insightsFor, MIN_WORKOUTS } from './insight.ts';
import type { WorkoutFact } from './gamification.ts';

const TODAY = new Date(2026, 8, 20);

function on(daysAgo: number, over: Partial<WorkoutFact> = {}): WorkoutFact {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `w${daysAgo}-${over.groups?.join('') ?? ''}`,
    started_at: `${d.toISOString().slice(0, 10)}T10:00:00`,
    groups: ['가슴'],
    doneSets: 10,
    volume: 2000,
    durationSec: 0,
    distanceKm: 0,
    ...over,
  };
}

// One session from before the month, so the month-long findings may speak.
const LONG_AGO = on(45);

const ids = (list: { id: string }[]) => list.map((i) => i.id);

// Inventing a pattern from two workouts teaches people to ignore the app.
test('nothing is said until there is enough history to mean it', () => {
  const few = Array.from({ length: MIN_WORKOUTS - 1 }, (_, i) => on(i * 3));
  assert.deepEqual(insightsFor(few, TODAY), []);
  assert.equal(headline(few, TODAY), null);
});

test('a body part untouched for a month is named', () => {
  const chestOnly = [...[0, 3, 6, 9, 12].map((d) => on(d, { groups: ['가슴', '팔'] })), LONG_AGO];
  const found = insightsFor(chestOnly, TODAY);
  const neglected = found.find((i) => i.id === 'neglected');
  assert.ok(neglected, '등/어깨/하체/복근 중 무엇도 짚지 않았어요');
});

test('a month spent on one part is called out with its share', () => {
  const lopsided = Array.from({ length: 10 }, (_, i) => on(i * 2, { groups: ['가슴'] }));
  const found = insightsFor(lopsided, TODAY);
  const one = found.find((i) => i.id === 'lopsided');
  assert.ok(one);
  assert.match(one!.title, /가슴에 절반 넘게/);
});

test('training more than last month is noticed and counted', () => {
  const now = [0, 2, 4, 6, 8, 10].map((d) => on(d));
  const before = [35, 40].map((d) => on(d));
  const found = insightsFor([...now, ...before], TODAY);
  const more = found.find((i) => i.id === 'more-often');
  assert.ok(more);
  assert.equal(more!.tone, 'good');
  assert.match(more!.detail, /최근 30일 6회/);
});

test('no cardio at all says zero rather than a vague nudge', () => {
  const lifting = [...[0, 2, 4, 6].map((d) => on(d)), LONG_AGO];
  const cardio = insightsFor(lifting, TODAY).find((i) => i.id === 'cardio');
  assert.match(cardio!.detail, /0분/);
});

test('plenty of cardio draws no comment', () => {
  const runs = [0, 2, 4, 6].map((d) => on(d, { durationSec: 1_800, groups: ['유산소'] }));
  assert.ok(!ids(insightsFor(runs, TODAY)).includes('cardio'));
});

// The thing to change matters more than the thing going well.
test('the headline prefers what needs attention', () => {
  const lifting = [...[0, 1, 2, 3, 4].map((d) => on(d)), LONG_AGO];
  const first = headline(lifting, TODAY)!;
  assert.equal(first.tone, 'watch');
});

test('every finding says something specific enough to act on', () => {
  const mixed = [0, 1, 4, 7, 10, 13].map((d) => on(d, { groups: ['가슴', '등'] }));
  for (const i of insightsFor(mixed, TODAY)) {
    assert.ok(i.title.length > 4, i.id);
    assert.ok(i.detail.length > 8, i.id);
  }
});

test('the findings are the same for everyone, each said in her own way', () => {
  const lifting = [...Array.from({ length: 6 }, (_, i) => on(i * 2)), LONG_AGO];
  const by = (g: string) => insightsFor(lifting, TODAY, g);
  assert.deepEqual(by('dohwa').map((i) => i.id), by('geumhwa').map((i) => i.id));
  assert.notDeepEqual(by('seora').map((i) => i.title), by('geumhwa').map((i) => i.title));
});

// 「한 달에 여덟 번이 안 돼요」 to someone three weeks in, who came five times.
test('nothing is said about the month before there has been a month', () => {
  const newcomer = [0, 4, 8, 12, 16].map((d) => on(d, { groups: ['가슴'] }));
  const found = ids(insightsFor(newcomer, TODAY));
  for (const id of ['sparse', 'neglected', 'cardio']) assert.ok(!found.includes(id), id);
  assert.ok(ids(insightsFor([...newcomer, LONG_AGO], TODAY)).includes('sparse'));
});

// 유키 starts in 합쇼체 and eases into 해요체 once the two are comfortable
// (lib/voices.ts). The stats screen was the one place she never did.
const STIFF = /습니다|십시오/;
const yukiSays = (stage?: 'new' | 'familiar' | 'comfortable' | 'old') => {
  const history = [LONG_AGO, ...Array.from({ length: 6 }, (_, i) => on(i * 4))];
  const found = insightsFor(history, TODAY, 'seora', stage);
  assert.ok(found.length > 0, 'the history should give her something to say');
  return found.map((i) => `${i.title} ${i.detail}`).join(' ');
};

test('yuki is formal on the stats screen until the two are comfortable', () => {
  assert.match(yukiSays('new'), STIFF);
  assert.match(yukiSays('familiar'), STIFF);
  // Not knowing the stage is not a licence to be familiar.
  assert.match(yukiSays(undefined), STIFF);
});

test('once comfortable she eases there too', () => {
  assert.doesNotMatch(yukiSays('comfortable'), STIFF);
  assert.doesNotMatch(yukiSays('old'), STIFF);
});

test('easing changes how she says it, not what she finds', () => {
  const history = [LONG_AGO, ...Array.from({ length: 6 }, (_, i) => on(i * 4))];
  assert.deepEqual(
    ids(insightsFor(history, TODAY, 'seora', 'new')),
    ids(insightsFor(history, TODAY, 'seora', 'old'))
  );
});

test('the others speak the same at every stage', () => {
  const history = [LONG_AGO, ...Array.from({ length: 6 }, (_, i) => on(i * 4))];
  for (const girl of ['geumhwa', 'dohwa']) {
    assert.deepEqual(
      insightsFor(history, TODAY, girl, 'new'),
      insightsFor(history, TODAY, girl, 'old')
    );
  }
});
