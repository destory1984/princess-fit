import AsyncStorage from '@react-native-async-storage/async-storage';
import { bellOf, DEFAULT_BELL, type BellKind } from './bellKind';
import { DEFAULT_QUIET_FROM, DEFAULT_QUIET_TO } from './quiet';
import { GOALS, PLACES, type Goal, type Place } from './onboarding';
import { clampGoal, DEFAULT_STEP_GOAL } from './steps';

const WEEKLY_GOAL = 'refit.weeklyGoal';
export const DEFAULT_WEEKLY_GOAL = 3;

export async function getWeeklyGoal() {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_GOAL);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WEEKLY_GOAL;
  } catch {
    return DEFAULT_WEEKLY_GOAL;
  }
}

export async function setWeeklyGoal(goal: number) {
  await AsyncStorage.setItem(WEEKLY_GOAL, String(Math.max(1, Math.min(7, goal))));
}

const GOAL = 'refit.goal';
const PLACE = 'refit.place';
const ONBOARDED = 'refit.onboardedAt';

/** What they said they were after. Null until they have been asked. */
export async function getGoal(): Promise<Goal | null> {
  try {
    const raw = await AsyncStorage.getItem(GOAL);
    return GOALS.some((g) => g.id === raw) ? (raw as Goal) : null;
  } catch {
    return null;
  }
}

export async function setGoal(goal: Goal) {
  await AsyncStorage.setItem(GOAL, goal);
}

/** Where they train, which decides what can be recommended. */
export async function getPlace(): Promise<Place | null> {
  try {
    const raw = await AsyncStorage.getItem(PLACE);
    return PLACES.some((p) => p.id === raw) ? (raw as Place) : null;
  } catch {
    return null;
  }
}

export async function setPlace(place: Place) {
  await AsyncStorage.setItem(PLACE, place);
}

/**
 * Whether the first conversation has happened.
 *
 * Stored on the device rather than on the account, because what it guards is a
 * screen, not data: being asked again after reinstalling is a small annoyance,
 * and the onboarding screen bows out by itself when it finds an account that
 * already has routines. Losing a server round trip on every cold start to
 * avoid that annoyance is the worse trade.
 */
export async function getOnboardedAt() {
  try {
    return await AsyncStorage.getItem(ONBOARDED);
  } catch {
    // Unreadable storage should not lock anyone out of their own app, so this
    // reads as "already done" rather than sending them round the loop again.
    return new Date().toISOString();
  }
}

export async function markOnboarded() {
  try {
    await AsyncStorage.setItem(ONBOARDED, new Date().toISOString());
  } catch {
    // Worst case they are greeted twice.
  }
}

/**
 * Make room for a new account on a phone someone has already been greeted on.
 *
 * Signing out leaves the flag and the two answers behind, so the next person
 * to sign up here was never greeted and inherited 「집 · 주 3회」 from a
 * stranger. Called before the sign-up is sent, not after: the session lands
 * and the layout reads the flag before the call returns. The returned function
 * puts everything back, for a sign-up that was refused — an address that
 * already has an account is the same person, not a new one.
 */
export async function forgetGreeting(): Promise<() => Promise<void>> {
  const keys = [ONBOARDED, GOAL, PLACE];
  try {
    const kept = (await AsyncStorage.multiGet(keys)).filter(
      (pair): pair is [string, string] => pair[1] !== null,
    );
    await AsyncStorage.multiRemove(keys);
    return async () => {
      await AsyncStorage.multiSet(kept).catch(() => {});
    };
  } catch {
    // Worst case the newcomer is not greeted, which is where this started.
    return async () => {};
  }
}

const BELL = 'refit.bell';

/** Which bell ends a rest on the web (lib/bellKind.ts). */
export async function getBell(): Promise<BellKind> {
  try {
    return bellOf(await AsyncStorage.getItem(BELL));
  } catch {
    return DEFAULT_BELL;
  }
}

export async function setBell(kind: BellKind) {
  await AsyncStorage.setItem(BELL, kind);
}

const STEP_GOAL = 'refit.stepGoal';

/** How far a day's walking is measured against. */
export async function getStepGoal() {
  try {
    const raw = await AsyncStorage.getItem(STEP_GOAL);
    const parsed = Number(raw);
    return raw !== null && Number.isFinite(parsed) ? clampGoal(parsed) : DEFAULT_STEP_GOAL;
  } catch {
    return DEFAULT_STEP_GOAL;
  }
}

export async function setStepGoal(goal: number) {
  await AsyncStorage.setItem(STEP_GOAL, String(clampGoal(goal)));
}

const WALK = 'refit.walk';

/**
 * How much today's walking has already fed her.
 *
 * Walking carries on after the app is closed, so the credit is topped up each
 * time rather than paid once. Keyed by day so yesterday's payment cannot be
 * claimed again this morning, and kept on the device because it is a receipt
 * for something the device measured.
 */
