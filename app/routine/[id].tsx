import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BodyMap, regionsOf } from '@/components/BodyMap';
import { ExercisePicker } from '@/components/ExercisePicker';
import { MuscleTag } from '@/components/MuscleTag';
import { confirmAction, notify } from '@/lib/confirm';
import {
  addRoutineExercise,
  getRoutine,
  listExercises,
  listRoutineExercises,
  removeRoutineExercise,
  updateRoutineExercise,
} from '@/lib/db';
import type { Exercise, Routine, RoutineExercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [items, setItems] = useState<RoutineExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [picking, setPicking] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([getRoutine(id), listRoutineExercises(id), listExercises()])
      .then(([r, re, ex]) => {
        setRoutine(r);
        setItems(re);
        setExercises(ex);
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, [id]);

  useFocusEffect(load);

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseName = (exerciseId: string) => byId.get(exerciseId)?.name ?? '삭제된 종목';

  const worked = useMemo(
    () => regionsOf(items.flatMap((i) => byId.get(i.exercise_id) ?? [])),
    [items, byId]
  );

  async function add(exerciseId: string) {
    if (!id) return;
    try {
      const created = await addRoutineExercise(id, exerciseId, items.length);
      setItems((prev) => [...prev, created]);
    } catch (e: any) {
      notify('추가 실패', e.message);
    }
  }

  async function adjust(item: RoutineExercise, field: 'target_sets' | 'target_reps', delta: number) {
    const next = Math.max(1, item[field] + delta);
    if (next === item[field]) return;
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, [field]: next } : x)));
    try {
      await updateRoutineExercise(item.id, { [field]: next });
    } catch (e: any) {
      notify('저장 실패', e.message);
      load();
    }
  }

  function remove(item: RoutineExercise) {
    confirmAction('종목 제거', `"${exerciseName(item.exercise_id)}"을 루틴에서 뺄까요?`, async () => {
      try {
        await removeRoutineExercise(item.id);
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      } catch (e: any) {
        notify('삭제 실패', e.message);
      }
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{routine?.name ?? ''}</Text>

        <View style={styles.bodyCard}>
          <BodyMap primary={worked.primary} secondary={worked.secondary} height={240} />
          <Text style={styles.bodyCaption}>
            {worked.primary.size === 0
              ? '종목을 담으면 어느 부위를 쓰는지 표시돼요.'
              : `이 루틴이 쓰는 부위 · ${[...worked.primary].join(', ')}`}
          </Text>
        </View>

        <Text style={styles.hint}>종목을 길게 누르면 뺄 수 있어요.</Text>

        {items.length === 0 ? (
          <Text style={styles.empty}>아직 종목이 없어요.</Text>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} style={styles.row} onLongPress={() => remove(item)}>
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle}>{exerciseName(item.exercise_id)}</Text>
                <MuscleTag group={byId.get(item.exercise_id)?.muscle_group ?? '기타'} />
              </View>
              {byId.get(item.exercise_id)?.muscle_detail ? (
                <Text style={styles.rowSub}>
                  {byId.get(item.exercise_id)!.muscle_detail}
                  {' · '}
                  {byId.get(item.exercise_id)!.equipment}
                </Text>
              ) : null}
              <View style={styles.stepperRow}>
                <Stepper
                  label="세트"
                  value={item.target_sets}
                  onChange={(d) => adjust(item, 'target_sets', d)}
                />
                <Stepper
                  label="회"
                  value={item.target_reps}
                  onChange={(d) => adjust(item, 'target_reps', d)}
                />
              </View>
            </Pressable>
          ))
        )}

        <Pressable style={styles.secondary} onPress={() => setPicking(true)}>
          <Text style={styles.secondaryText}>+ 종목 추가</Text>
        </Pressable>
      </ScrollView>

      <ExercisePicker
        visible={picking}
        exercises={exercises}
        onSelect={(e) => add(e.id)}
        onClose={() => setPicking(false)}
        onSeeded={load}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepButton} onPress={() => onChange(-1)} hitSlop={6}>
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>
        {value}
        <Text style={styles.stepLabel}>{label}</Text>
      </Text>
      <Pressable style={styles.stepButton} onPress={() => onChange(1)} hitSlop={6}>
        <Text style={styles.stepButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  bodyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  bodyCaption: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  hint: { color: colors.textDim, fontSize: 12, marginTop: spacing.md },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { color: colors.textDim, paddingVertical: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textDim },
  stepperRow: { flexDirection: 'row', gap: spacing.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  stepButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  stepButtonText: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  stepValue: { color: colors.text, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  stepLabel: { color: colors.textDim, fontWeight: '400', fontSize: 12 },
  secondary: {
    marginTop: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '700' },
});
