import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAVOURS_OF, favourFor, favourMetBy, favoursMet, weekStart, type FavourKind } from './favour.ts';
import { VOICES, type VoiceId } from './voices.ts';
import type { WorkoutFact } from './gamification.ts';

const at = (y: number, m: number, d: number, h = 18) => new Date(y, m - 1, d, h);

function session(day: Date, extra: Partial<WorkoutFact> = {}): WorkoutFact {
  return {
    id: `${day.toISOString()}-${Math.random()}`,
    started_at: day.toISOString(),
    groups: ['가슴', '팔'],
    doneSets: 15,
    volume: 3000,
    durationSec: 0,
    distanceKm: 0,
    cardioSec: 0,
    ...extra,
  };
}

// 2026-09-28 is a Monday.
const monday = at(2026, 9, 28, 9);
const wednesday = at(2026, 9, 30, 9);

test('a week starts on Monday, as the weekly goal does', () => {
  assert.equal(weekStart(wednesday).getDate(), 28);
  assert.equal(weekStart(at(2026, 10, 4)).getDate(), 28);
  assert.equal(weekStart(at(2026, 10, 5)).getDate(), 5);
});

test('each girl asks for her own kind of thing', () => {
  const ids = Object.keys(VOICES) as VoiceId[];
  const history = [session(at(2026, 9, 1)), session(at(2026, 9, 15, 18))];
  const kinds = ids.map((id) => new Set(Array.from({ length: 6 }, (_, w) => {
    const d = new Date(wednesday);
    d.setDate(d.getDate() + 7 * w);
    return favourFor(id, history, d, 3).kind;
  })));
  for (let i = 0; i < ids.length; i++) {
    for (const k of kinds[i]) assert.ok(FAVOURS_OF[ids[i]].includes(k), `${ids[i]} asked ${k}`);
    // Over six weeks she asks for more than one thing.
    assert.ok(kinds[i].size > 1, ids[i]);
  }
});

test('the favour is the same all week, whatever is done during it', () => {
  const history = [session(at(2026, 9, 10)), session(at(2026, 9, 17))];
  const before = favourFor('dohwa', history, monday, 3);
  const during = favourFor('dohwa', [...history, session(at(2026, 9, 29)), session(at(2026, 9, 30))], at(2026, 10, 3), 3);
  assert.equal(during.kind, before.kind);
  assert.equal(during.target, before.target);
  assert.equal(during.group, before.group);
});

test('only this week counts towards it', () => {
  const lastWeek = [session(at(2026, 9, 26)), session(at(2026, 9, 27))];
  for (const girl of ['geumhwa', 'dohwa', 'seora']) {
    const f = favourFor(girl, lastWeek, wednesday, 3);
    assert.equal(f.done, false, `${girl} ${f.kind}`);
    assert.equal(f.now, 0, `${girl} ${f.kind}`);
  }
});

test('an empty session does nothing for a favour', () => {
  const empty = session(at(2026, 9, 29), { doneSets: 0, durationSec: 0 });
  for (const girl of ['geumhwa', 'dohwa', 'seora']) {
    assert.equal(favourFor(girl, [empty], wednesday, 3).now, 0);
  }
});

function forced(girl: string, kind: FavourKind, facts: WorkoutFact[], today = wednesday, goal = 3) {
  // Walk forward a week at a time until she asks for `kind`.
  for (let w = 0; w < 12; w++) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7 * w);
    const shifted = facts.map((f) => {
      const s = new Date(f.started_at);
      s.setDate(s.getDate() + 7 * w);
      return { ...f, started_at: s.toISOString() };
    });
    const f = favourFor(girl, shifted, d, goal);
    if (f.kind === kind) return f;
  }
  throw new Error(`${girl} never asked ${kind}`);
}

test('리나: twenty minutes of cardio, counted in minutes', () => {
  const f = forced('geumhwa', 'cardio', [session(at(2026, 9, 29), { durationSec: 900, cardioSec: 900 }), session(at(2026, 9, 30, 8), { durationSec: 400, cardioSec: 400 })]);
  assert.equal(f.target, 20);
  assert.equal(f.now, 21);
  assert.equal(f.done, true);
});

test('리나: one light session is enough, and a heavy one is not it', () => {
  const heavy = forced('geumhwa', 'light', [session(at(2026, 9, 29), { doneSets: 20 })]);
  assert.equal(heavy.done, false);
  const light = forced('geumhwa', 'light', [session(at(2026, 9, 29), { doneSets: 8 })]);
  assert.equal(light.done, true);
});

test('피아: one more day than last week, but never fewer than two or more than five', () => {
  const lastWeek = [at(2026, 9, 22), at(2026, 9, 24)].map((d) => session(d));
  const f = forced('dohwa', 'more_days', lastWeek, at(2026, 9, 28, 9));
  assert.equal(f.target, 3);
  const idle = forced('dohwa', 'more_days', [session(at(2026, 9, 1))], at(2026, 9, 28, 9));
  assert.equal(idle.target, 2);
  const busy = forced('dohwa', 'more_days', [21, 22, 23, 24, 25, 26].map((d) => session(at(2026, 9, d))), at(2026, 9, 28, 9));
  assert.equal(busy.target, 5);
});

