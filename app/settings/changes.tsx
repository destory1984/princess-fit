import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BEGUN, CHANGELOG, dayOfMaking } from '@/lib/changelog';
import { colors, spacing } from '@/lib/theme';
import { APP_VERSION } from '@/lib/version';

function longDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 2026-10-05 → 10.5, the way a date is jotted in a margin. */
function shortDay(day: string) {
  const [, m, d] = day.split('-').map(Number);
  return `${m}.${d}`;
}

/**
 * What changed, day by day, newest first (lib/changelog.ts).
 *
 * The date stands in the margin beside the first line of its day only, so a
 * long day reads as one block and the eye finds where the next one starts.
 */
export default function ChangesScreen() {
  // Read once per mount; the screen is not open across midnight often enough to matter.
  const today = new Date();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        버전 {APP_VERSION} · {longDay(CHANGELOG[0].day)}
      </Text>
      <Text style={styles.sub}>
        만들기 시작한 날: {longDay(BEGUN)} · 오늘로 {dayOfMaking(today)}일째
      </Text>

      <View style={styles.list}>
        {CHANGELOG.flatMap((entry) =>
          entry.changes.map((line, i) => (
            <View key={`${entry.day}-${i}`} style={styles.row}>
              <View style={styles.margin}>
                {i === 0 && <Text style={styles.day}>{shortDay(entry.day)}</Text>}
                {i === 0 && entry.version ? (
                  <Text style={styles.version}>{entry.version}</Text>
                ) : null}
              </View>
              <Text style={styles.line}>{line}</Text>
            </View>
          )),
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  lead: { color: colors.text, fontSize: 15, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginTop: 2 },
  list: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  margin: { width: 44 },
  day: { color: colors.accent, fontSize: 14, fontWeight: '800', lineHeight: 21 },
  version: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  line: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 21 },
});
