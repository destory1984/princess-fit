import { localDayKey } from './format.ts';
import { bestWeeklyCoverage, streakOf, type WorkoutFact } from './gamification.ts';

export type StatKey = 'strength' | 'stamina' | 'vitality' | 'balance' | 'discipline';

/**
 * `short` is for the status plaque, which has room for two syllables and not
 * three. It is spelled out rather than sliced from `name`: one character each
 * left 근/지/활/균/꾸 on screen, which reads as nothing at all.
 */
export const STAT_META: Record<
  StatKey,
  { name: string; short: string; hint: string; icon: string }
> = {
  strength: { name: '근력', short: '근력', hint: '한 번에 들어 올린 총량', icon: 'barbell' },
  stamina: { name: '지구력', short: '지구', hint: '유산소에 들인 시간과 거리', icon: 'walk' },
  vitality: { name: '활력', short: '활력', hint: '쌓아 올린 세트의 수', icon: 'pulse' },
  balance: { name: '균형', short: '균형', hint: '한 주에 고루 쓴 부위', icon: 'body' },
  discipline: { name: '꾸준함', short: '꾸준', hint: '거르지 않고 이어온 날', icon: 'flame' },
};

export const STAT_ORDER: StatKey[] = [
  'strength',
  'stamina',
  'vitality',
  'balance',
  'discipline',
];

/** Fast at first, slow near the cap — early effort should feel like progress. */
function curve(value: number, target: number) {
  if (value <= 0) return 0;
  return Math.min(100, Math.round((100 * Math.log1p(value)) / Math.log1p(target)));
}

/**
 * Slower than `curve`, for a value that is already large on the first day.
 *
 * Volume is counted in kilograms, so one modest session is a thousand of them
 * and the logarithm calls that three quarters of the way to the cap: two sets
 * on the first evening read 근력 74. The square root puts the same session at
 * 30 and leaves the rest of the year something to fill.
 */
function root(value: number, target: number) {
  if (value <= 0) return 0;
  return Math.min(100, Math.round(100 * Math.sqrt(value / target)));
}

export type Stats = Record<StatKey, number>;

export function computeStats(workouts: WorkoutFact[], today = new Date()): Stats {
  const heaviest = Math.max(0, ...workouts.map((w) => w.volume));
  const totalSets = workouts.reduce((s, w) => s + w.doneSets, 0);
  const cardioMin = workouts.reduce((s, w) => s + w.durationSec, 0) / 60;
  const km = workouts.reduce((s, w) => s + w.distanceKm, 0);
  const coverage = bestWeeklyCoverage(workouts);

  const since = new Date(today);
  since.setDate(since.getDate() - 56);
  const recentDays = new Set(
    workouts
      .filter((w) => new Date(w.started_at) >= since)
      .map((w) => localDayKey(new Date(w.started_at)))
  ).size;

  return {
    strength: root(heaviest, 12_000),
    stamina: curve(cardioMin + km * 6, 900),
    vitality: curve(totalSets, 900),
    balance: Math.round((Math.min(coverage, 6) / 6) * 100),
    discipline: Math.max(
      curve(recentDays, 40),
      Math.min(100, streakOf(workouts, today) * 8)
    ),
  };
}

export type Archetype = { name: string; detail: string };

/** Below this, the highest stat is not yet a direction. */
export const UNDECIDED_BELOW = 50;

