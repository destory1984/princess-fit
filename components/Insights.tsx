import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { insightsFor, MIN_WORKOUTS, type Insight } from '@/lib/insight';
import type { WorkoutFact } from '@/lib/gamification';
import { colors, paper, radius, spacing } from '@/lib/theme';

type Props = {
  workouts: WorkoutFact[];
  /** Show at most this many, best first. */
  limit?: number;
};

/**
 * What the numbers add up to, in sentences.
 *
 * Charts say what happened; they do not say that you have not touched your
 * back in three weeks. Things to change are listed before things going well,
 * because the first is why you opened this screen.
 */
export function Insights({ workouts, limit = 3 }: Props) {
  const all = insightsFor(workouts);

  if (all.length === 0) {
    return (
      <View style={styles.quiet}>
        <Text style={styles.quietText}>
          {workouts.length < MIN_WORKOUTS
            ? `운동을 ${MIN_WORKOUTS}번쯤 하면, 무엇을 잘하고 무엇이 모자란지 여기서 짚어드려요.`
            : '지금은 딱히 고칠 데가 없어요. 하던 대로 하시면 돼요.'}
        </Text>
      </View>
    );
  }

  // Watch first: the thing to change is why this screen gets opened.
  const ordered = [...all].sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'watch' ? -1 : 1));

  return (
    <View style={styles.wrap}>
      {ordered.slice(0, limit).map((insight) => (
        <Row key={insight.id} insight={insight} />
      ))}
    </View>
  );
}

function Row({ insight }: { insight: Insight }) {
  const watch = insight.tone === 'watch';
  return (
    <View style={[styles.card, watch ? styles.watch : styles.good]}>
      <Ionicons
        name={watch ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={18}
        color={watch ? colors.accent : colors.success}
      />
      <View style={styles.body}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.detail}>{insight.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  watch: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  good: { backgroundColor: paper.bgAlt, borderColor: colors.gold },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  detail: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  quiet: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.faint,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  quietText: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
