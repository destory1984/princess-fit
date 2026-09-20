import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDailyMessageId, getQuietHours, setDailyMessageId } from './prefs';
import { nextAudibleHour, whenAudible } from './quiet';
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

  // Her own messages keep quiet hours; an hour inside the window is pushed to
  // when it ends rather than dropped, so she still says it, just at breakfast.
  const quiet = await getQuietHours();
  const when = quiet ? nextAudibleHour(hour, quiet[0], quiet[1]) : hour;

  const previous = await getDailyMessageId();
  if (previous) await Notifications.cancelScheduledNotificationAsync(previous);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: speaker, body, data: { line: body } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: when,
      minute: when === hour ? minute : 0,
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
  said(speaker, `오늘부터 ${lesson} 배우러 다녀요.`);

const welcome = (speaker: string, lesson: string) =>
  said(speaker, `${lesson}, 오늘로 끝났어요. 배운 건 어디 안 가니까요.`);

/**
 * A course is days of going every morning: she says so on the first and tells
 * you it is over on the last. Two one-off messages, booked when the course is
 * paid for — nothing checks in between, so what she says at the end is written
 * at the start.
 */
export async function scheduleLessonTrip(speaker: string, lesson: string, trip: Trip) {
  if (!supported) return false;
  if (!(await ensureNotificationPermission())) return false;

  const quiet = await getQuietHours();
  const at = (moment: Date) => (quiet ? whenAudible(moment, quiet[0], quiet[1]) : moment);

  await Notifications.scheduleNotificationAsync({
    content: goodbye(speaker, lesson),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at(trip.leaves),
      channelId: CHANNEL,
    },
  });
  await Notifications.scheduleNotificationAsync({
    content: welcome(speaker, lesson),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at(trip.returns),
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
