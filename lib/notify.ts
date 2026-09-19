import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDailyMessageId, setDailyMessageId } from './prefs';
import type { Trip } from './lessons';

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
const ALARM_CHANNEL = 'rest';
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

Notifications.setNotificationHandler({
  // Her daily line should arrive quietly; the rest timer has to be heard even
  // with the app open, so the sound is decided per message rather than once.
  handleNotification: async (notification) => {
    const alarm = notification.request.content.data?.alarm === true;
    return {
      shouldPlaySound: alarm,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: !alarm,
    };
  },
});

/** Ask once. Returns whether we may post at all. */
export async function ensureNotificationPermission() {
  if (!supported) return false;

  if (Platform.OS === 'android') {
    // Android 13+ wants the channel to exist before the prompt.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: '리나의 안부',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
    });
    // Its own channel so the rest bell can be loud while her daily line stays
    // quiet, and so either can be silenced without the other.
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
      name: '쉬는 시간 알람',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
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
 * Replace the standing daily message. Only that one is cancelled, by its own
 * identifier: cancelling everything would also throw away the lesson trips she
 * is booked on.
 */
export async function scheduleDailyMessage(
  speaker: string,
  body: string,
  hour: number,
  minute = 0
) {
  if (!supported) return false;
  if (!(await ensureNotificationPermission())) return false;

  const previous = await getDailyMessageId();
  if (previous) await Notifications.cancelScheduledNotificationAsync(previous);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: speaker, body, data: { line: body } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL,
    },
  });
  await setDailyMessageId(id);
  return true;
}

/** Tapping a message opens her greeting saying the very same line. */
function said(speaker: string, body: string) {
  return { title: speaker, body, data: { line: body } };
}

const goodbye = (speaker: string, lesson: string) =>
  said(speaker, `${lesson} 배우러 다녀올게요.`);

const welcome = (speaker: string, lesson: string) =>
  said(speaker, `다녀왔어요. ${lesson}, 생각보다 재미있었어요.`);

/**
 * A lesson is a day out: she says goodbye in the morning and tells you how it
 * went when she is back. Two one-off messages, booked when the lesson is paid
 * for — nothing checks in later, so what she says on her return is written now.
 */
export async function scheduleLessonTrip(speaker: string, lesson: string, trip: Trip) {
  if (!supported) return false;
  if (!(await ensureNotificationPermission())) return false;

  await Notifications.scheduleNotificationAsync({
    content: goodbye(speaker, lesson),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trip.leaves,
      channelId: CHANNEL,
    },
  });
  await Notifications.scheduleNotificationAsync({
    content: welcome(speaker, lesson),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trip.returns,
      channelId: CHANNEL,
    },
  });
  return true;
}

/** Stop the standing message. Lesson trips already booked still arrive. */
export async function cancelDailyMessage() {
  if (!supported) return;
  const id = await getDailyMessageId();
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
  await setDailyMessageId(null);
}

/**
 * The end of a rest, booked for the moment it runs out.
 *
 * Scheduling it up front rather than ringing a bell when the countdown hits
 * zero is what makes it work with the phone in a pocket: the app may be
 * backgrounded or killed by then, and a timer in a screen that is no longer
 * running never fires.
 */
export async function scheduleRestAlarm(when: Date) {
  if (!supported) return null;
  if (!(await ensureNotificationPermission())) return null;

  const seconds = Math.max(1, Math.round((when.getTime() - Date.now()) / 1000));
  return Notifications.scheduleNotificationAsync({
    content: {
      title: '쉬는 시간 끝',
      body: '다음 세트 가요.',
      sound: true,
      data: { alarm: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: ALARM_CHANNEL,
    },
  });
}

export async function cancelRestAlarm(id: string | null) {
  if (!supported || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}
