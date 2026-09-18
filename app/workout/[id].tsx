import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ExercisePicker } from '@/components/ExercisePicker';
import { notify } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import {
  addWorkoutSet,
  deleteWorkoutSet,
  finishWorkout,
  getLastPerformance,
  getWorkout,
  listExercises,
  listWorkoutSets,
  updateWorkoutSet,
  type ExerciseHistoryPoint,
} from '@/lib/db';
import type { Exercise, Workout, WorkoutSet } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

const REST_SECONDS = 90;

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [last, setLast] = useState<Map<string, ExerciseHistoryPoint>>(new Map());
  const [picking, setPicking] = useState(false);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([getWorkout(id), listWorkoutSets(id), listExercises()])
      .then(async ([w, s, e]) => {
        setWorkout(w);
        setSets(s);
        setExercises(e);
        const ids = [...new Set(s.map((x) => x.exercise_id))];
        setLast(await getLastPerformance(ids, id));
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, [id]);

  useFocusEffect(load);

  useEffect(() => {
    if (restEnd === null) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [restEnd]);

  const restRemaining = restEnd === null ? null : Math.max(0, Math.ceil((restEnd - now) / 1000));

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

  const doneSets = sets.filter((s) => s.done);
  const totalVolume = doneSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);

  function patchLocal(setId: string, patch: Partial<WorkoutSet>) {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)));
  }

  async function persist(setId: string, patch: Partial<WorkoutSet>) {
    patchLocal(setId, patch);
    if (patch.done === true) setRestEnd(Date.now() + REST_SECONDS * 1000);
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
    const previous = existing[existing.length - 1];
    const lastTime = last.get(exerciseId)?.sets;
    const template = previous ?? lastTime?.[Math.min(existing.length, lastTime.length - 1)];
    const position = previous?.position ?? sets.reduce((m, s) => Math.max(m, s.position), -1) + 1;
    try {
      const created = await addWorkoutSet({
        workoutId: id,
        exerciseId,
        position,
        setNo: existing.length + 1,
        weight: template?.weight_kg ?? 0,
        reps: template?.reps ?? 10,
      });
      setSets((prev) => [...prev, created]);
      if (!last.has(exerciseId)) {
        const fetched = await getLastPerformance([exerciseId], id);
        if (fetched.size) setLast((prev) => new Map([...prev, ...fetched]));
      }
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{workout.title}</Text>
          <Text style={styles.summarySub}>
            총 볼륨 {totalVolume.toLocaleString()} kg · 완료 세트 {doneSets.length}/{sets.length}
          </Text>
        </View>

        {grouped.map(({ exerciseId, sets: exerciseSets }) => {
          const previous = last.get(exerciseId);
          return (
            <View key={exerciseId} style={styles.card}>
              <Text style={styles.cardTitle}>{exerciseName(exerciseId)}</Text>
              {previous && (
                <Text style={styles.previous}>
                  지난번 {formatDate(previous.date, 'short')} ·{' '}
                  {previous.sets.map((s) => `${s.weight_kg}×${s.reps}`).join('  ')}
                </Text>
              )}

              {exerciseSets.map((s) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNo}>{s.set_no}</Text>
                  <NumberField
                    value={s.weight_kg}
                    decimal
                    editable={!done}
                    onCommit={(v) => persist(s.id, { weight_kg: v })}
                  />
                  <Text style={styles.unit}>kg</Text>
                  <NumberField
                    value={s.reps}
                    editable={!done}
                    onCommit={(v) => persist(s.id, { reps: v })}
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
          );
        })}

        {!done && (
          <Pressable style={styles.secondary} onPress={() => setPicking(true)}>
            <Text style={styles.secondaryText}>+ 운동 종목 추가</Text>
          </Pressable>
        )}
        {!done && sets.length > 0 && (
          <Text style={styles.hint}>세트 체크를 길게 누르면 삭제돼요.</Text>
        )}
      </ScrollView>

      {!done && (
        <View style={styles.bottomBar}>
          {restRemaining !== null && (
            <View style={styles.rest}>
              <Text style={styles.restLabel}>
                {restRemaining > 0 ? `휴식 ${formatClock(restRemaining)}` : '휴식 끝! 다음 세트'}
              </Text>
              <View style={styles.restActions}>
                {restRemaining > 0 && (
                  <Pressable
                    style={styles.restButton}
                    onPress={() => setRestEnd((end) => (end ?? Date.now()) + 30_000)}>
                    <Text style={styles.restButtonText}>+30초</Text>
                  </Pressable>
                )}
                <Pressable style={styles.restButton} onPress={() => setRestEnd(null)}>
                  <Text style={styles.restButtonText}>{restRemaining > 0 ? '건너뛰기' : '닫기'}</Text>
                </Pressable>
              </View>
            </View>
          )}
          <Pressable style={styles.finish} onPress={finish}>
            <Text style={styles.finishText}>운동 완료</Text>
          </Pressable>
        </View>
      )}

      <ExercisePicker
        visible={picking}
        exercises={exercises}
        onSelect={(e) => addSet(e.id)}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

function NumberField({
  value,
  decimal,
  editable,
  onCommit,
}: {
  value: number;
  decimal?: boolean;
  editable: boolean;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const parsed = decimal ? parseFloat(text) : parseInt(text, 10);
    const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setText(String(next));
    if (next !== value) onCommit(next);
  }

  return (
    <TextInput
      style={styles.setInput}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      value={text}
      editable={editable}
      selectTextOnFocus
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 160 },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  summaryTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  summarySub: { color: colors.textDim, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  previous: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs, marginBottom: spacing.sm },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  addSet: { paddingTop: spacing.md },
  addSetText: { color: colors.accent, fontWeight: '600' },
  secondary: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    gap: spacing.sm,
  },
  rest: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restLabel: { color: colors.text, fontWeight: '700', fontSize: 16 },
  restActions: { flexDirection: 'row', gap: spacing.sm },
  restButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  restButtonText: { color: colors.accent, fontWeight: '600' },
  finish: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  finishText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
