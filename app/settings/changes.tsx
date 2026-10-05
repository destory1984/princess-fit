import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BEGUN, CHANGELOG, dayOfMaking } from '@/lib/changelog';
import { colors, radius, spacing } from '@/lib/theme';
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

// A hundred lines at a time. The list only grows, and nobody opening it wants
// the first week of the app before they have read this week.
const PAGE = 100;

const LINES = CHANGELOG.flatMap((entry) =>
  entry.changes.map((line, i) => ({ entry, line, i })),
);

/**
 * What changed, day by day, newest first (lib/changelog.ts).
 *
 * The date stands in the margin beside the first line of its day only, so a
 * long day reads as one block and the eye finds where the next one starts.
 */
export default function ChangesScreen() {
  // Read once per mount; the screen is not open across midnight often enough to matter.
  const today = new Date();
  const [shown, setShown] = useState(PAGE);
  const left = LINES.length - shown;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        버전 {APP_VERSION} · {longDay(CHANGELOG[0].day)}
      </Text>
      <Text style={styles.sub}>
        만들기 시작한 날: {longDay(BEGUN)} · 오늘로 {dayOfMaking(today)}일째
      </Text>

      <View style={styles.list}>
        {LINES.slice(0, shown).map(({ entry, line, i }, at) => (
          <View key={`${entry.day}-${i}`} style={styles.row}>
            <View style={styles.margin}>
              {/* A day cut by the page break gets its date again where it resumes. */}
              {(i === 0 || at === 0) && <Text style={styles.day}>{shortDay(entry.day)}</Text>}
              {i === 0 && entry.version ? (
                <Text style={styles.version}>{entry.version}</Text>
              ) : null}
            </View>
            <Text style={styles.line}>{line}</Text>
          </View>
        ))}
      </View>

      {left > 0 && (
        <Pressable style={styles.more} onPress={() => setShown(shown + PAGE)}>
          <Text style={styles.moreText}>계속 읽기</Text>
          <Text style={styles.moreSub}>{left}줄 남았어요</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  lead: { color: colors.text, fontSize: 15, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 13, lineHeight: 20, marginTop: 2 },
  list: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  margin: { width: 44 },
  day: { color: colors.accent, fontSize: 15, fontWeight: '800', lineHeight: 23 },
  version: { color: colors.textDim, fontSize: 11, fontWeight: '700' },
  // One size under the rest of the app: this is a long list to be skimmed.
  line: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 23 },
  more: {
    marginTop: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  moreText: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  moreSub: { color: colors.textDim, fontSize: 14 },
});
