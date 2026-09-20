import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { LineChart } from '@/components/LineChart';
import { Advisor } from '@/components/Advisor';
import { MuscleTag } from '@/components/MuscleTag';
import { OrnateFrame } from '@/components/OrnateFrame';
import { ScreenState } from '@/components/ScreenState';
import { explain } from '@/lib/dbError';
import { confirmAction, notify } from '@/lib/confirm';
import {
  clampRest,
  countExerciseSets,
  deleteExercise,
  estimateOneRm,
  getExerciseHistory,
  listExercises,
  REST_GRAIN,
  setExerciseFavourite,
  setExerciseHidden,
  setExerciseRest,
  type ExerciseHistoryPoint,
} from '@/lib/db';
import { coachTipOf, introOf } from '@/lib/exerciseCopy';
import { formatDate, formatDuration, formatKm } from '@/lib/format';
import { TRACK_TYPE_LABEL, type Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';
import { getPlace } from '@/lib/prefs';
import type { Place } from '@/lib/onboarding';
import { substitutesHere, substituteWord } from '@/lib/substitute';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const girl = useGirl();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  // The whole catalogue, kept so substitutes can be read off it without a
  // second round trip — the list is already being fetched to find this one.
  const [catalogue, setCatalogue] = useState<Exercise[]>([]);
  const [place, setPlaceState] = useState<Place | null>(null);
  const [metric, setMetric] = useState<'top' | 'onerm'>('top');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    Promise.all([listExercises(), getExerciseHistory(id)])
      .then(([list, points]) => {
        setExercise(list.find((e) => e.id === id) ?? null);
        setCatalogue(list);
        setHistory(points);
        // Only narrows where the substitutes are drawn from; the section is
        // correct without it, so it is never waited on.
        getPlace().then(setPlaceState).catch(() => {});
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useFocusEffect(load);

  function toggleFavourite() {
    if (!exercise) return;
    const next = !exercise.favourite;
    setExercise({ ...exercise, favourite: next });
    setExerciseFavourite(exercise.id, next).catch((e: any) => {
      notify('저장 실패', explain(e));
      load();
    });
  }

  function toggleHidden() {
    if (!exercise) return;
    const next = !exercise.hidden;
    // Starring and hiding are opposites, so the screen follows the same rule
    // the database does rather than showing a star on something put away.
    setExercise({ ...exercise, hidden: next, favourite: next ? false : exercise.favourite });
    setExerciseHidden(exercise.id, next).catch((e: any) => {
      notify('저장 실패', explain(e));
      load();
    });
  }

  function changeRest(delta: number) {
    if (!exercise) return;
    const next = clampRest(exercise.rest_sec + delta);
    setExercise({ ...exercise, rest_sec: next });
    setExerciseRest(exercise.id, next).catch((e: any) => {
      notify('저장 실패', explain(e));
      load();
    });
  }

  async function remove() {
    if (!exercise) return;
    let setCount = 0;
    try {
      setCount = await countExerciseSets(exercise.id);
    } catch (e: any) {
      notify('확인 실패', explain(e));
      return;
    }
    const warning = setCount
      ? `\n\n되돌릴 수 없어요. 이 종목으로 기록한 ${setCount}개 세트도 함께 지워져요.`
      : '\n\n되돌릴 수 없어요.';
    confirmAction('종목 삭제', `"${exercise.name}"을 삭제할까요?${warning}`, async () => {
      try {
        await deleteExercise(exercise.id);
        router.back();
      } catch (e: any) {
        notify('삭제 실패', explain(e));
      }
    });
  }

  if (!exercise) return <ScreenState error={error} onRetry={load} />;

  const isCardio = exercise.track_type !== 'weight_reps';
  const best = Math.max(0, ...history.map((h) => h.max_weight));
  const bestOneRm = Math.max(
    0,
    ...history.flatMap((h) => h.sets.map((s) => estimateOneRm(s.weight_kg, s.reps)))
  );
  // Rows created before the how_to column exists come back without it.
  const steps = (exercise.how_to ?? '').split('\n').filter(Boolean);
  const alternatives = substitutesHere(exercise, catalogue, place);
  /*
    Two ways to read the same sessions, and they disagree on purpose.

    Top weight is what was on the bar. Estimated 1RM is what it was worth:
    60kg×5 followed by 57.5kg×10 draws a line going down and a lifter going
    up, and only one of those is true. Neither is right on its own — the plate
    line is what people recognise, the estimate is what they are actually
    asking about — so the chart says which one it is drawing and lets it be
    changed.

    Warm-ups are out of both, as they are out of the top weight above.
  */
  const points = history.map((h) => {
    const working = h.sets.filter((x) => !x.warmup);
    return {
      label: formatDate(h.date, 'short'),
      value: isCardio
        ? Math.round(h.durationSec / 60)
        : metric === 'top'
          ? h.max_weight
          : Math.max(0, ...working.map((x) => estimateOneRm(x.weight_kg, x.reps))),
    };
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OrnateFrame>
        <View style={styles.head}>
          <View style={styles.headBody}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.sub}>
              {exercise.muscle_detail || '근육 정보 없음'} · {exercise.equipment}
            </Text>
            <Text style={styles.sub}>기록 방식 · {TRACK_TYPE_LABEL[exercise.track_type]}</Text>
          </View>
          <MuscleTag group={exercise.muscle_group} />
          {/* Star it where you read about it, not only from the picker. */}
          <Pressable hitSlop={8} onPress={toggleFavourite}>
            <Ionicons
              name={exercise.favourite ? 'heart' : 'heart-outline'}
              size={22}
              color={exercise.favourite ? colors.accent : colors.faint}
            />
          </Pressable>
        </View>

        <View style={styles.body}>
          <BodyMap data={workedParts([exercise])} scale={0.5} labels={false} />
        </View>

        <Text style={styles.intro}>{introOf(exercise)}</Text>
      </OrnateFrame>

      <Advisor name={girl.name} portrait={girl.base}>{coachTipOf(exercise)}</Advisor>

      {steps.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>하는 법</Text>
          {steps.map((step, i) => (
            <View key={step} style={styles.step}>
              <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          <Text style={styles.caution}>아프면 멈추세요.</Text>
        </View>
      )}

      {/*
        Where to go when this one is not available — the machine taken, or the
        room simply without it. Placed above 쉬는 시간 because it answers a
        question asked standing in the gym, not one asked while planning.
      */}
      {alternatives.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>이게 안 되면</Text>
          {alternatives.map((alt) => (
            <Pressable
              key={alt.exercise.id}
              style={styles.altRow}
              onPress={() => router.push(`/exercise/${alt.exercise.id}`)}>
              <View style={styles.altText}>
                <Text style={styles.altName} numberOfLines={1}>
                  {alt.exercise.name}
                </Text>
                <Text style={styles.altWhy} numberOfLines={1}>
                  {substituteWord(alt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))}
        </View>
      )}

      {/*
        Rest length belongs to the exercise, so this is where it can be set
        without being mid-workout and under a running clock.
      */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>쉬는 시간</Text>
        <View style={styles.restRow}>
          <Text style={styles.restValue}>{exercise.rest_sec}초</Text>
          <View style={styles.restButtons}>
            <Pressable style={styles.restButton} onPress={() => changeRest(-REST_GRAIN)}>
              <Text style={styles.restButtonText}>−{REST_GRAIN}</Text>
            </Pressable>
            <Pressable style={styles.restButton} onPress={() => changeRest(REST_GRAIN)}>
              <Text style={styles.restButtonText}>+{REST_GRAIN}</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.caution}>세트를 마치면 이만큼 세고 알려드려요.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>내 기록</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>아직 이 종목으로 남긴 기록이 없어요.</Text>
        ) : (
          <>
            <View style={styles.statRow}>
              {isCardio ? (
                <>
                  <Stat
                    value={formatDuration(history.reduce((s, h) => s + h.durationSec, 0))}
                    label="누적 시간"
                  />
                  <Stat
                    value={`${formatKm(history.reduce((s, h) => s + h.distanceKm, 0))}km`}
                    label="누적 거리"
                  />
                  <Stat value={String(history.length)} label="수행 횟수" />
                </>
              ) : (
                <>
                  <Stat value={`${best}kg`} label="최고 무게" />
                  <Stat value={`${bestOneRm}kg`} label="예상 1RM" />
                  <Stat value={String(history.length)} label="수행 횟수" />
                </>
              )}
            </View>
            {!isCardio && (
              <View style={styles.metricRow}>
                {(
                  [
                    ['top', '최고 무게'],
                    ['onerm', '예상 1RM'],
                  ] as const
                ).map(([id, label]) => (
                  <Pressable
                    key={id}
                    style={[styles.metric, metric === id && styles.metricOn]}
                    onPress={() => setMetric(id)}>
                    <Text style={[styles.metricText, metric === id && styles.metricTextOn]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <LineChart points={points} unit={isCardio ? '분' : 'kg'} />
            {[...history].reverse().slice(0, 8).map((h) => (
              <View key={h.workout_id} style={styles.row}>
                <Text style={styles.rowDate}>{formatDate(h.date, 'short')}</Text>
                <Text style={styles.rowSets} numberOfLines={1}>
                  {isCardio
                    ? `${formatDuration(h.durationSec)}${h.distanceKm > 0 ? ` · ${formatKm(h.distanceKm)}km` : ''}`
                    : h.sets.map((s) => `${s.weight_kg}×${s.reps}`).join('  ')}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>

      {/*
        Offered above deleting, and on purpose. Someone who never wants to see
        a movement again reaches for the red thing, and the red thing takes
        their sets with it — 「이 종목은 다시 안 해요」 and 「이 종목을 한 적이
        없어요」 are not the same sentence. This is the one they meant.
      */}
      <Pressable style={styles.put} onPress={toggleHidden}>
        <Ionicons
          name={exercise.hidden ? 'eye-outline' : 'eye-off-outline'}
          size={16}
          color={colors.textDim}
        />
        <View style={styles.putBody}>
          <Text style={styles.putText}>
            {exercise.hidden ? '다시 목록에 올리기' : '목록에서 내려두기'}
          </Text>
          <Text style={styles.putSub}>
            {exercise.hidden
              ? '지금은 고를 때 안 보여요. 기록은 그대로 있어요.'
              : '기록은 그대로 두고, 고를 때만 안 보이게 해요.'}
          </Text>
        </View>
      </Pressable>

      <Pressable style={styles.delete} onPress={remove}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={styles.deleteText}>이 종목 삭제</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  restRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  restValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
  restButtons: { flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto' },
  restButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  restButtonText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headBody: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 12 },
  body: { marginTop: spacing.md },
  intro: { color: colors.text, fontSize: 14, lineHeight: 22, marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  step: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  stepNum: { color: colors.accent, fontSize: 13, fontWeight: '800', width: 22 },
  stepText: { color: colors.text, fontSize: 14, lineHeight: 21, flex: 1 },
  caution: { color: colors.textDim, fontSize: 11, lineHeight: 17, marginTop: spacing.sm },
  empty: { color: colors.textDim },
  metricRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  metric: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  metricOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  metricText: { color: colors.textDim, fontSize: 12 },
  metricTextOn: { color: colors.accent, fontWeight: '700' },
  put: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  putBody: { flex: 1, gap: 2 },
  putText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  putSub: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  altText: { flex: 1 },
  altName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  altWhy: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  rowDate: { color: colors.textDim, width: 44, fontSize: 13 },
  rowSets: { color: colors.text, flex: 1, fontSize: 13 },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  deleteText: { color: colors.danger, fontWeight: '700' },
});
