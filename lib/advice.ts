import { withParticle } from './exerciseCopy.ts';
import { voiceOf } from './voices.ts';
import { formatDuration, formatKm } from './format.ts';
import { isEmptyWorkout, type WorkoutFact } from './gamification.ts';
import type { Stats } from './character.ts';

/** One movement as it was actually done, and what it was last time. */
export type DoneExercise = {
  name: string;
  sets: number;
  /** Heaviest working set, and the reps at it. 0 for bodyweight or timed work. */
  topWeight: number;
  topReps: number;
  /** The same movement's heaviest set last time, if there was a last time. */
  lastTop: number | null;
  /** Seconds, for movements timed rather than counted. */
  seconds: number;
  /** Rest set for this movement, in seconds. */
  rest?: number;
};

/** The last time this same routine was done, movement by movement. */
export type PastSession = { date: string; done: DoneExercise[] };

export type AdviceContext = {
  /** The session just finished. */
  today: WorkoutFact;
  /**
   * What was done, movement by movement.
   *
   * The block used to hold four aggregate numbers and nothing else — no name,
   * no weight, no rep — and then asked for a coach's instruction. There was
   * nothing to build a sentence out of but the numbers, so that is what came
   * back: 「최근 평균을 넘어선 꾸준함 30을 잘 살렸습니다」. The app knew all of
   * this and was not sending it.
   */
  done?: DoneExercise[];
  /**
   * How long the session took, in minutes, or null when nobody recorded it —
   * a backdated entry, or one left open so long the number means nothing.
   */
  minutes?: number | null;
  /**
   * The last outing of the same routine.
   *
   * Different from the `lastTop` beside each movement, which looks for that
   * movement in any session. This is the whole board as it stood last time,
   * which is the only way to notice what is missing today — a movement
   * dropped leaves no trace in a comparison that only walks what was done.
   */
  previous?: PastSession | null;
  /**
   * What they said they were after, back at the start.
   *
   * A coach who does not know whether someone came to get stronger or to stop
   * being out of breath is guessing at every sentence. It was asked once, at
   * onboarding, and then never shown to the one thing being asked to advise.
   */
  plan?: { goal: string; place: string; perWeek: number } | null;
  /**
   * A month of finished sessions, newest first, one line each.
   *
   * The eight-session averages above say how much; this says what, and in
   * what order. A month is where 「요즘 하체를 안 하신다」 and 「3주째 같은
   * 무게」 live, and neither is visible in a single session or an average.
   */
  month?: { date: string; title: string; did: string }[];
  /** Earlier finished sessions, newest first. */
  history: WorkoutFact[];
  stats: Stats;
  streak: number;
};

