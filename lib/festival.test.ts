import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTESTS,
  RESOLVE_WITHIN_DAYS,
  defaultEntry,
  festivalDay,
  festivalIndex,
  festivalMemory,
  formOf,
  isFestival,
  judge,
  latestFestival,
  nextFestival,
  parseResult,
  prizeFor,
  rivalsOf,
  rumourOf,
  formDays,
  scoreOf,
  standingAt,
  unresolved,
  type ContestId,
  type Standing,
} from './festival.ts';
import { computeStats } from './character.ts';
import { EMPTY_CULTURE } from './lessons.ts';
import { newHousehold } from './economy.ts';
import { memoryLine } from './companion.ts';
import { VOICES, type VoiceId } from './voices.ts';
import type { WorkoutFact } from './gamification.ts';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

/** A session on a given day, sized like an ordinary hour in the gym. */
function session(day: Date, extra: Partial<WorkoutFact> = {}): WorkoutFact {
  const d = new Date(day);
  d.setHours(18, 0, 0, 0);
  return {
    id: d.toISOString(),
    started_at: d.toISOString(),
    groups: ['가슴', '등', '하체'],
    doneSets: 18,
    volume: 4000,
    durationSec: 600,
    distanceKm: 0,
    ...extra,
  };
}

/** Every `every` days from `from` for `days` days. */
function steady(from: Date, days: number, every: number) {
  const out: WorkoutFact[] = [];
  for (let i = 0; i < days; i += every) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    out.push(session(d));
  }
  return out;
}

const fed = { ...newHousehold(at(2026, 9, 1)), satiety: 100, attire: 100 };

// ---------------------------------------------------------------- calendar

test('the festival is the last Saturday of the month', () => {
  assert.equal(festivalDay(2026, 9), '2026-09-26');
  assert.equal(festivalDay(2026, 10), '2026-10-31');
  assert.equal(festivalDay(2026, 2), '2026-02-28');
  for (let m = 1; m <= 12; m++) {
    const day = new Date(`${festivalDay(2027, m)}T12:00:00`);
    assert.equal(day.getDay(), 6);
    const week = new Date(day);
    week.setDate(week.getDate() + 7);
    assert.notEqual(week.getMonth(), day.getMonth());
  }
});

test('the latest festival is the one already held, the next the one to come', () => {
  assert.equal(latestFestival(at(2026, 9, 30)).day, '2026-09-26');
  assert.equal(latestFestival(at(2026, 9, 26)).day, '2026-09-26');
  assert.equal(latestFestival(at(2026, 9, 25)).day, '2026-08-29');
  assert.equal(nextFestival(at(2026, 9, 30)).day, '2026-10-31');
  // On the day itself the festival is today, not a month away.
  assert.equal(nextFestival(at(2026, 10, 31)).day, '2026-10-31');
  assert.equal(latestFestival(at(2026, 1, 3)).day, '2025-12-27');
});

test('every month has a festival with its own name', () => {
  const names = new Set<string>();
  for (let m = 1; m <= 12; m++) names.add(latestFestival(new Date(`${festivalDay(2026, m)}T12:00:00`)).name);
  assert.equal(names.size, 12);
});

// ---------------------------------------------------------------- scoring

test('form is the last four weeks of training days, twelve being full', () => {
  const day = at(2026, 9, 26);
  const start = new Date(day);
  start.setDate(start.getDate() - 27);
  assert.equal(formOf(steady(start, 28, 2), day), 100);
  assert.equal(formOf(steady(start, 28, 4), day), 58);
  assert.equal(formOf([], day), 0);
  // Two sessions on one day are one day, and an empty session is none.
  const twice = [session(day), session(day, { id: 'b' }), session(at(2026, 9, 20), { doneSets: 0, durationSec: 0 })];
  assert.equal(formOf(twice, day), 8);
  // Training after the festival does not count towards it.
  assert.equal(formOf([session(at(2026, 9, 27))], day), 0);
});

