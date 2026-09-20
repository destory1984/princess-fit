import type { StepReading } from './stepCounter.native';

/**
 * A browser has no pedometer, and `expo-sensors` throws on import here rather
 * than returning nothing — which would take the whole app down, since the
 * router learns about every screen before any of them are opened. Hence the
 * platform split, the same one the progress photos needed.
 */
export async function stepsToday(): Promise<StepReading> {
  return { steps: null, why: '걸음 수는 폰에서만 셀 수 있어요.' };
}

export type { StepReading };
