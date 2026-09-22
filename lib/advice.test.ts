import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedNumbers,
  buildPrompt,
  describeContext,
  EMPTY_ADVICE,
  localRuleAdvice,
  requestAdvice,
  STAT_WORDS,
  staysInTheFacts,
  type AdviceContext,
} from './advice.ts';
import type { WorkoutFact } from './gamification.ts';
import type { Stats } from './character.ts';

function fact(partial: Partial<WorkoutFact> & { id: string }): WorkoutFact {
  return {
    started_at: '2026-09-20T10:00:00',
    groups: ['가슴'],
    doneSets: 12,
    volume: 3000,
    durationSec: 0,
    distanceKm: 0,
    ...partial,
  };
}

const stats: Stats = {
  strength: 50,
  stamina: 50,
  vitality: 50,
  balance: 50,
  discipline: 50,
};

function ctx(partial: Partial<AdviceContext> & { today: WorkoutFact }): AdviceContext {
  return { history: [], stats, streak: 1, ...partial };
}

test('the context block states today, the recent average and the streak', () => {
  const text = describeContext(
    ctx({
      today: fact({ id: 'a', doneSets: 10, volume: 2000 }),
      history: [fact({ id: 'b', doneSets: 20, volume: 4000, groups: ['등'] })],
      streak: 3,
    })
  );
  assert.match(text, /오늘 세트 10개/);
  assert.match(text, /최근 1회 평균: 세트 20개/);
  assert.match(text, /쉬지 않고 운동한 날: 3일/);
});

test('the context block says so when there is no history to compare', () => {
  assert.match(describeContext(ctx({ today: fact({ id: 'a' }) })), /첫 운동/);
});

test('today is never counted as its own history', () => {
  const today = fact({ id: 'a', volume: 1000 });
  const text = describeContext(ctx({ today, history: [today] }));
  assert.match(text, /첫 운동/);
});

test('the prompt carries the rules and the facts', () => {
  const p = buildPrompt(ctx({ today: fact({ id: 'a' }) }));
  assert.match(p, /세 문장 이내/);
  assert.match(p, /진단이나 치료 이야기는 하지 마세요/);
  assert.match(p, /오늘 운동/);
});

test('rule advice flags an unusually heavy day', () => {
  const advice = localRuleAdvice(
    ctx({
      today: fact({ id: 'a', volume: 9000 }),
      history: [fact({ id: 'b', volume: 3000 }), fact({ id: 'c', volume: 3000 })],
    })
  );
  assert.match(advice, /많이 들었어요/);
});

test('rule advice flags neglected body parts with the right particle', () => {
  const advice = localRuleAdvice(
    ctx({
      today: fact({ id: 'a', groups: ['가슴'] }),
      history: [fact({ id: 'b', groups: ['가슴'] }), fact({ id: 'c', groups: ['가슴'] })],
    })
  );
  // The particle follows the last word in the list, not the first.
  assert.match(advice, /등, 어깨를 쓰지 않았어요/);
  assert.doesNotMatch(advice, /어깨을/);
});


test('a first workout is told what it was, not that there is nothing to say', () => {
  const advice = localRuleAdvice(
    ctx({ today: fact({ id: 'a', groups: ['가슴', '팔'], doneSets: 12 }) })
  );
  assert.match(advice, /가슴, 팔을 12세트/);
  assert.doesNotMatch(advice, /비교할 것이 없어요/);
});


const NEWLINE = String.fromCharCode(10);

const FACTS = [
  '오늘 운동: 팔',
  '오늘 세트 8개, 총 무게 1,167kg',
  '최근 8회 평균: 세트 9개, 총 무게 980kg',
  '능력치 — 근력 75, 지구력 20, 활력 41, 균형 50, 꾸준함 30',
].join('\n');

test('the numbers in the facts are the numbers allowed', () => {
  const allowed = allowedNumbers(FACTS);
  assert.ok(allowed.has('8'));
  assert.ok(allowed.has('75'));
  // Written with a comma in the block and may come back either way.
  assert.ok(allowed.has('1167'));
  assert.ok(!allowed.has('7'));
});