test('each contest counts different things', () => {
  const base: Standing = {
    stats: { strength: 0, stamina: 0, vitality: 0, balance: 0, discipline: 0 },
    culture: EMPTY_CULTURE,
    attire: 0,
    form: 0,
    factor: 1,
  };
  const strong = { ...base, stats: { ...base.stats, strength: 100 }, form: 100 };
  const graceful = { ...base, culture: { grace: 100, learning: 0, charm: 100 } };
  const learned = { ...base, culture: { grace: 0, learning: 100, charm: 0 } };
  assert.ok(scoreOf('tournament', strong) > scoreOf('ball', strong));
  assert.ok(scoreOf('ball', graceful) > scoreOf('tournament', graceful));
  assert.ok(scoreOf('debate', learned) > scoreOf('ball', learned));
});

test('a perfect standing scores 100 in every contest, and nothing scores 0', () => {
  const full: Standing = {
    stats: { strength: 100, stamina: 100, vitality: 100, balance: 100, discipline: 100 },
    culture: { grace: 100, learning: 100, charm: 100 },
    attire: 100,
    form: 100,
    factor: 1,
  };
  for (const c of CONTESTS) assert.equal(scoreOf(c.id, full), 100, c.id);
  for (const c of CONTESTS) assert.equal(scoreOf(c.id, { ...full, stats: { ...full.stats, strength: 0, stamina: 0, vitality: 0, balance: 0, discipline: 0 }, culture: EMPTY_CULTURE, attire: 0, form: 0 }), 0);
});

test('letting her go hungry costs her at the festival too', () => {
  const s = standingAt([session(at(2026, 9, 20))], { house: fed, culture: EMPTY_CULTURE, wardrobe: [], worn: [] }, at(2026, 9, 26));
  const hungry = { ...s, factor: 0.7 };
  assert.ok(scoreOf('tournament', hungry) < scoreOf('tournament', s));
});

test('the standing is read as of the festival day, not today', () => {
  const facts = [session(at(2026, 9, 20)), ...steady(at(2026, 9, 27), 20, 1)];
  const s = standingAt(facts, { house: fed, culture: EMPTY_CULTURE, wardrobe: [], worn: [] }, at(2026, 9, 26));
  assert.deepEqual(s.stats, computeStats([facts[0]], at(2026, 9, 26)));
  assert.equal(s.form, 8);
});

// ---------------------------------------------------------------- rivals

test('the rivals get better each month, and stop short of perfect', () => {
  for (const c of CONTESTS) {
    const first = rivalsOf(c.id, 0, '2026-01');
    const year = rivalsOf(c.id, 12, '2027-01');
    const far = rivalsOf(c.id, 60, '2031-01');
    assert.equal(first.length, 3);
    for (let i = 0; i < 3; i++) {
      assert.ok(year[i].score > first[i].score, `${c.id} ${year[i].name}`);
      assert.ok(far[i].score < 100, `${c.id} ${far[i].name} ${far[i].score}`);
    }
    // No two rivals share a name, here or in another contest.
  }
  const names = CONTESTS.flatMap((c) => rivalsOf(c.id, 0, '2026-01').map((r) => r.name));
  assert.equal(new Set(names).size, names.length);
});

test('the rivals are the same for everyone on the same festival', () => {
  assert.deepEqual(rivalsOf('ball', 3, '2026-09'), rivalsOf('ball', 3, '2026-09'));
});

// ---------------------------------------------------------------- judging

function monthOf(sessionsEvery: number, festival = latestFestival(at(2026, 9, 30))) {
  const start = new Date(`${festival.day}T12:00:00`);
  start.setDate(start.getDate() - 27);
  return steady(start, 28, sessionsEvery);
}

function standingOf(facts: WorkoutFact[], culture = EMPTY_CULTURE, festivalDate = at(2026, 9, 26)) {
  return standingAt(facts, { house: fed, culture, wardrobe: [], worn: [] }, festivalDate);
}

test('a month of three sessions a week is enough to place at the first tournament', () => {
  const festival = latestFestival(at(2026, 9, 30));
  const facts = monthOf(2);
  const result = judge('tournament', standingOf(facts), festival, festivalIndex(facts, festival));
  assert.ok(result.place <= 2, JSON.stringify(result));
});

