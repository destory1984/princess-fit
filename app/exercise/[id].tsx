import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { LineChart } from '@/components/LineChart';
import { MuscleTag } from '@/components/MuscleTag';
import { OrnateFrame } from '@/components/OrnateFrame';
import { confirmAction, notify } from '@/lib/confirm';
import {
  countExerciseSets,
  deleteExercise,
  estimateOneRm,
  getExerciseHistory,
  listExercises,
  type ExerciseHistoryPoint,
} from '@/lib/db';
import { formatDate, formatDuration } from '@/lib/format';
import { TRACK_TYPE_LABEL, type Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([listExercises(), getExerciseHistory(id)])
      .then(([list, points]) => {
        setExercise(list.find((e) => e.id === id) ?? null);
        setHistory(points);
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, [id]);

  useFocusEffect(load);

  async function remove() {
    if (!exercise) return;
    let setCount = 0;
    try {
      setCount = await countExerciseSets(exercise.id);
    } catch (e: any) {
      notify('확인 실패', e.message);
      return;
    }
    const warning = setCount
      ? `\n\n이 종목으로 기록한 ${setCount}개 세트도 함께 지워지고 되돌릴 수 없어요.`
      : '';
    confirmAction('종목 삭제', `"${exercise.name}"을 삭제할까요?${warning}`, async () => {
      try {
        await deleteExercise(exercise.id);
        router.back();
      } catch (e: any) {
        notify('삭제 실패', e.message);
      }
    });
  }

  if (!exercise) return <View style={styles.screen} />;

  const isCardio = exercise.track_type !== 'weight_reps';
  const best = Math.max(0, ...history.map((h) => h.max_weight));
  const bestOneRm = Math.max(
    0,
    ...history.flatMap((h) => h.sets.map((s) => estimateOneRm(s.weight_kg, s.reps)))
  );
  const steps = exercise.how_to.split('\n').filter(Boolean);
  const points = history.map((h) => ({
    label: formatDate(h.date, 'short'),
    value: isCardio ? Math.round(h.durationSec / 60) : h.max_weight,
  }));

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
        </View>

        <View style={styles.body}>
          <BodyMap data={workedParts([exercise])} scale={0.5} labels={false} />
        </View>
      </OrnateFrame>

      {steps.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>하는 법</Text>
          {steps.map((step, i) => (
            <View key={step} style={styles.step}>
              <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          <Text style={styles.caution}>
            아프면 멈추세요. 무거운 복합 운동은 처음에 전문가에게 자세를 봐 달라고 하는 게 좋아요.
          </Text>
        </View>
      )}

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
                    value={`${history.reduce((s, h) => s + h.distanceKm, 0).toFixed(1)}km`}
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
            <LineChart points={points} unit={isCardio ? '분' : 'kg'} />
            {[...history].reverse().slice(0, 8).map((h) => (
              <View key={h.workout_id} style={styles.row}>
                <Text style={styles.rowDate}>{formatDate(h.date, 'short')}</Text>
                <Text style={styles.rowSets} numberOfLines={1}>
                  {isCardio
                    ? `${formatDuration(h.durationSec)}${h.distanceKm > 0 ? ` · ${h.distanceKm}km` : ''}`
                    : h.sets.map((s) => `${s.weight_kg}×${s.reps}`).join('  ')}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>

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
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headBody: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 12 },
  body: { marginTop: spacing.md },
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