test('the reply that started this is rejected', () => {
  // The 8 was real. The 7 was the shape of a prescription with nothing behind
  // it — and dropping one set changes nothing anyway.
  const invented =
    '오늘 총 무게 1,167kg을 기록했습니다. 다음에는 세트 수를 8개로 유지하기보다 7개에 맞춰 안정감을 찾아보세요.';
  assert.ok(!staysInTheFacts(invented, FACTS));
});

test('a reply that only repeats the facts is kept', () => {
  const grounded = '오늘 8세트, 1,167kg 드셨어요. 최근 평균 980kg보다 많으니 하루는 쉬어 주세요.';
  assert.ok(staysInTheFacts(grounded, FACTS));
});

test('no number is small enough to be waved through', () => {
  // An allowance for anything under ten was tried first, and it let through
  // the exact reply this was written for: the number invented was 7. The cost
  // of dropping it is that a good line mentioning an unrecorded number goes
  // too — which is the right way to be wrong, since the rules still have
  // something true to say about the same session.
  assert.ok(!staysInTheFacts('운동 끝에 10분만 걸어도 지구력이 달라집니다.', FACTS));
  assert.ok(!staysInTheFacts('다음엔 12세트를 목표로 해보세요.', FACTS));
});

test('a reply with no numbers at all is fine', () => {
  assert.ok(staysInTheFacts('꾸준히 이어오고 계세요. 다음엔 조금만 가볍게 가보세요.', FACTS));
  assert.ok(staysInTheFacts('', FACTS));
});

test('the model never sees the scores from the game', () => {
  // Every bad reply was built out of them. A number never given cannot be
  // woven into a sentence.
  const said = describeContext(ctx({ today: fact({ id: 'w' }) }));
  for (const word of STAT_WORDS) assert.ok(!said.includes(word), word);
  assert.match(buildPrompt(ctx({ today: fact({ id: 'w' }) })), /없는 숫자는 쓰지 마세요/);
});

test('a reply that names a score is thrown away even when the numbers check out', () => {
  // 오늘 8세트와 1,167kg으로 최근 평균을 넘어선 꾸준함 30을 잘 살렸습니다.
  // Every number in that was real, and the sentence still means nothing —
  // 「활력 41을 높이라」 is not an instruction anyone can follow in a gym.
  const facts = FACTS + NEWLINE + '꾸준함 30';
  assert.ok(!staysInTheFacts('최근 평균을 넘어선 꾸준함 30을 잘 살렸습니다.', facts));
  assert.ok(!staysInTheFacts('활력을 높이는 데 집중하세요.', facts));
  assert.ok(staysInTheFacts('오늘 8세트 하셨어요. 다음엔 하루 쉬어 주세요.', facts));
});

test('the movements reach the model, with last time beside them', () => {
  // The block used to be four aggregate numbers, so number soup was the only
  // sentence available. 「벤치프레스 60kg×8 (지난번 57.5kg)」 supports advice;
  // 「총 무게 1,167kg」 supports arithmetic.
  const said = describeContext(
    ctx({
      today: fact({ id: 'w' }),
      done: [
        { name: '벤치프레스', sets: 4, topWeight: 60, topReps: 8, lastTop: 57.5, seconds: 0 },
        { name: '풀업', sets: 3, topWeight: 0, topReps: 9, lastTop: null, seconds: 0 },
        { name: '러닝', sets: 1, topWeight: 0, topReps: 0, lastTop: null, seconds: 1_800 },
      ],
    })
  );
  assert.match(said, /벤치프레스: 4세트, 최고 60kg×8회 \(지난번 최고 57.5kg\)/);
  // Bodyweight is counted in reps, and a first outing says so rather than
  // pretending there was a number to beat.
  assert.match(said, /풀업: 3세트, 맨몸 9회/);
  assert.match(said, /러닝: 30분/);
});