test('nobody wins a thing without having trained or studied for it', () => {
  // One heavy session fills most of the strength stat by itself, so the
  // tournament can still give a third place; form is what keeps it there.
  const festival = latestFestival(at(2026, 9, 30));
  const facts = [session(at(2026, 9, 1))];
  for (const c of CONTESTS) {
    const result = judge(c.id, standingOf(facts), festival, festivalIndex(facts, festival));
    assert.ok(result.place >= (c.id === 'tournament' ? 3 : 4), `${c.id} ${JSON.stringify(result.entries)}`);
  }
});

test('the festival is judged from the day after, so that day still counts', () => {
  const facts = [session(at(2026, 9, 1))];
  assert.equal(unresolved(facts, at(2026, 9, 26)), null);
  assert.equal(unresolved(facts, at(2026, 9, 27))?.day, '2026-09-26');
});

test('someone away for the whole month is not entered', () => {
  const facts = [session(at(2026, 8, 1))];
  assert.equal(unresolved(facts, at(2026, 9, 30)), null);
});

test('the ball cannot be won in the gym alone', () => {
  const festival = latestFestival(at(2026, 9, 30));
  const facts = monthOf(1);
  const result = judge('ball', standingOf(facts), festival, festivalIndex(facts, festival));
  assert.ok(result.place >= 3, JSON.stringify(result.entries));
});

test('a year in, only someone who kept at it and kept learning still wins', () => {
  const festival = latestFestival(at(2027, 9, 30));
  const start = new Date(2026, 8, 1);
  const year = steady(start, 395, 2);
  const index = festivalIndex(year, festival);
  assert.equal(index, 12);
  const schooled = { grace: 90, learning: 90, charm: 90 };
  const s = standingAt(year, { house: fed, culture: schooled, wardrobe: [], worn: [] }, new Date(`${festival.day}T12:00:00`));
  for (const c of CONTESTS) {
    assert.ok(judge(c.id, s, festival, index).place <= 2, c.id);
  }
  const unschooled = standingAt(year, { house: fed, culture: EMPTY_CULTURE, wardrobe: [], worn: [] }, new Date(`${festival.day}T12:00:00`));
  assert.equal(judge('ball', unschooled, festival, index).place, 4);
  assert.equal(judge('debate', unschooled, festival, index).place, 4);
});

test('the result is the same however many times it is judged', () => {
  const festival = latestFestival(at(2026, 9, 30));
  const facts = monthOf(2);
  const a = judge('tournament', standingOf(facts), festival, 0);
  const b = judge('tournament', standingOf(facts), festival, 0);
  assert.deepEqual(a, b);
});

test('the entries are listed best first, and she is among them once', () => {
  const festival = latestFestival(at(2026, 9, 30));
  const result = judge('debate', standingOf(monthOf(3)), festival, 2);
  assert.equal(result.entries.length, 4);
  assert.equal(result.entries.filter((e) => e.her).length, 1);
  for (let i = 1; i < 4; i++) assert.ok(result.entries[i - 1].score >= result.entries[i].score);
  assert.equal(result.entries.findIndex((e) => e.her) + 1, result.place);
});

test('the prize falls with the place, and taking part is still worth something', () => {
  assert.ok(prizeFor(1) > prizeFor(2));
  assert.ok(prizeFor(2) > prizeFor(3));
  assert.ok(prizeFor(3) > prizeFor(4));
  assert.ok(prizeFor(4) > 0);
});

test('a first place in a month is never more than two sessions of gold', () => {
  // The shop is priced against a year of training (shop.test.ts); a festival
  // that paid like a week of it would quietly pull that apart.
  assert.ok(prizeFor(1) <= 2 * 75);
});

test('she enters what she is best at unless told otherwise', () => {
  const s = standingOf(monthOf(2));
  assert.equal(defaultEntry(s), 'tournament');
  const schooled = standingOf([session(at(2026, 9, 1))], { grace: 80, learning: 10, charm: 80 });
  assert.equal(defaultEntry(schooled), 'ball');
});

// ---------------------------------------------------------------- which festivals count

