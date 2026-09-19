import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { notify } from '@/lib/confirm';
import { cancelDailyMessage } from '@/lib/notify';
import { DEFAULT_NUDGE_HOUR, getNudgeHour, setNudgeHour } from '@/lib/prefs';
import { colors, radius, spacing } from '@/lib/theme';

/** Hours worth offering. A nudge at 3am helps nobody. */
const HOURS = [8, 12, 18, 20, 22];

/** Whether she sends her one message a day, and when. */
export function NudgeSetting() {
  const [hour, setHour] = useState<number | null>(DEFAULT_NUDGE_HOUR);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getNudgeHour().then((h) => alive && setHour(h));
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
      notify('저장 실패', e.message);
      setHour(previous);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>리나의 안부</Text>
          <Text style={styles.sub}>
            {hour === null
              ? '받지 않음'
              : `매일 ${hour}시, 리나가 한 마디 보내요`}
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
  note: { color: colors.textDim, fontSize: 11 },
});