function averageOf(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** The facts an adviser needs, in one short block. */
export function describeContext(c: AdviceContext) {
  const past = c.history.filter((w) => w.id !== c.today.id).slice(0, 8);
  const avgVolume = Math.round(averageOf(past.map((w) => w.volume)));
  const avgSets = Math.round(averageOf(past.map((w) => w.doneSets)));

  const lines = [
    `오늘 운동: ${c.today.groups.join(', ') || '부위 미상'}`,
    `오늘 세트 ${c.today.doneSets}개, 총 무게 ${Math.round(c.today.volume).toLocaleString()}kg`,
  ];
  if (c.today.cardioSec > 0) {
    lines.push(
      `오늘 유산소 ${formatDuration(c.today.cardioSec)}` +
        (c.today.distanceKm > 0 ? `, ${formatKm(c.today.distanceKm)}km` : '')
    );
  }
  /*
    Movement by movement, with last time's best beside it.

    This is the only part a coach can actually say anything about. 「벤치프레스
    60kg×8 (지난번 57.5kg)」 supports a real sentence; 「총 무게 1,167kg」
    supports arithmetic.
  */
  for (const e of c.done ?? []) {
    if (e.seconds > 0) {
      lines.push(`- ${e.name}: ${formatDuration(e.seconds)}`);
    } else if (e.topWeight > 0) {
      const before = e.lastTop ? ` (지난번 최고 ${e.lastTop}kg)` : ' (지난번 기록 없음)';
      const rest = e.rest ? `, 세트 사이 ${e.rest}초 쉼` : '';
      lines.push(
        `- ${e.name}: ${e.sets}세트, 최고 ${e.topWeight}kg×${e.topReps}회${rest}${before}`
      );
    } else {
      const rest = e.rest ? `, 세트 사이 ${e.rest}초 쉼` : '';
      lines.push(`- ${e.name}: ${e.sets}세트, 맨몸 ${e.topReps}회${rest}`);
    }
  }
  if (c.minutes) lines.push(`오늘 걸린 시간: ${c.minutes}분`);

  if (c.plan) {
    lines.push(
      `본인이 정한 계획: ${c.plan.goal}, ${c.plan.place}에서, 주 ${c.plan.perWeek}회`
    );
  }

  /*
    The same routine, last time.

    Listed in full rather than summarised, because the useful observation is
    often about what is not there — a movement that was on the board a week
    ago and is not on it today leaves no trace in any comparison that only
    walks through what was done.
  */
  if (c.previous && c.previous.done.length) {
    lines.push(`지난번 같은 루틴 (${c.previous.date}):`);
    for (const e of c.previous.done) {
      if (e.seconds > 0) lines.push(`- ${e.name}: ${formatDuration(e.seconds)}`);
      else if (e.topWeight > 0) lines.push(`- ${e.name}: ${e.sets}세트, 최고 ${e.topWeight}kg`);
      else lines.push(`- ${e.name}: ${e.sets}세트, 맨몸 ${e.topReps}회`);
    }
  }

  if (past.length) {
    lines.push(`최근 ${past.length}회 평균: 세트 ${avgSets}개, 총 무게 ${avgVolume.toLocaleString()}kg`);
    lines.push(`최근 쓴 부위: ${[...new Set(past.flatMap((w) => w.groups))].join(', ') || '없음'}`);
  } else {
    lines.push('이전 기록 없음 (첫 운동)');
  }
  // "연속 운동 4일" alone was read as four days of the same body part. Say
  // what it counts, and say what it does not.
  lines.push(`쉬지 않고 운동한 날: ${c.streak}일 (부위는 날마다 다를 수 있음)`);

  /*
    A month, one line per session.

    Compact on purpose. Thirteen sessions listed movement by movement would
    bury the two lines above it that describe today, and the questions a month
    answers — 「요즘 하체를 안 하신다」, 「3주째 같은 무게」 — need the shape of
    the whole stretch rather than its detail.
  */
  if (c.month && c.month.length) {
    lines.push('최근 한 달:');
    for (const s of c.month) lines.push(`- ${s.date} ${s.title}: ${s.did}`);
  }
  /*
    The stats are deliberately not here.

    They were, and every bad reply was built out of them — 「근력 75의 실력을
    잘 보여줬습니다」, then 「최근 평균을 넘어선 꾸준함 30을 잘 살렸습니다」,
    then 「활력 41을 높이는 데 집중하세요」. They are scores in a game about
    raising a girl, not measurements of a body, and 「활력 41을 높이라」 is not
    an instruction anyone can follow in a gym.

    Telling the model not to misuse them did not work. Not handing them over
    does: a number never given cannot be woven into a sentence, and the guard
    rejects the reply if one turns up anyway.

    They stay in `AdviceContext` because `localRuleAdvice` uses them properly
    — 「유산소가 적은 편이에요」 comes from a low stamina score and is true.
  */
  return lines.join('\n');
}

export function buildPrompt(c: AdviceContext, girl?: string) {
  return [
    // Her, not a coach: the card sits beside her portrait and says whose it is.
    voiceOf(girl).persona,
    '자세나 동작 모양은 기록에 없으니 말하지 마세요.',
    '아래 기록을 보고 세 문장 이내로 조언하세요.',
    '규칙: 칭찬 한 줄, 다음에 바꿀 점 한 줄. 진단이나 치료 이야기는 하지 마세요.',
    '아래 적힌 사실만 쓰세요. 적히지 않은 것은 추측하지 마세요.',
    // Said plainly because the failure was specific: it took 「세트 8개」 and
    // recommended 7, which is a number it made up to have something to say.
    '아래에 없는 숫자는 쓰지 마세요. 새로운 목표치를 지어내지 마세요.',
    // The stats are no longer handed over at all, so this asks for the one
    // thing the block cannot enforce: a sentence somebody can act on.
    '마지막 문장은 다음 운동에서 할 수 있는 한 가지 행동이어야 합니다.',
    '통증이나 부상 이야기가 있으면 병원에 가보라고만 하세요.',
    // A worked answer, because every other line here is a prohibition and
    // none of them says what a good reply looks like. Named movements and a
    // change you could make tomorrow — no aggregates, no scores.
    '',
    '좋은 답의 예:',
    // Deliberately without weights. The example lives in the prompt, not in
    // the facts, so any number it taught would be rejected by the guard the
    // moment the model copied it — and a model shown a number will copy it.
    '「벤치프레스가 지난번보다 올랐네요. 다음엔 바벨 컬도 한 세트 더 해보세요.」',
    '',
    describeContext(c),
  ].join('\n');
}

/**
 * Advice without a model: compares this session to recent ones and picks the
 * most useful thing to say. Also the fallback when no model is configured.
 */
export const EMPTY_ADVICE = voiceOf(undefined).advice.empty;

export function localRuleAdvice(c: AdviceContext, girl?: string): string {
  const say = voiceOf(girl).advice;
  // Comparing nothing with last week only produces 「많이 줄었네요」, which is
  // true and useless. What is worth saying is that the record is empty.
  if (isEmptyWorkout(c.today)) return say.empty;
  const past = c.history.filter((w) => w.id !== c.today.id).slice(0, 8);
  const praise = c.streak > 1 ? say.streak(c.streak) : say.today;

  if (past.length === 0) {
    // Nothing to compare against, so say what today actually was. "비교할 것이
    // 없어요" alone reads as an apology for having no opinion.
    const what = c.today.groups.length
      ? `${withParticle(c.today.groups.join(', '), '을/를')} ${c.today.doneSets}세트`
      : `${c.today.doneSets}세트`;
    // Without the praise: it opens 「오늘도 기록을 남겼네요」, and on the first
    // session there has ever been there is no 「도」.
    return say.firstTime(what);
  }

  const avgVolume = averageOf(past.map((w) => w.volume));
  const avgSets = averageOf(past.map((w) => w.doneSets));
  const recentGroups = new Set(past.slice(0, 3).flatMap((w) => w.groups));
  const untouched = ['가슴', '등', '어깨', '하체', '팔', '복근'].filter(
    (g) => !recentGroups.has(g) && !c.today.groups.includes(g)
  );

  if (c.today.volume > avgVolume * 1.3 && avgVolume > 0) return `${praise} ${say.heavy}`;
  if (c.today.doneSets < avgSets * 0.6 && avgSets > 0) return `${praise} ${say.short}`;
  if (untouched.length >= 3) return `${praise} ${say.untouched(untouched.slice(0, 2).join(', '))}`;
  if (c.stats.stamina < 30 && c.today.cardioSec === 0) return `${praise} ${say.cardio}`;
  return `${praise} ${say.steady}`;
}

/**
 * Every number the model is allowed to say.
 *
 * Read out of the facts it was given rather than listed by hand, so a new line
 * in `describeContext` widens this on its own and nobody has to remember to.
 * Commas are stripped: 「1,167」 is written that way in the block and may come
 * back either way.
 */
export function allowedNumbers(context: string): Set<string> {
  return new Set((context.replace(/,/g, '').match(/\d+/g) ?? []));
}

/**
 * Whether a reply stayed inside the facts.
 *
 * The prompt already says 「아래 적힌 사실만 쓰세요」, and saying it is not
 * enough. What came back one evening was:
 *
 *   「다음에는 최근 평균 대비 크게 늘어난 부하로 인해 세트 수를 8개로
 *    유지하기보다, 7개에 맞춰 안정감을 찾는 것을 목표로 해보세요.」
 *
 * The 8 was real. The 7 was not — it was the shape of a prescription with
 * nothing behind it, and dropping one set changes nothing anyway. A made-up
 * recommendation almost always arrives wearing a made-up number, which is
 * what makes this checkable at all.
 *
 * Every number, with no allowance for small ones.
 *
 * There was one at first — anything up to ten was taken for a turn of phrase
 * like 「10분만 걸어도」 rather than a target. It let through the very reply
 * this was written for, because the number it invented was 7. A threshold that
 * does not catch the case that prompted it is not a threshold, it is a hole.
 *
 * The cost is that a good line mentioning a number nobody recorded is thrown
 * away too. That is the right way to be wrong here: the rule-based advice has
 * something true to say about the same session, and losing a well-phrased
 * suggestion costs less than passing on an invented one.
 */
export function staysInTheFacts(reply: string, context: string): boolean {
  const allowed = allowedNumbers(context);
  const said = reply.replace(/,/g, '').match(/\d+/g) ?? [];
  return said.every((n) => allowed.has(n)) && !namesAStat(reply);
}

/** The game's scores, which a coach has no business naming. */
export const STAT_WORDS = ['근력', '지구력', '활력', '균형', '꾸준함'];

/**
 * Whether the reply talks about the game's stats.
 *
 * Checked as well as withheld, because these five words exist elsewhere in
 * the app's own vocabulary and a model that has seen them once will reach for
 * them again. Naming one is enough: every sentence that did was nonsense.
 */
export function namesAStat(reply: string) {
  return STAT_WORDS.some((word) => reply.includes(word));
}

type Provider = { url: string; model: string };

// Matches the local Ollama server already running on this machine. A phone
// cannot reach "localhost", so point EXPO_PUBLIC_ADVICE_URL at the PC's LAN IP
// when testing on a device.
const DEFAULT_URL = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'qwen3.8:27b';

function configuredProvider(): Provider {
  return {
    url: process.env.EXPO_PUBLIC_ADVICE_URL || DEFAULT_URL,
    model: process.env.EXPO_PUBLIC_ADVICE_MODEL || DEFAULT_MODEL,
  };
}

/**
 * Whether this build has a model server it can reach by itself.
 *
 * The default address is `localhost`, which is the developer's PC only while
 * developing. In the build people open from a link it is their own phone, where
 * nothing is listening: every finished workout and every workout started sent
 * a request the browser refused. So a shipped build has a direct server only
 * when one was named (`EXPO_PUBLIC_ADVICE_URL`); otherwise the relay is the
 * only way to a model, and when its worker is off the rules answer at once.
 */
export function hasDirectServer(dev: boolean, named = process.env.EXPO_PUBLIC_ADVICE_URL) {
  return dev || Boolean(named);
}

/** The direct hop for a build that has none: fails at once, so the rules answer. */
export async function noDirectServer(): Promise<string> {
  throw new Error('곧장 닿는 모델 서버 없음');
}

// A large model can take minutes to load from cold, so the UI must not wait on it.
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * Loads the model into memory so it is ready later. Call this when a workout
 * starts; by the time it ends the request below answers in about a second.
 * Failures are ignored — the server is often deliberately off.
 */
export function warmUpAdvice() {
  const provider = configuredProvider();
  fetch(provider.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: provider.model, prompt: '.', stream: false, think: false, keep_alive: '30m' }),
  }).catch(() => {});
}

