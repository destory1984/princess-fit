import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

/**
 * Today's steps, read from the phone's own motion chip.
 *
 * This is the pedometer rather than Apple 건강: it works in Expo Go, needs no
 * development build, and asks for motion rather than health records. The cost
 * is that only iOS keeps a history to read — `getStepCountAsync` is iOS-only,
 * and Android can count only while the app is awake, which would mean
 * rewarding having the app open rather than walking. So Android says it cannot
 * tell rather than reporting a number that means something else.
 */

export type StepReading =
  | { steps: number }
  | { steps: null; why: string };

export async function stepsToday(now = new Date()): Promise<StepReading> {
  if (Platform.OS !== 'ios') {
    return { steps: null, why: '걸음 수는 아이폰에서만 셀 수 있어요.' };
  }

  try {
    if (!(await Pedometer.isAvailableAsync())) {
      return { steps: null, why: '이 폰은 걸음 수를 세지 못해요.' };
    }
  } catch {
    return { steps: null, why: '걸음 수를 읽지 못했어요.' };
  }

  const permission = await Pedometer.getPermissionsAsync();
  if (!permission.granted) {
    if (!permission.canAskAgain) {
      return { steps: null, why: '설정에서 동작 및 피트니스 권한을 켜 주세요.' };
    }
    const asked = await Pedometer.requestPermissionsAsync();
    if (!asked.granted) return { steps: null, why: '걸음 수 권한이 없어요.' };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  try {
    const { steps } = await Pedometer.getStepCountAsync(start, now);
    return { steps: Math.max(0, Math.round(steps)) };
  } catch {
    // Asking before the phone has recorded anything today throws rather than
    // returning zero, and a phone left on a desk all morning is not an error.
    return { steps: 0 };
  }
}
