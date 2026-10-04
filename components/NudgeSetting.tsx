import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { explain } from '@/lib/dbError';
import { useGirl } from '@/lib/girl';
import { withParticle } from '@/lib/korean';
import { notify } from '@/lib/confirm';
import { cancelDailyMessage } from '@/lib/notify';
import {
  DEFAULT_NUDGE_HOUR,
  getNudgeHour,
  getQuietHours,
  setNudgeHour,
  setQuietHours,
} from '@/lib/prefs';
import { DEFAULT_QUIET_FROM, DEFAULT_QUIET_TO, isQuiet } from '@/lib/quiet';
import { colors, radius, spacing } from '@/lib/theme';

/** Hours worth offering. A nudge at 3am helps nobody. */
const HOURS = [8, 12, 18, 20, 22];

/** Windows people actually sleep in, rather than two more hour pickers. */
const QUIET_WINDOWS: [number, number][] = [
  [22, 7],
  [23, 8],
  [0, 9],
];

/** Whether she sends her one message a day, and when. */
export function NudgeSetting() {
  // Whoever is here now sends it. The name was written in as 리나 when she was the only one.
  const girl = useGirl();
  const [hour, setHour] = useState<number | null>(DEFAULT_NUDGE_HOUR);
  const [quiet, setQuiet] = useState<[number, number] | null>([
    DEFAULT_QUIET_FROM,
    DEFAULT_QUIET_TO,
  ]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getNudgeHour().then((h) => alive && setHour(h));
      getQuietHours().then((q) => alive && setQuiet(q));
      return () => {
        alive = false;
      };
    }, [])
  );

  async function change(next: number | null) {
    const previous = hour;
    setHour(next);
    try {
      await setNudgeHour(next);
      // The new time takes effect when the home screen next re-arms it; only
      // turning it off has to act now, or a stale message would still fire.
      if (next === null) await cancelDailyMessage();
    } catch (e: any) {
      notify('저장 실패', explain(e));
      setHour(previous);
    }
  }

  async function changeQuiet(next: [number, number] | null) {
    const previous = quiet;
    setQuiet(next);
    try {
      await setQuietHours(next);
    } catch (e: any) {
      notify('저장 실패', explain(e));
      setQuiet(previous);
    }
  }

  const silenced = hour !== null && quiet !== null && isQuiet(hour, quiet[0], quiet[1]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{girl.name}의 안부</Text>
          <Text style={styles.sub}>
            {hour === null
              ? '받지 않음'
              : `매일 ${hour}시, ${withParticle(girl.name, '이가')} 한 마디 보내요`}
          </Text>
        </View>
        <Switch
          value={hour !== null}
          onValueChange={(on) => change(on ? DEFAULT_NUDGE_HOUR : null)}
          trackColor={{ true: colors.accent, false: colors.faint }}
        />
      </View>

      {hour !== null && (
        <View style={styles.row}>
          {HOURS.map((h) => (
            <Pressable
              key={h}
              style={[styles.chip, hour === h && styles.chipOn]}
              onPress={() => change(h)}>
              <Text style={[styles.chipText, hour === h && styles.chipTextOn]}>{h}시</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/*
        Quiet hours cover the messages she starts. The rest timer is left out
        on purpose: that bell was set a minute earlier by someone standing in
        a gym, and silencing an alarm you just asked for is the app deciding
        it knows better.
      */}
      <View style={styles.quiet}>
        <View style={styles.quietHead}>
          <Ionicons name="moon-outline" size={16} color={colors.textDim} />
          <Text style={styles.quietTitle}>방해 금지</Text>
          <Switch
            value={quiet !== null}
            onValueChange={(on) =>
              changeQuiet(on ? [DEFAULT_QUIET_FROM, DEFAULT_QUIET_TO] : null)
            }
            trackColor={{ true: colors.accent, false: colors.faint }}
          />
        </View>

        {quiet && (
          <>
            <Text style={styles.quietSub}>
              {quiet[0]}시부터 {quiet[1]}시까지는 {withParticle(girl.name, '이가')} 말을 걸지 않아요.
            </Text>
            <View style={styles.row}>
              {QUIET_WINDOWS.map(([from, to]) => {
                const on = quiet[0] === from && quiet[1] === to;
                return (
                  <Pressable
                    key={`${from}-${to}`}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => changeQuiet([from, to])}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {from}–{to}시
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {silenced && (
          <Text style={styles.warn}>
            {hour}시는 방해 금지 시간이라, 안부는 {quiet![1]}시에 와요.
          </Text>
        )}
      </View>

      {Platform.OS === 'web' && (
        <Text style={styles.note}>알림은 폰에서만 와요.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  sub: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textDim },
  chipTextOn: { color: colors.accent, fontWeight: '700' },
  quiet: {
    borderTopColor: colors.faint,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  quietHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quietTitle: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  quietSub: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  warn: { color: colors.accent, fontSize: 12, lineHeight: 18 },
  note: { color: colors.textDim, fontSize: 11 },
});
