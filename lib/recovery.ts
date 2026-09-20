/**
 * How rested each muscle is, estimated from what was done to it and when.
 *
 * This is a model, not a measurement. Nothing in the phone can see a muscle;
 * what it has is the number of working sets aimed at one and the hours since.
 * That is enough to answer the question people actually ask — 오늘은 뭘 하지 —
 * and not enough to be a fact, so the screen that shows it says which one it
 * is. The same rule as the sleep screen refusing to invent REM.
 *
 * The shape of the model: a hard session leaves a muscle needing about three
 * days, a light one about a day, and it comes back steadily in between.
 * Sessions stack, because two hard leg days in a row are not one hard leg day.
 */

/** Working sets on one muscle that count as a hard day for it. */
export const FULL_LOAD = 12;

/** Hours to come back from the lightest session worth counting. */
export const MIN_HOURS = 24;

/** Hours to come back from a session at or beyond FULL_LOAD. */
export const MAX_HOURS = 72;

/** Rested enough to train again without it being the wrong call. */
export const READY = 80;

export type Session = {
  /** When it started, ISO. */
  startedAt: string;
  /** Completed sets aimed at each muscle slug. */
  sets: Record<string, number>;
};

/** Whether anything has been recorded for any muscle at all. */
export function everTrained(muscles: Muscle[]) {
  return muscles.some((m) => m.hoursSince !== null);
}

export type Muscle = {
  slug: string;
  label: string;
  /** 0–100. 100 is rested. */
  recovery: number;
  /** Hours since it was last worked, or null if it never has been. */
  hoursSince: number | null;
};

// Only the ones a workout can actually aim at, and only slugs the body map
// really has. It knows more — heads and hands among them — and a recovery
// figure for a hand is the kind of number that makes people stop trusting the
// rest of the screen. A slug that is not in the artwork is worse still: it can
// never be worked, so it would sit at 100% for ever looking like an answer.
export const MUSCLE_LABELS: Record<string, string> = {
  chest: '가슴',
  'upper-back': '광배근',
  'lower-back': '척추기립근',
  trapezius: '승모근',
  deltoids: '삼각근',
  biceps: '이두',
  triceps: '삼두',
  forearm: '전완근',
  abs: '복근',
  obliques: '복사근',
  gluteal: '둔근',
  quadriceps: '대퇴사두',
  hamstring: '햄스트링',
  calves: '종아리',
  adductors: '내전근',
};

function hoursBetween(from: string, to: Date) {
  return Math.max(0, (to.getTime() - new Date(from).getTime()) / 3_600_000);
}

/** How long a session of this size needs, in hours. */
export function recoveryHours(sets: number) {
  const load = Math.min(1, Math.max(0, sets / FULL_LOAD));
  return MIN_HOURS + (MAX_HOURS - MIN_HOURS) * load;
}

/**
 * Fatigue still owed from one session, 0–1.
 *
 * Linear rather than a decay curve on purpose: a curve would imply a precision
 * the inputs do not have, and the thing this has to get right is only the
 * order — which muscle is readier than which.
 */
export function remainingFatigue(sets: number, hoursSince: number) {
  if (sets <= 0) return 0;
  const peak = Math.min(1, sets / FULL_LOAD);
  const window = recoveryHours(sets);
  return peak * Math.max(0, 1 - hoursSince / window);
}

/**
 * Every muscle's state, readiest last so the list reads as an answer.
 *
 * Sessions stack and the total is capped: a muscle can be completely spent but
 * not more than completely, and two hard days in a row should not report a
 * recovery of minus forty.
 */
export function recoveryOf(sessions: Session[], now = new Date()): Muscle[] {
  const fatigue = new Map<string, number>();
  const last = new Map<string, number>();

  for (const session of sessions) {
    const hours = hoursBetween(session.startedAt, now);
    for (const [slug, sets] of Object.entries(session.sets)) {
      if (!(slug in MUSCLE_LABELS) || sets <= 0) continue;
      fatigue.set(slug, (fatigue.get(slug) ?? 0) + remainingFatigue(sets, hours));
      const seen = last.get(slug);
      if (seen === undefined || hours < seen) last.set(slug, hours);
    }
  }

  return Object.entries(MUSCLE_LABELS)
    .map(([slug, label]) => ({
      slug,
      label,
      recovery: Math.round((1 - Math.min(1, fatigue.get(slug) ?? 0)) * 100),
      hoursSince: last.get(slug) ?? null,
    }))
    .sort((a, b) => a.recovery - b.recovery || a.label.localeCompare(b.label));
}

/** How long ago, in words. Days once hours stop being the useful unit. */
export function sinceWord(hoursSince: number | null) {
  if (hoursSince === null) return '아직 한 적 없어요';
  if (hoursSince < 1) return '방금 했어요';
  if (hoursSince < 48) return `${Math.round(hoursSince)}시간 전에 했어요`;
  return `${Math.floor(hoursSince / 24)}일 전에 했어요`;
}

/**
 * What today's answer is, in one line.
 *
 * Names the tired ones rather than the rested ones. Everything not listed is
 * available, and a list of twelve ready muscles is not an answer to anything —
 * whereas "다리는 아직" is.
 */
export function todaysWord(muscles: Muscle[]): string {
  const trained = muscles.filter((m) => m.hoursSince !== null);
  if (trained.length === 0) return '아직 기록이 없어서 셈할 게 없어요.';

  const tired = muscles.filter((m) => m.recovery < READY).map((m) => m.label);
  if (tired.length === 0) return '전부 쉬었어요. 뭘 하셔도 괜찮아요.';
  if (tired.length >= Object.keys(MUSCLE_LABELS).length - 2) {
    return '거의 다 지쳐 있어요. 오늘은 쉬거나 가볍게만 하세요.';
  }
  return `${tired.slice(0, 3).join(' · ')}${tired.length > 3 ? ' 외' : ''}은(는) 아직 덜 쉬었어요.`;
}
