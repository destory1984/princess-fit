import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// expo-haptics is a no-op on web; guarding keeps the calls silent there.
const supported = Platform.OS !== 'web';

export function tapFeedback() {
  if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function successFeedback() {
  if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function celebrateFeedback() {
  if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
