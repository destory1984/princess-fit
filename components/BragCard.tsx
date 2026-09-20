import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { OrnateFrame } from '@/components/OrnateFrame';
import type { WorkoutDetailExercise } from '@/lib/db';
import { workoutGold } from '@/lib/economy';
import { formatDate, formatDuration } from '@/lib/format';
import { workoutXp, type summarise, type WorkoutFact } from '@/lib/gamification';
import type { Workout } from '@/lib/types';
import { colors, spacing } from '@/lib/theme';

const CHEERS = ['오늘도 해냈다', '어제의 나를 이겼다', '기록은 거짓말을 안 한다', '한 칸 더 올라감'];

type Props = {
  workout: Workout;
  items: WorkoutDetailExercise[];
  fact: WorkoutFact;
  summary: ReturnType<typeof summarise>;
};

/**
 * What a finished workout turns into — the thing that gets screenshotted.
 *
 * It takes a ref because the capture needs a handle on exactly this box and
 * nothing around it, and it is a component of its own so it can be looked at
 * on the bench without finishing a workout first.
 */
export const BragCard = forwardRef<View, Props>(function BragCard(
  { workout, items, fact, summary },
  ref
) {
  const worked = workedParts(items.flatMap((i) => i.exercise ?? []));
  const doneSets = items.reduce((sum, i) => sum + i.sets.filter((s) => s.done).length, 0);
  // A session written down after the fact has no length. Rounding that up to
  // one minute would put the only number nobody recorded on the card people
  // share, so it says so instead.
  const span = workout.ended_at
    ? +new Date(workout.ended_at) - +new Date(workout.started_at)
    : 0;
  const minutes = span >= 60000 ? Math.round(span / 60000) : null;
  const cheer = CHEERS[new Date(workout.started_at).getDate() % CHEERS.length];
  const best = items
    .filter((i) => i.topWeight > 0)
    .sort((a, b) => b.estimatedOneRm - a.estimatedOneRm)[0];

  return (
    <View ref={ref} collapsable={false}>
      <OrnateFrame style={styles.card}>
        <Text style={styles.date}>{formatDate(workout.started_at)}</Text>
        <Text style={styles.cheer}>💪 {cheer}</Text>
        <Text style={styles.title}>{workout.title}</Text>

        <View style={styles.statRow}>
          <Stat value={fact.volume.toLocaleString()} unit="kg" label="총 무게" />
          <Stat value={String(doneSets)} unit="세트" label="완료" />
          <Stat
            value={minutes === null ? '—' : String(minutes)}
            unit={minutes === null ? '' : '분'}
            label="걸린 시간"
          />
        </View>

        {worked.length > 0 && (
          <View style={styles.body}>
            <BodyMap data={worked} scale={0.62} labels={false} />
          </View>
        )}

        <View style={styles.badgeRow}>
          <Pill icon="flash" text={`+${workoutXp(fact)} XP`} tint={colors.accent} />
          <Pill icon="ellipse" text={`+${workoutGold(fact)} G`} tint={colors.gold} />
          <Pill
            icon="ribbon"
            text={`Lv.${summary.level} ${summary.title}`}
            tint={colors.success}
          />
          {summary.streak > 1 && (
            <Pill icon="flame" text={`${summary.streak}일 연속`} tint={colors.danger} />
          )}
        </View>

        {best && (
          <Text style={styles.highlight}>
            오늘의 한 방 · {best.exercise?.name} {best.topWeight}kg (예상 1RM{' '}
            {best.estimatedOneRm}kg)
          </Text>
        )}
        {fact.durationSec > 0 && (
          <Text style={styles.highlight}>
            유산소 {formatDuration(fact.durationSec)}
            {fact.distanceKm > 0 && ` · ${fact.distanceKm}km`}
          </Text>
        )}

        <Text style={styles.brand}>Refit</Text>
      </OrnateFrame>
    </View>
  );
});

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Pill({ icon, text, tint }: { icon: string; text: string; tint: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${tint}26`, borderColor: `${tint}66` }]}>
      <Ionicons name={icon as any} size={13} color={tint} />
      <Text style={[styles.pillText, { color: tint }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  date: { color: colors.textDim, fontSize: 13 },
  cheer: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '800' },
  statUnit: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  body: { marginVertical: spacing.md },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  highlight: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  brand: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
});