test('festivals before the first workout are not hers', () => {
  const facts = [session(at(2026, 9, 28))];
  assert.equal(festivalIndex(facts, nextFestival(at(2026, 9, 30))), 0);
  assert.equal(unresolved(facts, at(2026, 9, 30)), null);
});

test('the festival just gone is judged when the app is next opened, but not a stale one', () => {
  const facts = [session(at(2026, 9, 1))];
  assert.equal(unresolved(facts, at(2026, 9, 30))?.day, '2026-09-26');
  const late = new Date(2026, 8, 26 + RESOLVE_WITHIN_DAYS + 1, 12);
  // A month-old festival would be judged on a month's worth of changes since.
  assert.equal(unresolved(facts, late), null);
});

test('counting festivals starts at the first one after the first workout', () => {
  const facts = [session(at(2026, 8, 1))];
  assert.equal(festivalIndex(facts, latestFestival(at(2026, 8, 30))), 0);
  assert.equal(festivalIndex(facts, latestFestival(at(2026, 9, 30))), 1);
});

// ---------------------------------------------------------------- memory

test('the result is kept as a memory that can be read back whole', () => {
  const festival = latestFestival(at(2026, 9, 30));
  const result = judge('tournament', standingOf(monthOf(2)), festival, 0);
  const m = festivalMemory(result);
  assert.ok(isFestival(m.kind));
  assert.equal(m.kind, 'festival:2026-09');
  assert.equal(m.day, '2026-09-26');
  assert.match(m.line, /수확제/);
  assert.match(m.line, /기사 대회/);
  assert.deepEqual(parseResult(m.detail), result);
  assert.equal(parseResult('not json'), null);
  assert.equal(parseResult(null), null);
});

test('she says the festival back in her own voice, and does not choke on it', () => {
  const festival = latestFestival(at(2026, 9, 30));
  const result = judge('tournament', standingOf(monthOf(2)), festival, 0);
  const m = festivalMemory(result);
  const ids = Object.keys(VOICES) as VoiceId[];
  const onTheDay = ids.map((id) => memoryLine([m], new Date(`${m.day}T20:00:00`), id));
  for (const l of onTheDay) assert.ok(l && l.length > 0);
  assert.equal(new Set(onTheDay).size, ids.length);
  // And weeks later, whenever an old memory comes round.
  for (let d = 0; d < 12; d++) {
    const later = new Date(2026, 10, d + 1, 12);
    for (const id of ids) memoryLine([m], later, id);
  }
});

test('every girl has every festival line', () => {
  const ids = Object.keys(VOICES) as VoiceId[];
  const contests = CONTESTS.map((c) => c.id) as ContestId[];
  for (const id of ids) {
    const f = VOICES[id].festival;
    for (const c of contests) {
      const name = CONTESTS.find((x) => x.id === c)!.name;
      for (const days of [0, 1, 3, 12]) assert.ok(f.ahead(name, days).length > 0);
      for (const place of [1, 2, 3, 4] as const) assert.ok(f.place[place](name, '브리엔').length > 0, `${id} ${place}`);
    }
    assert.ok(f.recall('지난달에', '기사 대회', 1).length > 0);
    assert.ok(f.recall('지난달에', '기사 대회', 3).length > 0);
  }
});

test('she never scolds a loss', () => {
  for (const v of Object.values(VOICES)) {
    const line = v.festival.place[4]('무도회', '이자벨');
    assert.doesNotMatch(line, /왜|실망|다음엔 꼭|하셨어야/, line);
  }
});

test('what is said about a rival is near her real level, but not the day itself', () => {
  for (const c of CONTESTS) {
    for (const index of [0, 5, 20]) {
      const said = rumourOf(c.id, index);
      const real = rivalsOf(c.id, index, '2026-09');
      said.forEach((r, i) => {
        assert.equal(r.name, real[i].name);
        assert.equal(r.about % 5, 0);
        assert.ok(Math.abs(r.about - real[i].score) <= 6, `${r.name} ${r.about} ${real[i].score}`);
      });
    }
  }
});

test('the form days are the days behind the form', () => {
  const day = at(2026, 9, 26);
  const start = new Date(day);
  start.setDate(start.getDate() - 27);
  assert.equal(formDays(steady(start, 28, 4), day), 7);
});