test('피아: to beat the best session of the last month, not of all time', () => {
  const history = [
    session(at(2026, 7, 1), { volume: 9000 }),
    session(at(2026, 9, 10), { volume: 3150 }),
    session(at(2026, 9, 20), { volume: 2800 }),
  ];
  const f = forced('dohwa', 'best_session', history, at(2026, 9, 28, 9));
  assert.equal(f.target, 3200);
});

test('유키: the part left alone the longest', () => {
  const history = [
    session(at(2026, 9, 1), { groups: ['하체'] }),
    session(at(2026, 9, 10), { groups: ['가슴', '팔', '어깨', '복근'] }),
    session(at(2026, 9, 20), { groups: ['등'] }),
  ];
  const f = forced('seora', 'neglected', history, at(2026, 9, 28, 9));
  assert.equal(f.group, '하체');
});

test('유키: the weekly goal is the goal they set', () => {
  const f = forced('seora', 'goal', [session(at(2026, 9, 1))], at(2026, 9, 28, 9), 4);
  assert.equal(f.target, 4);
});

test('every girl says every favour she can ask, and thanks for it', () => {
  for (const [id, kinds] of Object.entries(FAVOURS_OF)) {
    const v = VOICES[id as VoiceId].favour;
    for (const k of kinds) {
      const ask = v.ask[k];
      assert.ok(ask, `${id} cannot ask ${k}`);
      assert.ok(ask('3', '하체').length > 0);
    }
    assert.ok(v.done.length > 0);
  }
});

test('a favour asked is never a reproach', () => {
  for (const [id, kinds] of Object.entries(FAVOURS_OF)) {
    for (const k of kinds) {
      const line = VOICES[id as VoiceId].favour.ask[k]!('3', '하체');
      assert.doesNotMatch(line, /왜|실망|안 하면|벌/, line);
    }
  }
});

test('favours met are counted per week between one festival and the next', () => {
  // Four weeks of Rina asking; every session is light and has cardio in it,
  // so whatever she asks, two sessions a week meets it.
  const facts: WorkoutFact[] = [];
  for (let w = 0; w < 5; w++) {
    for (const off of [0, 2]) {
      const d = at(2026, 9, 1 + w * 7 + off);
      facts.push(session(d, { doneSets: 8, durationSec: 1500, cardioSec: 1500 }));
    }
  }
  // From the August festival (29th) to September's (26th): the weeks of
  // 31 Aug, 7, 14 and 21 Sep.
  const met = favoursMet(facts, at(2026, 8, 29, 12), at(2026, 9, 26, 12), () => 'geumhwa', 3);
  assert.ok(met >= 3 && met <= 4, String(met));
  assert.equal(favoursMet([], at(2026, 8, 29, 12), at(2026, 9, 26, 12), () => 'geumhwa', 3), 0);
});

test('a week is judged by whoever was there that week', () => {
  const facts = [session(at(2026, 9, 22), { durationSec: 1500, cardioSec: 1500, doneSets: 8 }), session(at(2026, 9, 24), { durationSec: 1500, cardioSec: 1500, doneSets: 8 })];
  const asked: string[] = [];
  favoursMet(facts, at(2026, 8, 29, 12), at(2026, 9, 26, 12), (mondayIso) => {
    asked.push(mondayIso);
    return 'seora';
  }, 3);
  assert.equal(asked.length, 4);
});

test('the week just after a festival counts towards the next one', () => {
  // 28 Sep is the Monday after the September festival.
  const facts = [session(at(2026, 9, 29), { durationSec: 1500, cardioSec: 1500, doneSets: 8 }), session(at(2026, 10, 1), { durationSec: 1500, cardioSec: 1500, doneSets: 8 })];
  const weeks: string[] = [];
  favoursMet(facts, at(2026, 9, 26, 12), at(2026, 10, 31, 12), (iso) => {
    weeks.push(iso);
    return 'geumhwa';
  }, 3);
  // 28 Sep, 5, 12, 19 and 26 Oct.
  assert.equal(weeks.length, 5);
  assert.equal(weeks[0], weekStart(at(2026, 9, 28)).toISOString());
});

test('one session a week meets the favour: the one that took it over the line', () => {
  // Find a week 리나 asks for 「두 번」, then come three times in it.
  let start = new Date(monday);
  while (favourFor('geumhwa', [], start, 3).kind !== 'twice') start.setDate(start.getDate() + 7);
  const on = (offset: number) => {
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    return session(d);
  };
  const [first, second, third] = [on(0), on(2), on(4)];
  const facts = [first, second, third];
  assert.equal(favourMetBy('geumhwa', facts, first, 3), null, 'one day is not two');
  assert.equal(favourMetBy('geumhwa', facts, second, 3)?.kind, 'twice');
  assert.equal(favourMetBy('geumhwa', facts, third, 3), null, 'already met');
});

test('an empty session meets nothing', () => {
  let start = new Date(monday);
  while (favourFor('geumhwa', [], start, 3).kind !== 'twice') start.setDate(start.getDate() + 7);
  const later = new Date(start);
  later.setDate(later.getDate() + 2);
  const first = session(start);
  const empty = session(later, { doneSets: 0, volume: 0, groups: [] });
  assert.equal(favourMetBy('geumhwa', [first, empty], empty, 3), null);
});
