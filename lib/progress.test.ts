import assert from 'node:assert/strict';
import test from 'node:test';
import { COLLAPSE, EARNING, MIN_SETS, RIR_CHOICES, applyLabel, earned, progressWord, readiness } from './progress.ts';
import { nextWeight, PLATE_THRESHOLD } from './weight.ts';

const set = (weight_kg: number, reps: number) => ({ weight_kg, reps });

test('holding the last set against the first earns a step up', () => {
  const read = readiness([set(60, 10), set(60, 10), set(60, 10)])!;
  assert.equal(read.verdict, 'add');
  assert.equal(read.weight, nextWeight(60, 1));
  assert.ok(read.weight > 60);
});

test('beating the first set also earns it', () => {
  assert.equal(readiness([set(60, 8), set(60, 10)])!.verdict, 'add');
});

test('fading a little means the weight was right', () => {
  const read = readiness([set(60, 10), set(60, 9), set(60, 8)])!;
  assert.equal(read.verdict, 'hold');
  assert.equal(read.weight, 60);
});

test('collapsing means it was too much', () => {
  const read = readiness([set(60, 10), set(60, 8), set(60, 4)])!;
  assert.equal(read.verdict, 'ease');
  assert.ok(read.weight < 60);
  assert.equal(read.weight, nextWeight(60, -1));
});

test('the boundary of a collapse is where it is documented', () => {
  const first = 10;
  const justAbove = Math.ceil(first * COLLAPSE);
  assert.equal(readiness([set(60, first), set(60, justAbove)])!.verdict, 'hold');
  assert.equal(readiness([set(60, first), set(60, justAbove - 1)])!.verdict, 'ease');
});

test('the working weight is the heaviest set, not a back-off after it', () => {
  // 80 × 5 twice, then a light 40 × 12 to finish: the session was about the 80,
  // and the twelve reps at 40 say nothing about how the 80 went.
  const read = readiness([set(80, 5), set(80, 5), set(40, 12)])!;
  assert.equal(read.from, 80);
  assert.equal(read.verdict, 'add');
  assert.equal(readiness([set(80, 5), set(80, 2), set(40, 12)])!.verdict, 'ease');
});

test('reps at different weights are not read against each other', () => {
  // The session that sent someone lifting 10kg to 22.5: one set at 20, and
  // 「held up」 only because fifteen is more than the ten done with 1kg.
  assert.equal(readiness([set(1, 10), set(10, 10), set(10, 15), set(20, 15)]), null);
  // A pyramid has one top set, and one set is not a shape.
  assert.equal(readiness([set(40, 12), set(50, 10), set(60, 6)]), null);
  assert.equal(readiness([set(80, 5), set(40, 12)]), null);
});

test('one set says nothing, and neither does none', () => {
  assert.equal(readiness([set(60, 10)]), null);
  assert.equal(readiness([]), null);
  assert.ok(MIN_SETS >= 2);
});

test('nothing is suggested for work that has no weight', () => {
  // Planks and running come through here too; there is no next plate for one.
  assert.equal(readiness([set(0, 0), set(0, 0), set(0, 0)]), null);
  assert.equal(readiness([set(0, 30), set(0, 30)]), null);
});

test('every suggested weight is one the rack can make', () => {
  for (const weight of [5, 10, 17, 20, 22.5, 47.5, 100]) {
    for (const reps of [[10, 10], [10, 3]]) {
      const read = readiness([set(weight, reps[0]), set(weight, reps[1])]);
      if (!read) continue;
      const step = read.weight >= PLATE_THRESHOLD ? 2.5 : 1;
      assert.ok(
        Math.abs(read.weight / step - Math.round(read.weight / step)) < 1e-9,
        `${read.weight}kg is not a real weight`
      );
    }
  }
});

test('easing never falls below zero', () => {
  const read = readiness([set(1, 10), set(1, 2)])!;
  assert.ok(read.weight >= 0);
});

test('holding is said silently, because it is what already happens', () => {
  assert.equal(progressWord(readiness([set(60, 10), set(60, 9)])), null);
  assert.equal(progressWord(null), null);
});

test('going up and coming down both get a sentence, and they differ', () => {
  const up = progressWord(readiness([set(60, 10), set(60, 10)]))!;
  const down = progressWord(readiness([set(60, 10), set(60, 3)]))!;
  assert.ok(up.length > 0 && down.length > 0);
  assert.notEqual(up, down);
  assert.ok(up.includes(`${nextWeight(60, 1)}kg`));
  assert.ok(down.includes(`${nextWeight(60, -1)}kg`));
});

