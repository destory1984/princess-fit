import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { notify } from '@/lib/confirm';
import {
  addWorkoutSet,
  deleteWorkoutSet,
  finishWorkout,
  getWorkout,
  listExercises,
  listWorkoutSets,
  updateWorkoutSet,
} from '@/lib/db';
import type { Exercise, Workout, WorkoutSet } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [picking, setPicking] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([getWorkout(id), listWorkoutSets(id), listExercises()])
      .then(([w, s, e]) => {
        setWorkout(w);
        setSets(s);
        setExercises(e);
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, [id]);

  useFocusEffect(load);

  const exerciseName = useMemo(() => {
    const map = new Map(exercises.map((e) => [e.id, e.name]));
    return (exerciseId: string) => map.get(exerciseId) ?? '삭제된 종목';
  }, [exercises]);

  const grouped = useMemo(() => {
    const byExercise = new Map<string, WorkoutSet[]>();
    for (const s of sets) {
      const list = byExercise.get(s.exercise_id) ?? [];
      list.push(s);
      byExercise.set(s.exercise_id, list);
    }
    return [...byExercise.entries()].map(([exerciseId, list]) => ({
      exerciseId,
      sets: [...list].sort((a, b) => a.set_no - b.set_no),
    }));
  }, [sets]);

  const totalVolume = sets
    .filter((s) => s.done)
    .reduce((sum, s) => sum + s.weight_kg * s.reps, 0);

  function patchLocal(setId: string, patch: Partial<WorkoutSet>) {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)));
  }

  async function persist(setId: string, patch: Partial<WorkoutSet>) {
    patchLocal(setId, patch);
    try {
      await updateWorkoutSet(setId, patch);
    } catch (e: any) {
      notify('저장 실패', e.message);
      load();
    }
  }

  async function addSet(exerciseId: string) {
    if (!id) return;
    const existing = sets.filter((s) => s.exercise_id === exerciseId);
    const last = existing[existing.length - 1];
    try {
      const created = await addWorkoutSet(
        id,
        exerciseId,
        existing.length + 1,
        last?.weight_kg ?? 0,
        last?.reps ?? 10
      );
      setSets((prev) => [...prev, created]);
    } catch (e: any) {
      notify('세트 추가 실패', e.message);
    }
  }

  async function removeSet(setId: string) {
    try {
      await deleteWorkoutSet(setId);
      setSets((prev) => prev.filter((s) => s.id !== setId));
    } catch (e: any) {
      notify('삭제 실패', e.message);
    }
  }

  async function finish() {
    if (!id) return;
    try {
      await finishWorkout(id);
      router.back();
    } catch (e: any) {
      notify('종료 실패', e.message);
    }
  }

  if (!workout) return <View style={styles.screen} />;

  const done = Boolean(workout.ended_at);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{workout.title}</Text>
          <Text style={styles.summarySub}>
            총 볼륨 {totalVolume.toLocaleString()} kg · 완료 세트{' '}
            {sets.filter((s) => s.done).length}/{sets.length}
          </Text>
        </View>

        {grouped.map(({ exerciseId, sets: exerciseSets }) => (
          <View key={exerciseId} style={styles.card}>
            <Text style={styles.cardTitle}>{exerciseName(exerciseId)}</Text>

            {exerciseSets.map((s) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setNo}>{s.set_no}</Text>
                <TextInput
                  style={styles.setInput}
                  keyboardType="decimal-pad"
                  defaultValue={String(s.weight_kg)}
                  editable={!done}
                  onEndEditing={(e) =>
                    persist(s.id, { weight_kg: Number(e.nativeEvent.text) || 0 })
                  }
                />
                <Text style={styles.unit}>kg</Text>
                <TextInput
                  style={styles.setInput}
                  keyboardType="number-pad"
                  defaultValue={String(s.reps)}
                  editable={!done}
                  onEndEditing={(e) => persist(s.id, { reps: Number(e.nativeEvent.text) || 0 })}
                />
                <Text style={styles.unit}>회</Text>
                <Pressable
                  style={[styles.check, s.done && styles.checkDone]}
                  disabled={done}
                  onPress={() => persist(s.id, { done: !s.done })}
                  onLongPress={() => !done && removeSet(s.id)}>
                  <Text style={[styles.checkText, s.done && styles.checkTextDone]}>✓</Text>
                </Pressable>
              </View>
            ))}

            {!done && (
              <Pressable style={styles.addSet} onPress={() => addSet(exerciseId)}>
                <Text style={styles.addSetText}>+ 세트 추가</Text>
              </Pressable>
            )}
          </View>
        ))}

        {!done && (
          <Pressable style={styles.secondary} onPress={() => setPicking(true)}>
            <Text style={styles.secondaryText}>+ 운동 종목 추가</Text>
          </Pressable>
        )}
      </ScrollView>

      {!done && (
        <Pressable style={styles.finish} onPress={finish}>
          <Text style={styles.finishText}>운동 완료</Text>
        </Pressable>
      )}

      <Modal visible={picking} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicking(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>종목 선택</Text>
            <ScrollView>
              {exercises.length === 0 ? (
                <Text style={styles.empty}>설정 탭에서 종목을 먼저 추가해 주세요.</Text>
              ) : (
                exercises.map((e) => (
                  <Pressable
                    key={e.id}
                    style={styles.modalRow}
                    onPress={() => {
                      setPicking(false);
                      addSet(e.id);
                    }}>
                    <Text style={styles.modalRowText}>{e.name}</Text>
                    <Text style={styles.rowSub}>{e.muscle_group}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 3 },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  summaryTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  summarySub: { color: colors.textDim, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  setNo: { color: colors.textDim, width: 18 },
  setInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 64,
    textAlign: 'center',
  },
  unit: { color: colors.textDim },
  check: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success },
  checkText: { color: colors.textDim, fontWeight: '800' },
  checkTextDone: { color: '#0E1116' },
  addSet: { paddingVertical: spacing.sm },
  addSetText: { color: colors.accent, fontWeight: '600' },
  secondary: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '700' },
  finish: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  finishText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  modalRow: {
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  modalRowText: { color: colors.text, fontSize: 15 },
  rowSub: { color: colors.textDim, marginTop: 2 },
  empty: { color: colors.textDim, paddingVertical: spacing.lg },
});
