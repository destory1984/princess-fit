import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { localDayKey } from '@/lib/format';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  month: Date;
  markedDays: Set<string>;
  /**
   * Muscle groups trained on each day. The dot takes the colour of the first
   * one, so a month reads as a pattern — three weeks of chest look like three
   * weeks of one colour — rather than as identical marks.
   */
  dayGroups?: Map<string, string[]>;
  selected: string | null;
  onSelect: (day: string) => void;
  onShiftMonth: (delta: number) => void;
};

export function MonthCalendar({
  month,
  markedDays,
  dayGroups,
  selected,
  onSelect,
  onShiftMonth,
}: Props) {
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const today = localDayKey(new Date());

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {/* A year back is twelve taps otherwise. */}
        <View style={styles.nav}>
          <Pressable hitSlop={6} onPress={() => onShiftMonth(-12)} accessibilityLabel="1년 전">
            <Ionicons name="play-back-outline" size={18} color={colors.textDim} />
          </Pressable>
          <Pressable hitSlop={6} onPress={() => onShiftMonth(-1)} accessibilityLabel="한 달 전">
            <Ionicons name="chevron-back" size={20} color={colors.textDim} />
          </Pressable>
        </View>
        <Text style={styles.title}>
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </Text>
        <View style={styles.nav}>
          <Pressable hitSlop={6} onPress={() => onShiftMonth(1)} accessibilityLabel="한 달 뒤">
            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
          </Pressable>
          <Pressable hitSlop={6} onPress={() => onShiftMonth(12)} accessibilityLabel="1년 뒤">
            <Ionicons name="play-forward-outline" size={18} color={colors.textDim} />
          </Pressable>
        </View>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((w, i) => (
          <Text key={w} style={[styles.weekday, i === 0 && styles.sun, i === 6 && styles.sat]}>
            {w}
          </Text>
        ))}
      </View>

      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={styles.week}>
          {cells.slice(row * 7, row * 7 + 7).map((d) => {
            const key = localDayKey(d);
            const outside = d.getMonth() !== month.getMonth();
            const marked = markedDays.has(key);
            return (
              <Pressable
                key={key}
                style={styles.cell}
                // An empty past day is where a forgotten session gets written
                // down, so it opens too. Only days to come stay shut.
                disabled={key > today}
                onPress={() => onSelect(key)}>
                <View style={[styles.dayWrap, selected === key && styles.dayWrapOn]}>
                  <Text
                    style={[
                      styles.day,
                      outside && styles.outside,
                      key === today && styles.today,
                      d.getDay() === 0 && !outside && styles.sun,
                      d.getDay() === 6 && !outside && styles.sat,
                    ]}>
                    {d.getDate()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    marked && !outside && styles.dotOn,
                    marked &&
                      !outside &&
                      dayGroups?.get(key)?.[0] && {
                        backgroundColor: muscleColor(dayGroups.get(key)![0]),
                      },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textDim,
    fontSize: 14,
    paddingBottom: spacing.sm,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayWrapOn: { backgroundColor: colors.accentSoft },
  day: { color: colors.text, fontSize: 16 },
  outside: { color: colors.faint },
  today: { fontWeight: '800' },
  sun: { color: colors.danger },
  sat: { color: colors.accent },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.danger },
});
