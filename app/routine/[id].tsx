import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { ExercisePicker } from '@/components/ExercisePicker';
import { MuscleTag } from '@/components/MuscleTag';
import { ScreenState } from '@/components/ScreenState';
import { explain } from '@/lib/dbError';
import { confirmAction, notify } from '@/lib/confirm';
import {
  addRoutineExercise,
  getActiveWorkout,
  getRoutine,
  listExercises,
  listRoutineExercises,
  removeRoutineExercise,
  renameRoutine,
  reorderRoutineExercises,
  startWorkout,
  updateRoutineExercise,
} from '@/lib/db';
import type { Exercise, Routine, RoutineExercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RoutineExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [picking, setPicking] = useState(false);
  // Null while not being edited, so a reload never overwrites typing.
  const [name, setName] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    Promise.all([getRoutine(id), listRoutineExercises(id), listExercises()])
      .then(([r, re, ex]) => {
        setRoutine(r);
        setItems(re);
        setExercises(ex);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useFocusEffect(load);

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseName = (exerciseId: string) => byId.get(exerciseId)?.name ?? '삭제된 종목';

  const routineExercises = useMemo(
    () => items.flatMap((i) => byId.get(i.exercise_id) ?? []),
    [items, byId]
  );
  const worked = useMemo(() => workedParts(routineExercises), [routineExercises]);
  const groups = useMemo(
    () => [...new Set(routineExercises.map((e) => e.muscle_group))],
    [routineExercises]
  );

  async function add(exerciseId: string) {
    if (!id) return;
    try {
      const created = await addRoutineExercise(id, exerciseId, items.length);
      setItems((prev) => [...prev, created]);
    } catch (e: any) {
      notify('추가 실패', explain(e));
    }
  }

  async function adjust(item: RoutineExercise, field: 'target_sets' | 'target_reps', delta: number) {
    const next = Math.max(1, item[field] + delta);
    if (next === item[field]) return;
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, [field]: next } : x)));
    try {
      await updateRoutineExercise(item.id, { [field]: next });
    } catch (e: any) {
      notify('저장 실패', explain(e));
      load();
    }
  }

  async function rename() {
    if (!routine || name === null) return;
    const next = name.trim();
    setName(null);
    // Emptied or unchanged: keep what was there rather than a nameless routine.
    if (!next || next === routine.name) return;
    setRoutine({ ...routine, name: next });
    try {
      await renameRoutine(routine.id, next);
    } catch (e: any) {
      notify('이름 저장 실패', explain(e));
      load();
    }
  }

  async function begin() {
    if (!id || !routine) return;
    try {
      const active = await getActiveWorkout();
      if (active) {
        router.push({ pathname: '/workout/[id]', params: { id: active.id } });
        return;
      }
      const created = await startWorkout(routine.name, id);
      router.replace({ pathname: '/workout/[id]', params: { id: created.id } });
    } catch (e: any) {
      notify('시작 실패', explain(e));
    }
  }

  async function move(index: number, delta: number) {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await reorderRoutineExercises(next.map((i) => i.id));
    } catch (e: any) {
      notify('순서 저장 실패', explain(e));
      load();
    }
  }

  function remove(item: RoutineExercise) {
    confirmAction('종목 제거', `"${exerciseName(item.exercise_id)}"을 루틴에서 뺄까요?`, async () => {
      try {
        await removeRoutineExercise(item.id);
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      } catch (e: any) {
        notify('삭제 실패', explain(e));
      }
    });
  }

  // Until the routine is known this screen would show a blank title over an
  // empty body map captioned "종목을 담으면…" — a routine full of exercises
  // announcing itself as empty for as long as the query takes.
  if (!routine) return <ScreenState error={error} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/*
          The name is the title itself, edited where it stands. Sessions
          already done keep the name they were done under.
        */}
        <View style={styles.titleRow}>
          <TextInput
            style={[styles.title, styles.titleInput]}
            value={name ?? routine.name}
            onChangeText={setName}
            onBlur={rename}
            onSubmitEditing={rename}
            returnKeyType="done"
            maxLength={40}
            accessibilityLabel="루틴 이름"
          />
          <Ionicons name="pencil" size={16} color={colors.textDim} />
        </View>

        <View style={styles.bodyCard}>
          <BodyMap data={worked} />
          <Text style={styles.bodyCaption}>
            {groups.length === 0
              ? '종목을 담으면 어느 부위를 쓰는지 표시돼요.'
              : `이 루틴이 쓰는 부위 · ${groups.join(', ')}`}
          </Text>
        </View>

        <Text style={styles.hint}>화살표로 순서를 바꾸고, 휴지통으로 뺄 수 있어요.</Text>

        {items.length === 0 ? (
          <Text style={styles.empty}>아직 종목이 없어요.</Text>
        ) : (
          items.map((item, index) => (
            <Pressable key={item.id} style={styles.row} onLongPress={() => remove(item)}>
              <View style={styles.rowHead}>
                <Text style={styles.rowOrder}>{index + 1}</Text>
                <Text style={styles.rowTitle}>{exerciseName(item.exercise_id)}</Text>
                <View style={styles.rowHeadEnd}>
                  <Pressable
                    hitSlop={6}
                    disabled={index === 0}
                    onPress={() => move(index, -1)}>
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={index === 0 ? colors.border : colors.textDim}
                    />
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    disabled={index === items.length - 1}
                    onPress={() => move(index, 1)}>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={index === items.length - 1 ? colors.border : colors.textDim}
                    />
                  </Pressable>
                  <MuscleTag group={byId.get(item.exercise_id)?.muscle_group ?? '기타'} />
                  <Pressable hitSlop={8} onPress={() => remove(item)}>
                    <Ionicons name="trash-outline" size={18} color={colors.textDim} />
                  </Pressable>
                </View>
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

      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.start} onPress={begin}>
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={styles.startText}>이 루틴으로 시작하기</Text>
          </Pressable>
        </View>
      )}

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
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 96 },
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  start: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  startText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleInput: { flex: 1, padding: 0 },
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
  rowHeadEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  empty: { color: colors.textDim, paddingVertical: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  rowOrder: { color: colors.textDim, fontSize: 13, fontWeight: '800', width: 16 },
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
