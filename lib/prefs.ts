import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ADVISOR_ID } from './advisors';

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

const ADVISOR = 'refit.advisor';

export async function getAdvisorId() {
  try {
    return (await AsyncStorage.getItem(ADVISOR)) ?? DEFAULT_ADVISOR_ID;
  } catch {
    return DEFAULT_ADVISOR_ID;
  }
}

export async function setAdvisorId(id: string) {
  await AsyncStorage.setItem(ADVISOR, id);
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
