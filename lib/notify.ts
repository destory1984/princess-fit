import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Her one message a day.
 *
 * These are local notifications, not push: nothing is scheduled by a server, so
 * the text has to be decided in advance. The app re-schedules on every open
 * with the mood she will be in by then, which is close enough — if the app is
 * never opened, yesterday's line repeats, and a girl who says the same thing
 * two days running is still better than silence.
 *
 * Web has no notification scheduling here, so every call is a no-op there
 * rather than a thrown error in the middle of loading the home screen.
 */

const CHANNEL = 'daily';
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Ask once. Returns whether we may post at all. */
export async function ensureNotificationPermission() {
  if (!supported) return false;

  if (Platform.OS === 'android') {
    // Android 13+ wants the channel to exist before the prompt.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: '하루 한 마디',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return asked.granted;
}

/**
 * Replace the standing daily message. Cancelling first is deliberate: the
 * alternative is a pile of stale schedules, each one a line she no longer means.
 */
export async function scheduleDailyMessage(
  speaker: string,
  body: string,
  hour: number,
  minute = 0
) {
  if (!supported) return false;
  if (!(await ensureNotificationPermission())) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: speaker, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL,
    },
  });
  return true;
}

export async function cancelDailyMessage() {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
