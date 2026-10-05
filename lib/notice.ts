import { localDayKey } from './format.ts';
import { isEmptyWorkout, streakOf, type WorkoutFact } from './gamification.ts';
import { withParticle } from './korean.ts';
import { READY, type Muscle } from './recovery.ts';
import { formatDuration, sleepMinutes, type SleepLog } from './sleep.ts';
import { nextWeight } from './weight.ts';
import type { Session, Stage } from './companion.ts';

/**
 * What each girl notices. They are told apart by what they watch before they
 * are told apart by how they talk:
 *
 * - 리나 watches your body and your rest — sleep, sore muscles, days without
 *   a break. She praises the rest day as readily as the workout.
 * - 피아 watches the numbers — the best lift, the streak, this week against
 *   last. She sets you against yesterday's self.
 * - 유키 watches the gaps — the part of the body left alone, the weekly goal
 *   falling short, the cardio that never happens.
 *
 * Everything said here is something the app has actually recorded. Nothing
 * about form, because nothing in the app can see form, and a girl who claims
 * to have watched your knees is telling you a story.
 */

export type Seen = {
  facts: WorkoutFact[];
  /** Per-session heaviest lifts, oldest first (from the memories). */
  sessions?: Session[];
  sleep?: SleepLog[];
  muscles?: Muscle[];
  weeklyGoal?: number;
};

const GROUPS = ['가슴', '등', '어깨', '하체', '팔', '복근'];

function dayNumber(key: string) {
  return Math.round(new Date(`${key}T00:00:00`).getTime() / 86_400_000);
}

function trainedOn(facts: WorkoutFact[], key: string) {
  return facts.some((f) => localDayKey(new Date(f.started_at)) === key && f.doneSets + f.durationSec > 0);
}

function shift(today: Date, days: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d;
}

const kg = (n: number) => `${Math.round(n * 10) / 10}kg`;

// ── 리나: the body and its rest ──────────────────────────────────────────

function rina(seen: Seen, today: Date): string | null {
  const key = localDayKey(today);
  const lastNight = seen.sleep?.find((l) => l.slept_on === key);
  if (lastNight) {
    const minutes = sleepMinutes(lastNight.bed_minute, lastNight.wake_minute);
    if (minutes < 6 * 60) {
      return `어젯밤 ${formatDuration(minutes)}밖에 못 주무셨죠. 오늘은 가볍게 해요.`;
    }
  }

  const streak = streakOf(seen.facts, today);
  if (streak >= 4) return `벌써 ${streak}일째예요. 하루쯤 쉬어도 아무도 뭐라 안 해요.`;

  if (!trainedOn(seen.facts, key)) {
    const tired = (seen.muscles ?? []).filter((m) => m.recovery < READY).map((m) => m.label);
    if (tired.length) {
      const named = tired.slice(0, 2).join('·');
      return `${withParticle(named, '은는')} 아직 덜 풀렸어요. 오늘은 다른 데 해요.`;
    }
  }

  // A rest day right after a run of training is worth praising: it is the
  // one kind of good day nobody else in the app will mention.
  const yesterday = localDayKey(shift(today, -1));
  if (
    !trainedOn(seen.facts, yesterday) &&
    trainedOn(seen.facts, localDayKey(shift(today, -2))) &&
    trainedOn(seen.facts, localDayKey(shift(today, -3)))
  ) {
    return '어제 잘 쉬셨죠? 쉬는 것도 운동이에요.';
  }

  const week = (seen.sleep ?? []).filter((l) => dayNumber(key) - dayNumber(l.slept_on) < 7);
  if (week.length >= 3) {
    const avg = week.reduce((s, l) => s + sleepMinutes(l.bed_minute, l.wake_minute), 0) / week.length;
    if (avg >= 7 * 60) return '요즘 푹 주무시네요. 그게 제일 좋은 약이에요.';
  }
  return null;
}

// ── 피아: the numbers ────────────────────────────────────────────────────

function mondayOf(today: Date) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function volumeBetween(facts: WorkoutFact[], from: Date, to: Date) {
  return facts
    .filter((f) => {
      const t = new Date(f.started_at).getTime();
      return t >= from.getTime() && t < to.getTime();
    })
    .reduce((s, f) => s + f.volume, 0);
}

