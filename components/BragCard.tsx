import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { OrnateFrame } from '@/components/OrnateFrame';
import { PaperDoll } from '@/components/PaperDoll';
import { useGirl } from '@/lib/girl';
import type { WorkoutDetailExercise } from '@/lib/db';
import { DEFAULT_REST_SEC } from '@/lib/db';
import { workoutGold } from '@/lib/economy';
import { estimatedMinutes, estimatedSeconds } from '@/lib/duration';
import { formatDate, formatDuration, formatKm } from '@/lib/format';
import { isEmptyWorkout, workoutXp, type summarise, type WorkoutFact } from '@/lib/gamification';
import type { Workout } from '@/lib/types';
import { colors, spacing } from '@/lib/theme';

const CHEERS = ['오늘도 해냈다', '어제의 나를 이겼다', '기록은 거짓말을 안 한다', '한 칸 더 올라감'];

type Props = {
  workout: Workout;
  items: WorkoutDetailExercise[];
  fact: WorkoutFact;
  summary: ReturnType<typeof summarise>;
  /** What she has on, so the card shows the girl as she is today. */
  worn?: string[];
  /** The first session there has ever been. */
  first?: boolean;
};

/**
 * What a finished workout turns into — the thing that gets screenshotted.
 *
 * It takes a ref because the capture needs a handle on exactly this box and
 * nothing around it, and it is a component of its own so it can be looked at
 * on the bench without finishing a workout first.
 */
export const BragCard = forwardRef<View, Props>(function BragCard(
  { workout, items, fact, summary, worn = [], first = false },
  ref
) {
  const girl = useGirl();
  const worked = workedParts(items.flatMap((i) => i.exercise ?? []));
  const doneSets = items.reduce((sum, i) => sum + i.sets.filter((s) => s.done).length, 0);
  // A session written down after the fact has no length. Rounding that up to
  // one minute would put the only number nobody recorded on the card people
  // share, so it says so instead.
  const span = workout.ended_at
    ? +new Date(workout.ended_at) - +new Date(workout.started_at)
    : 0;
  /*
    A session left open all afternoon is not an eight-hour workout.

    487분 appeared on a card for eight sets, because the finish button was
    pressed hours after the last one. The honest answer to how long it took is
    that nobody recorded it, which is the same thing a backdated entry says —
    so it says that, rather than putting a number nobody would recognise on
    the thing people screenshot.
  */
  const ABSURD_MS = 4 * 60 * 60 * 1000;
  const minutes = span >= 60000 && span < ABSURD_MS ? Math.round(span / 60000) : null;

  /*
    When the real length is gone, an estimate rather than a blank.

    「—」 was the first answer to 487분, and it earned 「걸린 시간은 여전히 - 네」
    — which is fair. The card went from a figure nobody recognised to no
    figure at all. Reckoned from the sets and the rest each movement is set
    to, and labelled 약, because an estimate that does not say so is a claim.
  */
  const restOf = (exerciseId: string) =>
    items.find((i) => i.exercise_id === exerciseId)?.exercise?.rest_sec ?? DEFAULT_REST_SEC;
  const reckoned =
    minutes === null
      ? estimatedMinutes(
          estimatedSeconds(
            items.flatMap((i) => i.sets.filter((s) => s.done)),
            restOf
          )
        )
      : null;
  /*
    One phrase per movement, in the order they were done.

    Cardio counts in minutes and weights in sets, because that is how each is
    remembered — 「러닝 30분」 and 「덤벨 컬 3세트」, never the other way round.
    Movements with nothing finished are left out: a card is a record of what
    happened, not of what was planned.
  */
  const didWhat = items
    .map((item) => {
      const done = item.sets.filter((s) => s.done);
      if (done.length === 0) return null;
      const name = item.exercise?.name ?? '삭제된 종목';
      const seconds = done.reduce((sum, s) => sum + s.duration_sec, 0);
      return seconds > 0 ? `${name} ${Math.round(seconds / 60)}분` : `${name} ${done.length}세트`;
    })
    .filter((line): line is string => line !== null);

  // Nothing done is not a win over yesterday, so it is not called one.
  const empty = isEmptyWorkout(fact);
  // Nor is the first day: there was no yesterday to beat, and no 「오늘도」.
  const cheer = empty
    ? '적힌 세트가 없어요'
    : first
    ? '첫 기록을 남겼다'
    : CHEERS[new Date(workout.started_at).getDate() % CHEERS.length];
  const best = items
    .filter((i) => i.topWeight > 0)
    .sort((a, b) => b.estimatedOneRm - a.estimatedOneRm)[0];

  return (
    <View ref={ref} collapsable={false}>
      <OrnateFrame style={styles.card}>
        {/*
          She stands in the corner. A card of numbers looks like every other
          fitness app's; the girl is what makes it this one, and what a friend
          who sees it would ask about.
        */}
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.date}>{formatDate(workout.started_at)}</Text>
            <Text style={styles.cheer}>{empty ? cheer : `💪 ${cheer}`}</Text>
            <Text style={styles.title}>{workout.title}</Text>
          </View>
          <View style={styles.girl}>
            <PaperDoll worn={worn} style={styles.doll} />
            <Text style={styles.girlName}>{girl.name}</Text>
          </View>
        </View>

        {/*
          What was actually done. The card had the weight, the sets, the
          minutes and a body map, and no way to answer 「뭐 한거야」 — the one
          thing the person remembers doing. Names first, counts after, in the
          order they were done.
        */}
        {didWhat.length > 0 && (
          <Text style={styles.did} numberOfLines={3}>
            {didWhat.join(' · ')}
          </Text>
        )}

        <View style={styles.statRow}>
          <Stat value={fact.volume.toLocaleString()} unit="kg" label="총 무게" />
          <Stat value={String(doneSets)} unit="세트" label="완료" />
          <Stat
            value={
              minutes !== null ? String(minutes) : reckoned !== null ? `약 ${reckoned}` : '—'
            }
            unit={minutes !== null || reckoned !== null ? '분' : ''}
            label="걸린 시간"
          />
        </View>

        {worked.length > 0 && (
          <View style={styles.body}>
            <BodyMap data={worked} scale={0.62} labels={false} />
          </View>
        )}

        <View style={styles.badgeRow}>
          {!empty && (
            <>
              <Pill icon="flash" text={`+${workoutXp(fact)} XP`} tint={colors.accent} />
              <Pill icon="ellipse" text={`+${workoutGold(fact)} G`} tint={colors.gold} />
            </>
          )}
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
            {fact.distanceKm > 0 && ` · ${formatKm(fact.distanceKm)}km`}
          </Text>
        )}

        <Text style={styles.brand}>프린세스 핏</Text>
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
  head: { flexDirection: 'row', gap: spacing.sm },
  headText: { flex: 1 },
  girl: { alignItems: 'center' },
  doll: { width: 72 },
  girlName: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  date: { color: colors.textDim, fontSize: 13 },
  cheer: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '800' },
  statUnit: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  did: { color: colors.textDim, fontSize: 13, lineHeight: 20, marginTop: spacing.xs },
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