test('the worked example teaches no number', () => {
  // It sits in the prompt, not the facts, so any number in it would be
  // rejected the moment the model copied it — and a model shown one copies it.
  const said = buildPrompt(ctx({ today: fact({ id: 'w' }) }));
  const example = said.split('좋은 답의 예:')[1].split('오늘 운동')[0];
  assert.ok(!/\d/.test(example), example);
});

test('rest, length and the last outing of the same routine all go', () => {
  const said = describeContext(
    ctx({
      today: fact({ id: 'w' }),
      minutes: 52,
      done: [
        { name: '벤치프레스', sets: 4, topWeight: 60, topReps: 8, lastTop: 57.5, seconds: 0, rest: 120 },
      ],
      previous: {
        date: '9월 18일',
        done: [
          { name: '벤치프레스', sets: 4, topWeight: 57.5, topReps: 8, lastTop: null, seconds: 0 },
          { name: '랫 풀다운', sets: 3, topWeight: 45, topReps: 10, lastTop: null, seconds: 0 },
        ],
      },
    })
  );
  assert.match(said, /세트 사이 120초 쉼/);
  assert.match(said, /오늘 걸린 시간: 52분/);
  assert.match(said, /지난번 같은 루틴 \(9월 18일\)/);
  // The whole point of listing the old board: a movement dropped today leaves
  // no trace in any comparison that only walks through what was done.
  assert.match(said, /랫 풀다운/);
});

test('a session with no length and no previous outing says neither', () => {
  const said = describeContext(
    ctx({ today: fact({ id: 'w' }), minutes: null, previous: null, done: [] })
  );
  assert.ok(!said.includes('걸린 시간'));
  assert.ok(!said.includes('지난번 같은 루틴'));
});

test('the plan they set at the start goes with it', () => {
  // A coach who does not know whether someone came to get stronger or to stop
  // being out of breath is guessing at every sentence.
  const said = describeContext(
    ctx({
      today: fact({ id: 'w' }),
      plan: { goal: '체중을 줄이고 싶어요', place: '집', perWeek: 4 },
    })
  );
  assert.match(said, /본인이 정한 계획: 체중을 줄이고 싶어요, 집에서, 주 4회/);
});

test('a month of sessions goes, one line each', () => {
  const said = describeContext(
    ctx({
      today: fact({ id: 'w' }),
      month: [
        { date: '9월 18일', title: '상체 날', did: '벤치프레스 60kg, 바벨 컬 20kg' },
        { date: '9월 16일', title: '하체 날', did: '스쿼트 80kg' },
      ],
    })
  );
  assert.match(said, /최근 한 달:/);
  assert.match(said, /- 9월 18일 상체 날: 벤치프레스 60kg, 바벨 컬 20kg/);
  // Compact on purpose: thirteen sessions listed set by set would bury the
  // two lines above them that describe today.
  assert.ok(said.split('\n').filter((l) => l.startsWith('- 9월')).length === 2);
});

test('no plan and no month means neither is mentioned', () => {
  const said = describeContext(ctx({ today: fact({ id: 'w' }), plan: null, month: [] }));
  assert.ok(!said.includes('본인이 정한 계획'));
  assert.ok(!said.includes('최근 한 달'));
});

test('with the model switched off, the rules answer and nothing is fetched', async () => {
  const real = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error('no network in this test');
  }) as typeof fetch;
  try {
    const c = ctx({ today: fact({ id: 'a' }) });
    const answer = await requestAdvice(c, undefined, false);
    assert.equal(answer.source, 'rules');
    assert.equal(answer.text, localRuleAdvice(c));
    assert.equal(called, false);
  } finally {
    globalThis.fetch = real;
  }
});

test('an empty session is told it is empty, and the model is not asked', async () => {
  const real = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error('no network in this test');
  }) as typeof fetch;
  try {
    const c = ctx({ today: fact({ id: 'a', doneSets: 0, volume: 0 }) });
    assert.equal(localRuleAdvice(c), EMPTY_ADVICE);
    const answer = await requestAdvice(c);
    assert.equal(answer.text, EMPTY_ADVICE);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = real;
  }
});