export async function getWalkCredit(dayKey: string) {
  try {
    const raw = await AsyncStorage.getItem(WALK);
    if (!raw) return 0;
    const [day, credited] = raw.split(',');
    const parsed = Number(credited);
    return day === dayKey && Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  } catch {
    return 0;
  }
}

export async function setWalkCredit(dayKey: string, credited: number) {
  try {
    await AsyncStorage.setItem(WALK, `${dayKey},${credited}`);
  } catch {
    // Worst case she is fed twice for one walk, which is not worth guarding.
  }
}

const QUIET = 'refit.quietHours';

/** When she should keep quiet, as [from, to] hours. Null means never. */
export async function getQuietHours(): Promise<[number, number] | null> {
  try {
    const raw = await AsyncStorage.getItem(QUIET);
    if (raw === 'off') return null;
    if (raw === null) return [DEFAULT_QUIET_FROM, DEFAULT_QUIET_TO];
    const [from, to] = raw.split(',').map(Number);
    const ok = (h: number) => Number.isInteger(h) && h >= 0 && h <= 23;
    return ok(from) && ok(to) ? [from, to] : [DEFAULT_QUIET_FROM, DEFAULT_QUIET_TO];
  } catch {
    return [DEFAULT_QUIET_FROM, DEFAULT_QUIET_TO];
  }
}

export async function setQuietHours(hours: [number, number] | null) {
  await AsyncStorage.setItem(QUIET, hours === null ? 'off' : hours.join(','));
}

const DAILY_ID = 'refit.dailyNotificationId';

/**
 * The identifier of the standing daily message, so re-arming it can cancel
 * just that one. Cancelling everything would also throw away the lesson trips
 * she is already booked on.
 */
export async function getDailyMessageId() {
  try {
    return await AsyncStorage.getItem(DAILY_ID);
  } catch {
    return null;
  }
}

export async function setDailyMessageId(id: string | null) {
  try {
    if (id === null) await AsyncStorage.removeItem(DAILY_ID);
    else await AsyncStorage.setItem(DAILY_ID, id);
  } catch {
    // Worst case the old message stays until it is replaced.
  }
}

const NUDGE = 'refit.nudge';
/** Evening, when there is still time to go. */
export const DEFAULT_NUDGE_HOUR = 20;

/** The hour she speaks, or null when the user would rather not hear from her. */
export async function getNudgeHour(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(NUDGE);
    if (raw === 'off') return null;
    // Nothing stored has to be checked before parsing: Number(null) is 0, and
    // midnight is a real hour, so an unset preference read as 0시.
    if (raw === null) return DEFAULT_NUDGE_HOUR;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23
      ? parsed
      : DEFAULT_NUDGE_HOUR;
  } catch {
    return DEFAULT_NUDGE_HOUR;
  }
}

export async function setNudgeHour(hour: number | null) {
  await AsyncStorage.setItem(NUDGE, hour === null ? 'off' : String(hour));
}

/**
 * Advice already given for a workout, and who gave it. Cached so revisiting a
 * past session shows what it said at the time instead of paying for a fresh
 * generation. A plain string is from before the speaker was kept: nobody
 * knows whose it was, so it reads as nobody's and is asked again.
 */
export async function getCachedAdvice(
  workoutId: string
): Promise<{ text: string; speaker: string | null } | null> {
  try {
    const raw = await AsyncStorage.getItem(`refit.advice.${workoutId}`);
    if (!raw) return null;
    try {
      const kept = JSON.parse(raw) as { text?: unknown; speaker?: unknown };
      if (typeof kept.text === 'string') {
        return { text: kept.text, speaker: typeof kept.speaker === 'string' ? kept.speaker : null };
      }
    } catch {
      // Falls through: the old plain-text form.
    }
    return { text: raw, speaker: null };
  } catch {
    return null;
  }
}

export async function cacheAdvice(workoutId: string, text: string, speaker: string) {
  try {
    await AsyncStorage.setItem(`refit.advice.${workoutId}`, JSON.stringify({ text, speaker }));
  } catch {
    // A missing cache only costs a regeneration.
  }
}

/** Drop the kept advice once the session it read has been changed. */
export async function forgetAdvice(workoutId: string) {
  try {
    await AsyncStorage.removeItem(`refit.advice.${workoutId}`);
  } catch {
    // Worst case the old sentence shows until the refresh button is pressed.
  }
}

const ASK_ROUTINE = 'refit.askRoutine';

/**
 * Whether to ask about folding a new movement into the routine it was added
 * during.
 *
 * On by default, and switchable, because a review of a much larger app is very
 * clear about why this needs the switch: 「알림+앱 버벅임 때문에 바꾸고 싶지
 * 않던 기존 플랜 변경 버튼이 눌립니다. 그럼 다시 제 플랜을 원래대로 수정해야
 * 되는데」. Someone with a plan they are happy with, who occasionally trains
 * something else, gets a question they never want and eventually mis-taps it.
 *
 * A question asked often enough becomes a trap, so the answer 「그만 물어봐」
 * has to be one of the answers.
 */
