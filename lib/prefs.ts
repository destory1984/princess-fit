import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * Advice already given for a workout. Cached so revisiting a past session shows
 * what it said at the time instead of paying for a fresh generation.
 */
export async function getCachedAdvice(workoutId: string) {
  try {
    return await AsyncStorage.getItem(`refit.advice.${workoutId}`);
  } catch {
    return null;
  }
}

export async function cacheAdvice(workoutId: string, text: string) {
  try {
    await AsyncStorage.setItem(`refit.advice.${workoutId}`, text);
  } catch {
    // A missing cache only costs a regeneration.
  }
}
