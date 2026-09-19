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