function pia(seen: Seen, today: Date): string | null {
  const key = localDayKey(today);
  const sessions = (seen.sessions ?? []).filter((s) => s.worked && s.lifts.length);
  const last = sessions[sessions.length - 1];
  if (last) {
    const lastDay = localDayKey(new Date(last.started_at));
    const top = last.lifts.reduce((a, b) => (b.kg > a.kg ? b : a));
    const before = sessions
      .slice(0, -1)
      .flatMap((s) => s.lifts)
      .filter((l) => l.exercise === top.exercise)
      .reduce((m, l) => Math.max(m, l.kg), 0);
    const recent = dayNumber(key) - dayNumber(lastDay) <= 14;
    if (recent && before > 0 && top.kg > before) {
      const when = lastDay === key ? '오늘' : '지난번';
      return `${when} ${top.exercise} ${kg(top.kg)}, 최고 기록이에요! 다음엔 ${kg(nextWeight(top.kg, 1))} 가 봐요!`;
    }
  }

  const streak = streakOf(seen.facts, today);
  if (streak >= 2) {
    return trainedOn(seen.facts, key)
      ? `오늘로 ${streak}일 연속! 기록 늘어나는 소리 들려요!`
      : `${streak}일 연속이에요! 오늘 오면 ${streak + 1}일!`;
  }

  // Last week only up to the same weekday, or every Monday loses.
  const monday = mondayOf(today);
  const endOfToday = shift(today, 1);
  endOfToday.setHours(0, 0, 0, 0);
  const thisWeek = volumeBetween(seen.facts, monday, endOfToday);
  const lastWeek = volumeBetween(seen.facts, shift(monday, -7), shift(endOfToday, -7));
  if (lastWeek > 0 && thisWeek > lastWeek) {
    return `이번 주 벌써 ${Math.round(thisWeek).toLocaleString()}kg! 지난주 이맘때보다 ${Math.round(thisWeek - lastWeek).toLocaleString()}kg 더 들었어요!`;
  }

  if (last) {
    const top = last.lifts.reduce((a, b) => (b.kg > a.kg ? b : a));
    // After today's session 「지난번」 is this morning and 「오늘은」 is already done.
    return localDayKey(new Date(last.started_at)) === key
      ? `오늘 ${top.exercise} ${kg(top.kg)} 했죠? 다음엔 ${kg(nextWeight(top.kg, 1))} 도전!`
      : `지난번 ${top.exercise} ${kg(top.kg)}이었죠? 오늘은 ${kg(nextWeight(top.kg, 1))} 도전!`;
  }
  return null;
}

// ── 유키: the gaps ───────────────────────────────────────────────────────

function yuki(seen: Seen, today: Date, stage: Stage): string | null {
  const formal = stage === 'new' || stage === 'familiar';
  const key = localDayKey(today);
  const facts = seen.facts.filter((f) => f.doneSets + f.durationSec > 0);

  // The part left alone longest, among parts that have been trained at all —
  // one never touched is a choice, not a lapse.
  let worst: { group: string; days: number } | null = null;
  for (const group of GROUPS) {
    const days = facts
      .filter((f) => f.groups.includes(group))
      .map((f) => dayNumber(key) - dayNumber(localDayKey(new Date(f.started_at))));
    if (!days.length) continue;
    const since = Math.min(...days);
    if (since >= 10 && (!worst || since > worst.days)) worst = { group, days: since };
  }
  if (worst) {
    return formal
      ? `${worst.group} 안 한 지 ${worst.days}일입니다. 알고 계시죠?`
      : `${worst.group} 안 한 지 ${worst.days}일이에요. 모른 척하지 마세요.`;
  }

  const goal = seen.weeklyGoal ?? 0;
  if (goal > 0) {
    const monday = mondayOf(today);
    const done = new Set(
      facts
        .filter((f) => new Date(f.started_at).getTime() >= monday.getTime())
        .map((f) => localDayKey(new Date(f.started_at)))
    ).size;
    const daysLeft = 7 - ((today.getDay() + 6) % 7); // today included
    const owed = goal - done;
    // Only once it is getting tight: said on Monday it is nagging.
    if (owed > 0 && daysLeft <= owed + 1) {
      return formal
        ? `이번 주 ${done}번입니다. 목표 ${goal}번까지 ${owed}번, 남은 날은 ${daysLeft}일입니다.`
        : `이번 주 ${done}번이에요. ${owed}번 남았는데 ${daysLeft}일 남았어요. 계산해 보세요.`;
    }
  }

  const month = facts.filter((f) => dayNumber(key) - dayNumber(localDayKey(new Date(f.started_at))) < 30);
  const cardio = Math.round(month.reduce((s, f) => s + f.durationSec, 0) / 60);
  if (month.length >= 4 && cardio < 30) {
    return formal
      ? `유산소가 한 달에 ${cardio}분입니다. 부족합니다.`
      : `유산소 한 달에 ${cardio}분이에요. 끝나고 10분만 걸어요.`;
  }
  return null;
}

/** What this girl has noticed today, in her own words, or null. */
export function noticeFor(girl: string | undefined, given: Seen, stage: Stage, today = new Date()) {
  // An empty session is not a day trained. The plaque already counts that
  // way, and she said 「벌써 5일째」 beside a plaque reading 연속 1일.
  const seen = { ...given, facts: given.facts.filter((f) => !isEmptyWorkout(f)) };
  if (girl === 'dohwa') return pia(seen, today);
  if (girl === 'seora') return yuki(seen, today, stage);
  return rina(seen, today);
}