test('nothing is said when the suggestion is the weight already on the bar', () => {
  // Easing from the lightest dumbbell there is has nowhere to go.
  const read = readiness([set(1, 10), set(1, 1)])!;
  if (read.weight === read.from) assert.equal(progressWord(read), null);
});

test('the button says the weight it will set', () => {
  const read = readiness([set(60, 10), set(60, 10)])!;
  assert.ok(applyLabel(read).startsWith(String(read.weight)));
});

test('what they said outranks what the reps imply', () => {
  // The reps collapsed, which on its own reads as too heavy — but they say
  // there were three more in the tank, so it was a distracted set, not a hard
  // one. Only the person in the room knows that.
  const easy = readiness([
    { weight_kg: 60, reps: 10 },
    { weight_kg: 60, reps: 4, rir: 4 },
  ]);
  assert.equal(easy?.verdict, 'add');

  // And the other way: the reps held up, which reads as room to spare, but
  // they had nothing left.
  const spent = readiness([
    { weight_kg: 60, reps: 8 },
    { weight_kg: 60, reps: 8, rir: 0 },
  ]);
  assert.equal(spent?.verdict, 'hold');
});

test('being spent only means too heavy when the reps fell away too', () => {
  const held = readiness([
    { weight_kg: 60, reps: 10 },
    { weight_kg: 60, reps: 8, rir: 0 },
  ]);
  assert.equal(held?.verdict, 'hold');

  const collapsed = readiness([
    { weight_kg: 60, reps: 10 },
    { weight_kg: 60, reps: 3, rir: 0 },
  ]);
  assert.equal(collapsed?.verdict, 'ease');
});

test('a set nobody was asked about still reads the old way', () => {
  const unasked = readiness([
    { weight_kg: 60, reps: 10 },
    { weight_kg: 60, reps: 10 },
  ]);
  assert.equal(unasked?.verdict, 'add');
  // null is "not asked", same as absent — not "zero reps left".
  const nulled = readiness([
    { weight_kg: 60, reps: 10 },
    { weight_kg: 60, reps: 10, rir: null },
  ]);
  assert.equal(nulled?.verdict, 'add');
});

test('she speaks differently to someone who answered her', () => {
  const said = readiness([
    { weight_kg: 60, reps: 10 },
    { weight_kg: 60, reps: 10, rir: 4 },
  ]);
  // 「보였어요」 to someone who told you themselves reads as not listening.
  assert.match(progressWord(said, true)!, /여유가 있으셨다니/);
  assert.match(progressWord(said, false)!, /버티셨어요/);
});

test('every offered answer is one the reading understands', () => {
  for (const choice of RIR_CHOICES) {
    const out = readiness([
      { weight_kg: 60, reps: 10 },
      { weight_kg: 60, reps: 9, rir: choice.rir },
    ]);
    assert.ok(out, choice.label);
  }
});

test('a warm-up does not make the working sets look like a collapse', () => {
  // Fifteen easy reps in front of three hard sixes. Read together, the last
  // set looks like it fell apart, and she tells someone who was never
  // struggling to take weight off.
  const withWarmup = readiness([
    { weight_kg: 20, reps: 15, warmup: true },
    { weight_kg: 60, reps: 6 },
    { weight_kg: 60, reps: 6 },
  ]);
  assert.equal(withWarmup?.verdict, 'add');
  assert.equal(withWarmup?.from, 60);

  const asItWas = readiness([
    { weight_kg: 20, reps: 15 },
    { weight_kg: 60, reps: 6 },
    { weight_kg: 60, reps: 6 },
  ]);
  // Unmarked, the same light set used to read as the opening set and turn two
  // steady sixes into a collapse. Sets are now read only against others at the
  // same weight, so forgetting to mark the warm-up no longer costs anything.
  assert.equal(asItWas?.verdict, 'add');
});

test('warm-ups alone leave nothing to read', () => {
  assert.equal(
    readiness([
      { weight_kg: 20, reps: 15, warmup: true },
      { weight_kg: 30, reps: 12, warmup: true },
    ]),
    null
  );
});

test('two arms are not read as one falling off', () => {
  // Left opens at 10 and holds; right opens at 10 and holds. Read together
  // the sequence looks like 10, 10, 10, 10 — fine — but change the reps and
  // the interleaving lies. Here the right arm is simply weaker, and that is
  // the balance line's job, not this one's.
  const alternating = readiness([
    { weight_kg: 20, reps: 10, side: 'L' },
    { weight_kg: 20, reps: 6, side: 'R' },
    { weight_kg: 20, reps: 10, side: 'L' },
    { weight_kg: 20, reps: 6, side: 'R' },
  ]);
  // Both arms held their reps, so there is room to add.
  assert.equal(alternating?.verdict, 'add');
});