/**
 * Asks the configured model, falling back to the rule-based advice when none is
 * set up, the call fails, or it takes too long. Swapping providers means
 * changing this one function.
 *
 * `useModel` false answers from the rules without touching the network: for
 * someone with no model server, a 25-second wait for a call that was always
 * going to fail is the whole of what the model gives them.
 */
export async function requestAdvice(
  c: AdviceContext,
  signal?: AbortSignal,
  useModel = true,
  girl?: string
): Promise<{ text: string; source: 'model' | 'rules' }> {
  if (!useModel || isEmptyWorkout(c.today)) return { text: localRuleAdvice(c, girl), source: 'rules' };
  try {
    return { text: await askModel(buildPrompt(c, girl), describeContext(c), signal), source: 'model' };
  } catch {
    return { text: localRuleAdvice(c, girl), source: 'rules' };
  }
}

/**
 * One prompt to the configured model, and its reply — or a throw when the
 * call fails, times out, comes back empty, or says a number that is not in
 * `facts`. Every caller has rules to fall back on, so a throw is never shown.
 */
export async function askModel(
  prompt: string,
  facts: string,
  signal?: AbortSignal,
  kind = 'advice'
) {
  const text = (await transport(kind, prompt, signal)).trim();
  if (!text) throw new Error('빈 응답');
  // A reply that invented numbers invented the advice with them. The rules
  // have something true to say about the same facts, so use that instead
  // of passing on a target nobody can stand behind.
  //
  // Checked here, on the phone, whichever way the reply came: straight from
  // Ollama, or through the relay from Ollama or the ChatGPT CLI. A check that
  // lived with one of them would not cover the others.
  if (!staysInTheFacts(text, facts)) throw new Error('사실 밖의 숫자');
  return text;
}

/**
 * How a prompt reaches a model. `kind` says what was asked (advice, body) and
 * is only for telling the lines apart in the relay's log.
 */
export type ModelTransport = (kind: string, prompt: string, signal?: AbortSignal) => Promise<string>;

/*
  Set once at start-up by the app (`app/_layout.tsx`) to go through the relay.
  It is a setting rather than an import because the relay needs the database
  client, and this file is tested with node and nothing else — importing the
  client here would end that.
*/
let transport: ModelTransport = askDirect;

export function setModelTransport(next: ModelTransport) {
  transport = next;
}

/**
 * Straight to an Ollama server this device can reach.
 *
 * What every request used before the relay, and still the way when the relay's
 * worker is not running: on the PC itself the model is one hop away and there
 * is nothing to gain by asking the database to carry the question.
 */
export async function askDirect(_kind: string, prompt: string, signal?: AbortSignal) {
  const provider = configuredProvider();
  // AbortSignal.any/timeout are not on every runtime this ships to.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    // Ollama's /api/generate shape; other local servers accept the same fields.
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.model,
        prompt,
        stream: false,
        think: false,
        keep_alive: '10m',
        options: { temperature: 0.4 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const body = (await res.json()) as { response?: string };
    return body.response ?? '';
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
