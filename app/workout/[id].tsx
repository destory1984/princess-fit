import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { ExercisePicker } from '@/components/ExercisePicker';
import { confirmAction, notify } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import {
  addWorkoutSet,
  deleteWorkout,
  deleteWorkoutSet,
  estimateOneRm,
  finishWorkout,
  getLastPerformance,
  getWorkout,
  listExercises,
  listWorkoutSets,
  updateWorkout,
  updateWorkoutSet,
  type ExerciseHistoryPoint,
} from '@/lib/db';
import type { Exercise, Workout, WorkoutSet } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

const DEFAULT_REST = 90;

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [last, setLast] = useState<Map<string, ExerciseHistoryPoint>>(new Map());
  const [picking, setPicking] = useState(false);
  const [restLength, setRestLength] = useState(DEFAULT_REST);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([getWorkout(id), listWorkoutSets(id), listExercises()])
      .then(async ([w, s, e]) => {
        setWorkout(w);
        setSets(s);
        setExercises(e);
        setLast(await getLastPerformance([...new Set(s.map((x) => x.exercise_id))], id));
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

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const s of sets) {
      const list = map.get(s.exercise_id) ?? [];
      list.push(s);
      map.set(s.exercise_id, list);
    }
    return [...map.entries()].map(([exerciseId, list]) => ({
      exerciseId,
      exercise: byId.get(exerciseId) ?? null,
      sets: [...list].sort((a, b) => a.set_no - b.set_no),
    }));
  }, [sets, byId]);

  const worked = useMemo(
    () => workedParts(grouped.flatMap((g) => g.exercise ?? [])),
    [grouped]
  );

  const doneSets = sets.filter((s) => s.done);
  const totalVolume = doneSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
  const done = Boolean(workout?.ended_at);

  async function persist(setId: string, patch: Partial<WorkoutSet>) {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)));
    if (patch.done === true) setRestEnd(Date.now() + restLength * 1000);
    try {
      await updateWorkoutSet(setId, patch);
    } catch (e: any) {
      notify('저장 실패', e.message);
      load();
    }
  }

  async function completeAll() {
    const pending = sets.filter((s) => !s.done);
    if (pending.length === 0) return;
    setSets((prev) => prev.map((s) => ({ ...s, done: true })));
    try {
      await Promise.all(pending.map((s) => updateWorkoutSet(s.id, { done: true })));
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

  async function discard() {
    if (!id) return;
    try {
      await deleteWorkout(id);
      router.back();
    } catch (e: any) {
      notify('삭제 실패', e.message);
    }
  }

  async function finish() {
    if (!id) return;
    if (doneSets.length === 0) {
      confirmAction('완료한 세트가 없어요', '이 운동을 기록 없이 삭제할까요?', discard);
      return;
    }
    try {
      await finishWorkout(id);
      router.back();
    } catch (e: any) {
      notify('종료 실패', e.message);
    }
  }

  async function saveMemo(memo: string) {
    if (!id || !workout) return;
    const next = memo.trim() || null;
    if (next === workout.memo) return;
    setWorkout({ ...workout, memo: next });
    try {
      await updateWorkout(id, { memo: next });
    } catch (e: any) {
      notify('메모 저장 실패', e.message);
    }
  }

  if (!workout) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{workout.title}</Text>
          <Text style={styles.summarySub}>
            {formatDate(workout.started_at)} · 총 {totalVolume.toLocaleString()} kg · 완료{' '}
            {doneSets.length}/{sets.length} 세트
          </Text>
          {worked.length > 0 && (
            <View style={styles.bodyWrap}>
              <BodyMap data={worked} scale={0.55} labels={false} />
            </View>
          )}
        </View>

        {grouped.map(({ exerciseId, exercise, sets: exerciseSets }) => {
          const previous = last.get(exerciseId);
          const exDone = exerciseSets.filter((s) => s.done);
          const top = Math.max(0, ...exDone.map((s) => s.weight_kg));
          const oneRm = Math.max(0, ...exDone.map((s) => estimateOneRm(s.weight_kg, s.reps)));
          const tint = muscleColor(exercise?.muscle_group ?? '기타');

          return (
            <View key={exerciseId} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={[styles.stripe, { backgroundColor: tint }]} />
                <View style={styles.cardHeadBody}>
                  <Text style={styles.cardTitle}>{exercise?.name ?? '삭제된 종목'}</Text>
                  {!!exercise?.muscle_detail && (
                    <Text style={styles.cardSub}>
                      {exercise.muscle_detail} · {exercise.equipment}
                    </Text>
                  )}
                </View>
              </View>

              {top > 0 && (
                <Text style={styles.metrics}>
                  최고 무게 {top}kg · 예상 1RM {oneRm}kg
                </Text>
              )}
              {previous && (
                <Text style={styles.previous}>
                  지난번 {formatDate(previous.date, 'short')} ·{' '}
                  {previous.sets.map((s) => `${s.weight_kg}×${s.reps}`).join('  ')}
                </Text>
              )}

              {done ? (
                <View style={styles.circleRow}>
                  {exDone.map((s) => (
                    <View key={s.id} style={styles.circleItem}>
                      <View style={[styles.circle, { backgroundColor: tint }]}>
                        <Text style={styles.circleValue}>{s.weight_kg}</Text>
                      </View>
                      <Text style={styles.circleReps}>{s.reps}회</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.tableHead}>
                    <Text style={[styles.th, styles.thNo]}>세트</Text>
                    <Text style={styles.th}>KG</Text>
                    <Text style={styles.th}>횟수</Text>
                    <Text style={[styles.th, styles.thDone]}>완료</Text>
                  </View>
                  {exerciseSets.map((s) => (
                    <View key={s.id} style={styles.setRow}>
                      <Text style={styles.setNo}>{s.set_no}</Text>
                      <NumberField
                        value={s.weight_kg}
                        decimal
                        onCommit={(v) => persist(s.id, { weight_kg: v })}
                      />
                      <NumberField value={s.reps} onCommit={(v) => persist(s.id, { reps: v })} />
                      <Pressable
                        style={[styles.check, s.done && { backgroundColor: colors.success }]}
                        onPress={() => persist(s.id, { done: !s.done })}
                        onLongPress={() => removeSet(s.id)}>
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={s.done ? '#0E1116' : colors.textDim}
                        />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.addSet} onPress={() => addSet(exerciseId)}>
                    <Text style={styles.addSetText}>+ 세트 추가</Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        })}

        {!done && (
          <Pressable style={styles.secondary} onPress={() => setPicking(true)}>
            <Ionicons name="add" size={18} color={colors.accent} />
            <Text style={styles.secondaryText}>운동 종목 추가</Text>
          </Pressable>
        )}
        {!done && sets.length > 0 && (
          <Text style={styles.hint}>완료 표시를 길게 누르면 그 세트가 삭제돼요.</Text>
        )}

        {(!done || workout.memo) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>메모</Text>
            <MemoField value={workout.memo ?? ''} editable={!done} onCommit={saveMemo} />
          </View>
        )}

        {!done && (
          <Pressable
            style={styles.discard}
            onPress={() => confirmAction('운동 삭제', '이 운동 기록을 삭제할까요?', discard)}>
            <Text style={styles.discardText}>이 운동 삭제</Text>
          </Pressable>
        )}
      </ScrollView>

      {!done && (
        <View style={styles.bottomBar}>
          <View style={styles.rest}>
            <Text style={styles.restLabel}>휴식</Text>
            <Text style={styles.restClock}>
              {restRemaining === null ? formatClock(restLength) : formatClock(restRemaining)}
            </Text>
            <View style={styles.restActions}>
              <Pressable
                style={styles.restButton}
                onPress={() =>
                  restEnd === null
                    ? setRestLength((v) => v + 10)
                    : setRestEnd((end) => (end ?? Date.now()) + 10_000)
                }>
                <Text style={styles.restButtonText}>+10</Text>
              </Pressable>
              <Pressable
                style={styles.restButton}
                onPress={() =>
                  restEnd === null
                    ? setRestLength((v) => Math.max(10, v - 10))
                    : setRestEnd((end) => Math.max(Date.now(), (end ?? Date.now()) - 10_000))
                }>
                <Text style={styles.restButtonText}>-10</Text>
              </Pressable>
              <Pressable
                style={styles.restButton}
                onPress={() => {
                  setRestEnd(null);
                  setRestLength(DEFAULT_REST);
                }}>
                <Text style={styles.restButtonText}>리셋</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.actionGhost} onPress={completeAll}>
              <Ionicons name="checkmark-done" size={18} color={colors.success} />
              <Text style={styles.actionGhostText}>모든 세트 완료</Text>
            </Pressable>
            <Pressable style={styles.finish} onPress={finish}>
              <Text style={styles.finishText}>운동 완료</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ExercisePicker
        visible={picking}
        exercises={exercises}
        onSelect={(e) => addSet(e.id)}
        onClose={() => setPicking(false)}
        onSeeded={load}
      />
    </View>
  );
}

function NumberField({
  value,
  decimal,
  onCommit,
}: {
  value: number;
  decimal?: boolean;
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
      selectTextOnFocus
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
    />
  );
}

function MemoField({
  value,
  editable,
  onCommit,
}: {
  value: string;
  editable: boolean;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <TextInput
      style={styles.memo}
      placeholder="컨디션, 통증, 다음에 올릴 무게…"
      placeholderTextColor={colors.textDim}
      value={text}
      editable={editable}
      multiline
      onChangeText={setText}
      onBlur={() => onCommit(text)}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 220 },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  summaryTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  summarySub: { color: colors.textDim, marginTop: spacing.xs, fontSize: 13 },
  bodyWrap: { marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stripe: { width: 4, height: 32, borderRadius: 2 },
  cardHeadBody: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  metrics: { color: colors.text, fontSize: 13, marginTop: spacing.md, fontWeight: '600' },
  previous: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  th: { color: colors.textDim, fontSize: 11, flex: 1, textAlign: 'center' },
  thNo: { flex: 0, width: 28, textAlign: 'left' },
  thDone: { flex: 0, width: 40 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  setNo: { color: colors.textDim, width: 28 },
  setInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    color: colors.text,
    paddingVertical: spacing.md,
    textAlign: 'center',
    fontSize: 16,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  circleItem: { alignItems: 'center' },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  circleValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  circleReps: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  addSet: { paddingTop: spacing.md },
  addSetText: { color: colors.accent, fontWeight: '600' },
  secondary: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  secondaryText: { color: colors.accent, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  memo: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    color: colors.text,
    padding: spacing.md,
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  discard: { alignItems: 'center', paddingVertical: spacing.sm },
  discardText: { color: colors.danger, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rest: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  restLabel: { color: colors.textDim, fontSize: 13 },
  restClock: { color: colors.text, fontSize: 22, fontWeight: '800', minWidth: 62 },
  restActions: { flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' },
  restButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  restButtonText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionGhost: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionGhostText: { color: colors.success, fontWeight: '700', fontSize: 13 },
  finish: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
