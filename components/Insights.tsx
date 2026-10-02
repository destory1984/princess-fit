import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { insightsFor, MIN_WORKOUTS, type Insight } from '@/lib/insight';
import type { WorkoutFact } from '@/lib/gamification';
import type { Goal } from '@/lib/onboarding';
import { rankByGoal, watchingWord } from '@/lib/plan';
import { getGoal } from '@/lib/prefs';
import type { Stage } from '@/lib/companion';
import { getBond } from '@/lib/db';
import { colors, paper, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';

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
 *
 * What you said you came for decides which of them goes first — she promised
 * as much while asking. It changes the order and nothing else: the findings
 * are the same, and so is every word of them.
 */
export function Insights({ workouts, limit = 3 }: Props) {
  const girl = useGirl();
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    let alive = true;
    getGoal().then((stored) => alive && stored && setGoal(stored));
    return () => {
      alive = false;
    };
  }, []);

  // How close the two of them are, because one of the girls speaks by it.
  // Until it answers she uses the first stage's words.
  const [stage, setStage] = useState<Stage>('new');
  useEffect(() => {
    let alive = true;
    getBond(girl.id)
      .then((bond) => alive && setStage(bond.stage))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [girl.id]);

  const all = insightsFor(workouts, undefined, girl.id, stage);
  const watching = watchingWord(goal);

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

  // Watch first: the thing to change is why this screen gets opened. Within
  // that, whatever the stated goal cares about most.
  const byGoal = rankByGoal(all, goal);
  const ordered = [...byGoal].sort((a, b) =>
    a.tone === b.tone ? 0 : a.tone === 'watch' ? -1 : 1
  );

  return (
    <View style={styles.wrap}>
      {/* Said out loud, because a list that quietly rearranges itself is
          worse than one that never changed. */}
      {watching && <Text style={styles.watching}>{watching}</Text>}
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
  watching: { color: colors.textDim, fontSize: 11, lineHeight: 17, paddingHorizontal: 2 },
  quiet: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.faint,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  quietText: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
