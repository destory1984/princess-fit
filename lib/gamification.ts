import { localDayKey } from './format.ts';

export type WorkoutFact = {
  id: string;
  started_at: string;
  /** Muscle groups trained, e.g. ['가슴','팔'] */
  groups: string[];
  doneSets: number;
  volume: number;
  durationSec: number;
  distanceKm: number;
};

// A set is the unit of effort; volume and time top it up so heavy or long
// sessions count for more without letting either dominate.
const XP_PER_WORKOUT = 50;
const XP_PER_SET = 10;
const XP_PER_100KG = 1;
const XP_PER_CARDIO_MINUTE = 2;

export function workoutXp(w: WorkoutFact) {
  return (
    XP_PER_WORKOUT +
    w.doneSets * XP_PER_SET +
    Math.floor(w.volume / 100) * XP_PER_100KG +
    Math.floor(w.durationSec / 60) * XP_PER_CARDIO_MINUTE
  );
}

export function totalXp(workouts: WorkoutFact[]) {
  return workouts.reduce((sum, w) => sum + workoutXp(w), 0);
}

/** Level n starts at 100·(n−1)². Early levels come fast, later ones earn their keep. */
export function levelAt(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const floorXp = 100 * (level - 1) ** 2;
  const nextXp = 100 * level ** 2;
  return {
    level,
    title: levelTitle(level),
    floorXp,
    nextXp,
    progress: (xp - floorXp) / (nextXp - floorXp),
    toNext: nextXp - xp,
  };
}

/** One rank per level so the title changes often enough to notice. */
export const LEVEL_TITLES = [
  '문하생',
  '수련생',
  '내문 제자',
  '무사',
  '검객',
  '일류',
  '고수',
  '절정',
  '초절정',
  '화경',
  '현경',
  '생사경',
];

export function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1];
}

export type Badge = {
  id: string;
  name: string;
  detail: string;
  icon: string;
  /** Progress toward earning it, 0..1 */
  progress: number;
  earned: boolean;
};

function ratio(value: number, goal: number) {
  return Math.max(0, Math.min(1, value / goal));
}

export function streakOf(workouts: WorkoutFact[], today = new Date()) {
  const days = new Set(workouts.map((w) => localDayKey(new Date(w.started_at))));
  const cursor = new Date(today);
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(workouts: WorkoutFact[]) {
  const days = [...new Set(workouts.map((w) => localDayKey(new Date(w.started_at))))].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const day of days) {
    const d = new Date(`${day}T00:00:00`);
    if (prev && (d.getTime() - prev.getTime()) / 86_400_000 === 1) run += 1;
    else run = 1;
    prev = d;
    best = Math.max(best, run);
  }
  return best;
}

/** Most distinct muscle groups trained within any 7-day window. */
export function bestWeeklyCoverage(workouts: WorkoutFact[]) {
  const sorted = [...workouts].sort((a, b) => a.started_at.localeCompare(b.started_at));
  let best = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const from = new Date(sorted[i].started_at).getTime();
    const groups = new Set<string>();
    for (let j = i; j < sorted.length; j += 1) {
      if (new Date(sorted[j].started_at).getTime() - from > 7 * 86_400_000) break;
      sorted[j].groups.forEach((g) => groups.add(g));
    }
    best = Math.max(best, groups.size);
  }
  return best;
}

export function evaluateBadges(workouts: WorkoutFact[], today = new Date()): Badge[] {
  const count = workouts.length;
  const volume = workouts.reduce((s, w) => s + w.volume, 0);
  const km = workouts.reduce((s, w) => s + w.distanceKm, 0);
  const hours = workouts.reduce((s, w) => s + w.durationSec, 0) / 3600;
  const best = longestStreak(workouts);
  const heaviest = Math.max(0, ...workouts.map((w) => w.volume));
  const coverage = bestWeeklyCoverage(workouts);
  const hours24 = workouts.map((w) => new Date(w.started_at).getHours());
  const dawn = hours24.filter((h) => h < 6).length;
  const night = hours24.filter((h) => h >= 22).length;

  const make = (
    id: string,
    name: string,
    detail: string,
    icon: string,
    value: number,
    goal: number
  ): Badge => ({
    id,
    name,
    detail,
    icon,
    progress: ratio(value, goal),
    earned: value >= goal,
  });

  return [
    make('first', '첫 걸음', '운동을 한 번 마치기', 'footsteps', count, 1),
    make('ten', '열 번의 약속', '운동 10회 마치기', 'ribbon', count, 10),
    make('fifty', '쉰 번의 뚝심', '운동 50회 마치기', 'medal', count, 50),
    make('hundred', '백 번의 증명', '운동 100회 마치기', 'trophy', count, 100),
    make('streak3', '사흘의 불씨', '3일 연속 운동', 'flame', best, 3),
    make('streak7', '이레 개근', '7일 연속 운동', 'flame', best, 7),
    make('streak30', '한 달 정복', '30일 연속 운동', 'flame', best, 30),
    make('heavy', '무게 사냥꾼', '한 번에 5,000kg 들기', 'barbell', heaviest, 5000),
    make('ton10', '10톤 클럽', '누적 10,000kg 들기', 'cube', volume, 10_000),
    make('ton100', '100톤 클럽', '누적 100,000kg 들기', 'cube', volume, 100_000),
    make('balance', '균형 잡힌 몸', '한 주에 여섯 부위 모두 쓰기', 'body', coverage, 6),
    make('marathon', '마라톤 완주', '누적 42.195km 달리기', 'walk', km, 42.195),
    make('tenhours', '열 시간의 인내', '유산소 누적 10시간', 'time', hours, 10),
    make('dawn', '새벽형 인간', '오전 6시 이전에 운동', 'partly-sunny', dawn, 1),
    make('night', '야행성', '밤 10시 이후에 운동', 'moon', night, 1),
  ];
}

export function summarise(workouts: WorkoutFact[], today = new Date()) {
  const xp = totalXp(workouts);
  const badges = evaluateBadges(workouts, today);
  return {
    xp,
    ...levelAt(xp),
    streak: streakOf(workouts, today),
    badges,
    earnedCount: badges.filter((b) => b.earned).length,
  };
}