export function archetypeOf(stats: Stats): Archetype {
  const entries = STAT_ORDER.map((k) => [k, stats[k]] as const).sort((a, b) => b[1] - a[1]);
  const [topKey, topValue] = entries[0];
  const lowest = entries[entries.length - 1][1];

  if (topValue === 0) return { name: '이름 없는 아이', detail: '아직 아무 길도 걷지 않았습니다.' };
  if (lowest >= 60) return { name: '원탁의 재목', detail: '어느 하나 모자람이 없습니다.' };
  /*
    A title has to be earned by more than one afternoon.

    Three sets of deadlifts on the first day put strength at 39 and everything
    else lower, and that was enough to be called 「괴력의 전사」 — the top stat
    names the title however low the top is. Below the halfway mark no stat has
    shown which way she is growing yet. Strength reaches 50 at a 3,000kg
    session, discipline after a week in a row.
  */
  if (topValue < UNDECIDED_BELOW) {
    return { name: '길을 찾는 아이', detail: '아직 어느 길로 갈지 정해지지 않았습니다.' };
  }

  const names: Record<StatKey, Archetype> = {
    strength: { name: '괴력의 전사', detail: '무거운 것을 드는 데 능합니다.' },
    stamina: { name: '순례자', detail: '멀리, 오래 가는 데 능합니다.' },
    vitality: { name: '강철의 심장', detail: '많은 양을 견디는 데 능합니다.' },
    balance: { name: '만능 기사', detail: '온몸을 고루 쓰는 데 능합니다.' },
    discipline: { name: '경건한 수도자', detail: '거르지 않는 것이 가장 큰 재주입니다.' },
  };
  return names[topKey];
}

/** A nudge aimed at whatever is lagging most, in her voice. */
export function masterSays(stats: Stats, workouts: WorkoutFact[], today = new Date()) {
  if (workouts.length === 0) return '첫 기록을 남기는 것이 곧 첫 걸음이에요.';

  const entries = STAT_ORDER.map((k) => [k, stats[k]] as const).sort((a, b) => a[1] - b[1]);
  const [weakest] = entries[0];
  const streak = streakOf(workouts, today);

  if (streak === 0) return '사흘을 쉬면 몸이 먼저 잊어요. 오늘 다시 시작해요.';
  if (streak >= 7) return `${streak}일을 이어왔어요. 쉬는 것도 훈련이라는 걸 잊지 마세요.`;

  const advice: Record<StatKey, string> = {
    strength: '무게를 조금씩 올려요. 지난주와 같은 무게로는 같은 몸에 머물러요.',
    stamina: '숨이 차는 운동을 하나 넣어요. 심장도 근육이에요.',
    vitality: '세트를 하나씩만 더 쌓아요. 티끌이 산을 이뤄요.',
    balance: '쓰지 않은 부위가 남았어요. 한쪽만 올린 탑은 기울기 마련이에요.',
    discipline: '오늘 하루보다 이번 주 세 번이 나아요.',
  };
  return advice[weakest];
}

/** A short plain-words condition line, in the spirit of "어쨌든 튼튼하게". */
export function conditionOf(stats: Stats, streak: number) {
  const values = STAT_ORDER.map((k) => stats[k]);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  if (average === 0) return '아직 시작 전';
  if (streak >= 7) return '기세가 올랐어요';
  if (streak === 0) return '몸이 식었어요';
  if (average >= 70) return '어쨌든 튼튼하게';
  if (average >= 40) return '제법 단단해졌어요';
  return '이제 막 다지는 중';
}

export type WeeklyPlan = {
  goal: number;
  done: number;
  daysLeft: number;
  met: boolean;
};

/** Progress against a weekly session goal, measured over the current week. */
export function weeklyPlan(workouts: WorkoutFact[], goal = 3, today = new Date()): WeeklyPlan {
  const monday = new Date(today);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  monday.setHours(0, 0, 0, 0);

  const days = new Set(
    workouts
      .filter((w) => new Date(w.started_at) >= monday)
      .map((w) => localDayKey(new Date(w.started_at)))
  );
  return {
    goal,
    done: days.size,
    daysLeft: 7 - offset - 1,
    met: days.size >= goal,
  };
}

/**
 * Stats as they actually show, dimmed by how she is faring. Letting her go
 * hungry or ragged has to cost something visible, or the needs are decoration.
 *
 * The scaling is uniform, so it never reorders her strengths — a neglected
 * lifter is still a lifter, just a diminished one.
 */
export function scaleStats(stats: Stats, factor: number): Stats {
  const scaled = {} as Stats;
  for (const key of STAT_ORDER) scaled[key] = Math.round(stats[key] * factor);
  return scaled;
}

/** Why the numbers are lower than they were, or null when nothing is wrong. */
export function conditionPenalty(factor: number) {
  if (factor >= 0.99) return null;
  return `돌봄이 부족해 능력이 ${Math.round((1 - factor) * 100)}% 낮게 나와요`;
}