test('a session abandoned partway is read off the arm that finished', () => {
  const stopped = readiness([
    { weight_kg: 20, reps: 10, side: 'L' },
    { weight_kg: 20, reps: 10, side: 'R' },
    { weight_kg: 20, reps: 10, side: 'L' },
  ]);
  assert.equal(stopped?.verdict, 'add');
});

test('more weight is earned over a month at the weight, not in one good session', () => {
  const steady = [set(10, 12), set(10, 12), set(10, 12)];
  const on = (date: string, sets = steady) => ({ date: `${date}T19:00:00`, sets });
  const now = new Date('2026-10-06T19:00:00');

  // One good session, or a good fortnight, says nothing.
  assert.equal(earned([on('2026-10-04')], now)!.verdict, 'hold');
  assert.equal(
    earned([on('2026-09-24'), on('2026-09-27'), on('2026-10-01'), on('2026-10-04')], now)!.verdict,
    'hold',
  );
  // A month ago, but only three visits since: not 「꾸준히」.
  assert.equal(earned([on('2026-09-01'), on('2026-09-20'), on('2026-10-04')], now)!.verdict, 'hold');

  // A month at 10kg, once a week, every session held to the last set.
  const month = [on('2026-09-06'), on('2026-09-13'), on('2026-09-20'), on('2026-09-27'), on('2026-10-04')];
  const up = earned(month, now)!;
  assert.equal(up.verdict, 'add');
  assert.equal(up.from, 10);
  assert.match(progressWord(up)!, /한 달 넘게 10kg/);

  // The month is counted at this weight: going up three weeks ago starts it again.
  const lighter = [set(9, 12), set(9, 12), set(9, 12)];
  assert.equal(
    earned([on('2026-08-30', lighter), on('2026-09-06', lighter), ...month.slice(2)], now)!.verdict,
    'hold',
  );
  // One of the last three fell away: not yet.
  const fell = [set(10, 12), set(10, 10), set(10, 8)];
  assert.equal(earned([...month.slice(0, 3), on('2026-09-27', fell), on('2026-10-04')], now)!.verdict, 'hold');
});

test('coming down is not made to wait a month', () => {
  const collapsed = [set(60, 10), set(60, 8), set(60, 4)];
  const read = earned([{ date: '2026-10-04T19:00:00', sets: collapsed }], new Date('2026-10-06T19:00:00'))!;
  assert.equal(read.verdict, 'ease');
  assert.equal(earned([], new Date()), null);
});

test('a small step is earned sooner than a big one', () => {
  const at = (kg: number) => [set(kg, 10), set(kg, 10), set(kg, 10)];
  const on = (date: string, kg: number) => ({ date: `${date}T19:00:00`, sets: at(kg) });
  const now = new Date('2026-10-06T19:00:00');

  // 60 → 62.5 is four in a hundred: three sessions over a week.
  const squat = [on('2026-09-28', 60), on('2026-10-01', 60), on('2026-10-04', 60)];
  const up = earned(squat, now)!;
  assert.equal(up.verdict, 'add');
  assert.equal(up.weight, 62.5);
  assert.match(progressWord(up)!, /일주일 넘게 60kg/);
  // Three sessions in three days is not a week.
  assert.equal(earned([on('2026-10-02', 60), on('2026-10-03', 60), on('2026-10-04', 60)], now)!.verdict, 'hold');
  assert.equal(earned(squat.slice(1), now)!.verdict, 'hold');

  // 30 → 32.5 is eight in a hundred: four sessions over three weeks.
  const press = [on('2026-09-14', 30), on('2026-09-21', 30), on('2026-09-28', 30), on('2026-10-04', 30)];
  assert.match(progressWord(earned(press, now)!)!, /3주 넘게 30kg/);
  assert.equal(earned(press.map((s, i) => (i === 0 ? on('2026-09-18', 30) : s)), now)!.verdict, 'hold');

  // 10 → 11 is ten in a hundred, and 20 → 22.5 more: the month.
  const curl = [on('2026-09-14', 10), on('2026-09-21', 10), on('2026-09-28', 10), on('2026-10-04', 10)];
  assert.equal(earned(curl, now)!.verdict, 'hold');
  assert.equal(earned(curl.map((s) => ({ ...s, sets: at(20) })), now)!.verdict, 'hold');

  // The table only ever asks for more as the step grows.
  for (let i = 1; i < EARNING.length; i += 1) {
    assert.ok(EARNING[i].below > EARNING[i - 1].below);
    assert.ok(EARNING[i].days >= EARNING[i - 1].days);
    assert.ok(EARNING[i].sessions >= EARNING[i - 1].sessions);
  }
});
