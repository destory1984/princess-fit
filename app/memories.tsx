import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Scroll } from '@/components/Scroll';
import { ScreenState } from '@/components/ScreenState';
import { getBond, type Bond } from '@/lib/db';
import { STAGE_NAME } from '@/lib/companion';
import { formatDate } from '@/lib/format';
import { withParticle } from '@/lib/korean';
import { colors, paper, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';

/**
 * 「함께한 날들」. Only what has happened: no locked slots, no count of how
 * many there are to find. 「3/12」 says nine more exist, and the moment it
 * says that the page becomes a checklist people work through — the thing
 * docs/companion.md exists to avoid.
 */
export default function MemoriesScreen() {
  const girl = useGirl();
  const [bond, setBond] = useState<Bond | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getBond(girl.id)
      .then(setBond)
      .catch((e) => setError(e.message));
  }, [girl.id]);

  useFocusEffect(load);

  if (!bond) return <ScreenState error={error} onRetry={load} />;

  // Newest first: the page is read to see what happened lately, and the
  // first day is always there at the bottom to come back to.
  const newestFirst = [...bond.memories].reverse();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Scroll>
        <View style={styles.head}>
          <Text style={styles.days}>{bond.days}일</Text>
          <Text style={styles.sub}>
            {withParticle(girl.name, '와과')} 함께한 날 · {STAGE_NAME[bond.stage]}
          </Text>
        </View>
      </Scroll>

      {newestFirst.length > 0 && (
        <Scroll title="기억">
          {newestFirst.map((m) => (
            <View key={m.kind} style={styles.row}>
              <Text style={styles.date}>{formatDate(`${m.day}T00:00:00`)}</Text>
              <Text style={styles.line}>{m.line}</Text>
            </View>
          ))}
        </Scroll>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  head: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  days: { fontSize: 36, fontWeight: '700', color: paper.ink },
  sub: { fontSize: 14, color: colors.textDim },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  date: { width: 84, fontSize: 13, color: colors.textDim, fontVariant: ['tabular-nums'] },
  line: { flex: 1, fontSize: 15, color: colors.text },
});