export async function getAskRoutine() {
  try {
    return (await AsyncStorage.getItem(ASK_ROUTINE)) !== 'off';
  } catch {
    return true;
  }
}

export async function setAskRoutine(ask: boolean) {
  await AsyncStorage.setItem(ASK_ROUTINE, ask ? 'on' : 'off');
}

const ADVICE_MODEL = 'refit.adviceModel';

/**
 * Whether advice is asked of the model at all. On unless turned off: the rules
 * answer whenever the model does not, so leaving it on costs only the wait.
 */
export async function getAdviceByModel() {
  try {
    return (await AsyncStorage.getItem(ADVICE_MODEL)) !== 'off';
  } catch {
    return true;
  }
}

export async function setAdviceByModel(on: boolean) {
  await AsyncStorage.setItem(ADVICE_MODEL, on ? 'on' : 'off');
}

const REST_END = 'refit.restEnd';

/**
 * The moment a rest is due to end, kept where a closed app cannot lose it.
 *
 * The bell was always safe — it is booked with the OS and rings whether or not
 * this app is running. The countdown was not: it lived in a screen's state, so
 * glancing at another app and coming back showed a rest that was never
 * happening. From the reviews of a much larger app: 「휴식타이머 켜져있을때
 * 아이폰 화면 들어가면 타이머 꺼져버림」.
 *
 * Stored against the workout so a stale one cannot leak into tomorrow's
 * session, and read back as null once it is in the past — a rest that ran out
 * while the app was closed is over, not owed.
 */
export async function getRestEnd(workoutId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(REST_END);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { workoutId: string; at: number };
    if (saved.workoutId !== workoutId) return null;
    return saved.at > Date.now() ? saved.at : null;
  } catch {
    return null;
  }
}

export async function setRestEnd(workoutId: string, at: number | null) {
  try {
    if (at === null) await AsyncStorage.removeItem(REST_END);
    else await AsyncStorage.setItem(REST_END, JSON.stringify({ workoutId, at }));
  } catch {
    // The countdown on screen is still right; only surviving a restart is lost.
  }
}

const ANSWERS_SEEN = 'refit.answersSeenAt';

/** When the requests screen was last looked at, as the desk's clock saw it. */
export async function getAnswersSeenAt() {
  try {
    return await AsyncStorage.getItem(ANSWERS_SEEN);
  } catch {
    return null;
  }
}

export async function setAnswersSeenAt(at: string) {
  try {
    await AsyncStorage.setItem(ANSWERS_SEEN, at);
  } catch {
    // The notice shows once more than it should, which is harmless.
  }
}

/**
 * The chosen girl's id, for code that runs outside a screen (lib/db.ts writing
 * her diary). The same key lib/girl.tsx keeps; null when none was chosen.
 */
export async function getChosenGirlId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('refit.girl');
  } catch {
    return null;
  }
}

/*
  The festival (lib/festival.ts). Which contest she was entered for, and
  which result has already been shown. Both on the phone: the entry is only
  a wish until the day is judged, and the result itself is kept on the
  account as a memory.
*/

const FESTIVAL_ENTRY = 'refit.festivalEntry';
const FESTIVAL_SEEN = 'refit.festivalSeen';

async function festivalEntries(): Promise<Record<string, string>> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(FESTIVAL_ENTRY)) ?? '{}');
    return raw && typeof raw === 'object' && !('key' in raw) ? raw : {};
  } catch {
    return {};
  }
}

/** The contest chosen for the festival `key` (YYYY-MM), or null if none was. */
export async function getFestivalEntry(key: string): Promise<string | null> {
  const entry = (await festivalEntries())[key];
  return typeof entry === 'string' ? entry : null;
}

/**
 * One entry per festival rather than only the latest: choosing next month's
 * contest before last month's has been judged must not change what she went
 * to last month. Only the last three are kept.
 */
export async function setFestivalEntry(key: string, contest: string) {
  const kept = Object.entries({ ...(await festivalEntries()), [key]: contest })
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-3);
  await AsyncStorage.setItem(FESTIVAL_ENTRY, JSON.stringify(Object.fromEntries(kept)));
}

/** The festival whose result was last shown, so it is announced once. */
export async function getFestivalSeen() {
  try {
    return await AsyncStorage.getItem(FESTIVAL_SEEN);
  } catch {
    return null;
  }
}

export async function setFestivalSeen(key: string) {
  try {
    await AsyncStorage.setItem(FESTIVAL_SEEN, key);
  } catch {
    // Announced once more than it should be, which is harmless.
  }
}

const BARS_KEY = 'refit.bars';

/**
 * Which bar each exercise is done with, by exercise id, where it is not the
 * full-size one. Kept on the phone: it is a fact about the gym this phone goes
 * to, and nothing on the server reads it.
 */
export async function getBars(): Promise<Record<string, number>> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(BARS_KEY)) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function setBar(exerciseId: string, bar: number) {
  const bars = await getBars();
  bars[exerciseId] = bar;
  await AsyncStorage.setItem(BARS_KEY, JSON.stringify(bars));
}
