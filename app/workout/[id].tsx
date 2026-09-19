import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { BodyMap, workedParts } from "@/components/BodyMap";
import { ExercisePicker } from "@/components/ExercisePicker";
import { SetCard } from "@/components/SetCard";
import { ScreenState } from "@/components/ScreenState";
import { confirmAction, notify } from "@/lib/confirm";
import { cancelRestAlarm, scheduleRestAlarm } from "@/lib/notify";
import { celebrateFeedback, successFeedback } from "@/lib/feedback";

import { formatDate, formatDuration } from "@/lib/format";
import { warmUpAdvice } from "@/lib/advice";
import { summarise } from "@/lib/gamification";
import {
  addWorkoutSet,
  deleteWorkout,
  deleteWorkoutSet,
  estimateOneRm,
  finishWorkout,
  payForWorkout,
  getLastPerformance,
  getPersonalBests,
  getWorkout,
  listExercises,
  listWorkoutFacts,
  listWorkoutSets,
  updateWorkout,
  updateWorkoutSet,
  clampRest,
  DEFAULT_REST_SEC,
  REST_GRAIN,
  setExerciseRest,
  type ExerciseHistoryPoint,
} from "@/lib/db";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";
import { followOn, planFor } from "@/lib/setPlan";
import { colors, muscleColor, radius, spacing } from "@/lib/theme";

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [last, setLast] = useState<Map<string, ExerciseHistoryPoint>>(
    new Map(),
  );
  const [bests, setBests] = useState<Map<string, number>>(new Map());
  const [picking, setPicking] = useState(false);
  // Which exercise the rest bar is speaking for: the one whose set just
  // finished, or the one coming up before anything has been done.
  const [restFor, setRestFor] = useState<string | null>(null);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    Promise.all([getWorkout(id), listWorkoutSets(id), listExercises()])
      .then(async ([w, s, e]) => {
        setWorkout(w);
        setSets(s);
        setExercises(e);
        const ids = [...new Set(s.map((x) => x.exercise_id))];
        const [lastSeen, personalBests] = await Promise.all([
          getLastPerformance(ids, id),
          getPersonalBests(ids, id),
        ]);
        setLast(lastSeen);
        setBests(personalBests);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useFocusEffect(load);

  // Give the model a long head start on loading; advice is asked for at the end.
  useEffect(() => {
    warmUpAdvice();
  }, []);

  useEffect(() => {
    if (restEnd === null) return;
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      // Stop at zero rather than counting on forever: the bar goes back to
      // showing this exercise's rest length, ready for the next set.
      if (at >= restEnd) {
        setRestEnd(null);
        celebrateFeedback();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [restEnd]);

  /**
   * Book the bell for when the rest runs out, and re-book it whenever the end
   * moves. Ringing it from the countdown would only work while this screen is
   * on top; the phone is usually in a pocket by then.
   */
  useEffect(() => {
    if (restEnd === null) return;

    let cancelled = false;
    let booked: string | null = null;

    scheduleRestAlarm(new Date(restEnd))
      .then((id) => {
        booked = id;
        if (cancelled) void cancelRestAlarm(id);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      // Only call it off if the rest is being cut short or moved. A rest that
      // simply ran out clears itself, and cancelling then would silence the
      // very bell it was booked for, at the moment it is due.
      if (Date.now() < restEnd) void cancelRestAlarm(booked);
    };
  }, [restEnd]);

  /**
   * Change how long this exercise rests, in ten-second steps. It is saved
   * against the exercise, so a heavy squat keeps its long rest next time.
   */
  function changeRest(delta: number) {
    const exercise = restExercise;
    if (!exercise) return;
    const next = clampRest(exercise.rest_sec + delta);
    setExercises((prev) =>
      prev.map((e) => (e.id === exercise.id ? { ...e, rest_sec: next } : e)),
    );
    setExerciseRest(exercise.id, next).catch((e: any) => {
      notify("저장 실패", e.message);
      load();
    });
  }

  const restRemaining =
    restEnd === null ? null : Math.max(0, Math.ceil((restEnd - now) / 1000));

  const byId = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  );

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
    [grouped],
  );

  const doneSets = sets.filter((s) => s.done);
  const pendingSets = sets.length - doneSets.length;
  const totalVolume = doneSets.reduce(
    (sum, s) => sum + s.weight_kg * s.reps,
    0,
  );
  const done = Boolean(workout?.ended_at);
  const progress = sets.length ? doneSets.length / sets.length : 0;
  const upNext = grouped.find((g) => g.sets.some((s) => !s.done));
  // While resting it is the exercise just finished; otherwise the one coming
  // up, so the bar always names something the buttons can actually change.
  const restExercise = byId.get(restFor ?? "") ?? upNext?.exercise ?? null;
  const restLength = restExercise?.rest_sec ?? DEFAULT_REST_SEC;

  async function persist(setId: string, patch: Partial<WorkoutSet>) {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    );
    if (patch.done === true) {
      const finished = sets.find((x) => x.id === setId);
      const forExercise = finished?.exercise_id ?? null;
      const seconds = byId.get(forExercise ?? "")?.rest_sec ?? DEFAULT_REST_SEC;
      setRestFor(forExercise);
      setRestEnd(Date.now() + seconds * 1000);
      successFeedback();

      // Carry the weight onto the sets still waiting, so a set laid out in
      // advance does not send you back to zero halfway through the exercise.
      if (finished) {
        const merged = { ...finished, ...patch };
        const waiting = followOn(
          sets.filter((x) => x.exercise_id === finished.exercise_id),
          merged
        );
        if (waiting.length) {
          const carry = { weight_kg: merged.weight_kg, reps: merged.reps };
          setSets((prev) =>
            prev.map((x) => (waiting.some((w) => w.id === x.id) ? { ...x, ...carry } : x))
          );
          Promise.all(waiting.map((w) => updateWorkoutSet(w.id, carry))).catch(() => {
            // The numbers on screen are right; a failed save shows up on reload.
          });
        }
      }
    }
    try {
      await updateWorkoutSet(setId, patch);
    } catch (e: any) {
      notify("저장 실패", e.message);
      load();
    }
  }

  async function completeAll() {
    const pending = sets.filter((s) => !s.done);
    if (pending.length === 0) return;
    setSets((prev) => prev.map((s) => ({ ...s, done: true })));
    try {
      await Promise.all(
        pending.map((s) => updateWorkoutSet(s.id, { done: true })),
      );
    } catch (e: any) {
      notify("저장 실패", e.message);
      load();
    }
  }

  async function addSet(exerciseId: string) {
    if (!id) return;
    const existing = sets.filter((s) => s.exercise_id === exerciseId);
    const previous = existing[existing.length - 1];
    const lastTime = last.get(exerciseId)?.sets;
    // Prefer the last set actually finished today: the one at the end of the
    // list may be a planned set still sitting at zero.
    const lastDone = [...existing].reverse().find((s) => s.done);
    const template =
      lastDone ?? previous ?? lastTime?.[Math.min(existing.length, lastTime.length - 1)];
    const position =
      previous?.position ??
      sets.reduce((m, s) => Math.max(m, s.position), -1) + 1;
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
      notify("세트 추가 실패", e.message);
    }
  }

  /**
   * Put an exercise on the board with the sets it is likely to need: the ones
   * it ended on last time, or a plain preset if it has never been done. Adding
   * a single empty set meant typing the whole thing out again every session.
   */
  async function addExercise(exercise: Exercise) {
    if (!id) return;
    let past = last.get(exercise.id)?.sets;
    if (!last.has(exercise.id)) {
      try {
        const fetched = await getLastPerformance([exercise.id], id);
        if (fetched.size) setLast((prev) => new Map([...prev, ...fetched]));
        past = fetched.get(exercise.id)?.sets;
      } catch {
        // No history to read is the same as no history: fall back to the preset.
      }
    }

    const plan = planFor(exercise.track_type, past);
    const position = sets.reduce((m, x) => Math.max(m, x.position), -1) + 1;
    try {
      const created = await Promise.all(
        plan.map((planned, i) =>
          addWorkoutSet({
            workoutId: id,
            exerciseId: exercise.id,
            position,
            setNo: i + 1,
            weight: planned.weight,
            reps: planned.reps,
          })
        )
      );
      setSets((prev) => [...prev, ...created]);
    } catch (e: any) {
      notify('종목 추가 실패', e.message);
      load();
    }
  }

  function removeExercise(exerciseId: string, name: string) {
    confirmAction("종목 빼기", `"${name}"을 이 운동에서 뺄까요?`, async () => {
      // Read the sets when the answer comes back, not when the dialog opened:
      // a native Alert leaves time for another set to land.
      let removed: WorkoutSet[] = [];
      setSets((prev) => {
        removed = prev.filter((s) => s.exercise_id === exerciseId);
        return prev.filter((s) => s.exercise_id !== exerciseId);
      });
      try {
        await Promise.all(removed.map((s) => deleteWorkoutSet(s.id)));
      } catch (e: any) {
        notify("삭제 실패", e.message);
        load();
      }
    });
  }

  async function removeSet(setId: string) {
    try {
      await deleteWorkoutSet(setId);
      setSets((prev) => prev.filter((s) => s.id !== setId));
    } catch (e: any) {
      notify("삭제 실패", e.message);
    }
  }

  async function discard() {
    if (!id) return;
    try {
      await deleteWorkout(id);
      router.back();
    } catch (e: any) {
      notify("삭제 실패", e.message);
    }
  }

  async function finish() {
    if (!id) return;
    if (doneSets.length === 0) {
      confirmAction(
        "완료한 세트가 없어요",
        "이 운동을 기록 없이 삭제할까요?",
        discard,
      );
      return;
    }
    try {
      const before = summarise(await listWorkoutFacts());
      await finishWorkout(id);
      const facts = await listWorkoutFacts();
      const after = summarise(facts);

      // Pay her for the session. A failure here must not swallow the workout,
      // which is already safely saved.
      let earned = 0;
      try {
        const fact = facts.find((f) => f.id === id);
        if (fact) earned = (await payForWorkout(fact)).gold;
      } catch {
        // The purse can catch up on the next settle.
      }

      const gained = after.xp - before.xp;
      const earnedBefore = new Set(
        before.badges.filter((b) => b.earned).map((b) => b.id),
      );
      const fresh = after.badges.filter(
        (b) => b.earned && !earnedBefore.has(b.id),
      );
      const lines = [
        after.level > before.level
          ? `Lv.${after.level} ${after.title} 달성!`
          : "",
        fresh.length ? `새 업적 · ${fresh.map((b) => b.name).join(", ")}` : "",
        after.streak > 1 ? `${after.streak}일 연속 운동 중` : "",
      ].filter(Boolean);
      const title = earned ? `+${gained} XP · +${earned} G` : `+${gained} XP`;

      celebrateFeedback();
      if (lines.length) notify(title, lines.join("\n"));
      else if (earned) notify(title);
      router.replace({ pathname: "/summary/[id]", params: { id } });
    } catch (e: any) {
      notify("종료 실패", e.message);
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
      notify("메모 저장 실패", e.message);
    }
  }

  if (!workout) return <ScreenState error={error} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{workout.title}</Text>
          <Text style={styles.summarySub}>
            {formatDate(workout.started_at)} · 총 {totalVolume.toLocaleString()}{" "}
            kg · 완료 {doneSets.length}/{sets.length} 세트
          </Text>
          {!done && sets.length > 0 && (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.upNext}>
                {upNext
                  ? `다음 · ${upNext.exercise?.name ?? "종목"}`
                  : "모든 세트를 끝냈어요. 아래에서 운동을 완료하세요."}
              </Text>
            </>
          )}

          {worked.length > 0 && (
            <View style={styles.bodyWrap}>
              <BodyMap data={worked} scale={0.55} labels={false} />
            </View>
          )}
        </View>

        {grouped.map(({ exerciseId, exercise, sets: exerciseSets }) => {
          const previous = last.get(exerciseId);
          const exDone = exerciseSets.filter((s) => s.done);
          const current = exerciseSets.find((s) => !s.done) ?? null;
          const track = exercise?.track_type ?? "weight_reps";
          const top = Math.max(0, ...exDone.map((s) => s.weight_kg));
          const oneRm = Math.max(
            0,
            ...exDone.map((s) => estimateOneRm(s.weight_kg, s.reps)),
          );
          const totalSec = exDone.reduce((sum, s) => sum + s.duration_sec, 0);
          const totalKm = exDone.reduce((sum, s) => sum + s.distance_km, 0);
          const tint = muscleColor(exercise?.muscle_group ?? "기타");
          const previousBest = bests.get(exerciseId) ?? 0;
          const isRecord =
            track === "weight_reps" && previousBest > 0 && top > previousBest;

          return (
            <View key={exerciseId} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={[styles.stripe, { backgroundColor: tint }]} />
                <View style={styles.cardHeadBody}>
                  <Text style={styles.cardTitle}>
                    {exercise?.name ?? "삭제된 종목"}
                  </Text>
                  {!!exercise?.muscle_detail && (
                    <Text style={styles.cardSub}>
                      {exercise.muscle_detail} · {exercise.equipment}
                    </Text>
                  )}
                </View>
                {!done && (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      removeExercise(exerciseId, exercise?.name ?? "이 종목")
                    }
                  >
                    <Ionicons name="close" size={18} color={colors.textDim} />
                  </Pressable>
                )}
              </View>

              {track === "weight_reps" && top > 0 && (
                <Text style={styles.metrics}>
                  최고 무게 {top}kg · 예상 1RM {oneRm}kg
                </Text>
              )}
              {isRecord && (
                <View style={styles.record}>
                  <Ionicons name="trophy" size={13} color={colors.accent} />
                  <Text style={styles.recordText}>
                    신기록! 이전 최고 {previousBest}kg
                  </Text>
                </View>
              )}
              {track !== "weight_reps" && totalSec > 0 && (
                <Text style={styles.metrics}>
                  {formatDuration(totalSec)}
                  {totalKm > 0 && ` · ${totalKm}km`}
                </Text>
              )}
              {previous && track === "weight_reps" && (
                <Text style={styles.previous}>
                  지난번 {formatDate(previous.date, "short")} ·{" "}
                  {previous.sets
                    .map((s) => `${s.weight_kg}×${s.reps}`)
                    .join("  ")}
                </Text>
              )}

              {done ? (
                <View style={styles.circleRow}>
                  {exDone.map((s) => (
                    <View key={s.id} style={styles.circleItem}>
                      <View style={[styles.circle, { backgroundColor: tint }]}>
                        <Text style={styles.circleValue}>
                          {track === "weight_reps"
                            ? s.weight_kg
                            : Math.round(s.duration_sec / 60)}
                        </Text>
                      </View>
                      <Text style={styles.circleReps}>
                        {track === "weight_reps"
                          ? `${s.reps}회`
                          : track === "cardio" && s.distance_km > 0
                            ? `분 · ${s.distance_km}km`
                            : "분"}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  {exDone.length > 0 && (
                    <View style={styles.chipRow}>
                      {exDone.map((s) => (
                        <Pressable
                          key={s.id}
                          style={[styles.doneChip, { borderColor: tint }]}
                          onPress={() => persist(s.id, { done: false })}
                        >
                          <Ionicons name="checkmark" size={12} color={tint} />
                          <Text style={[styles.doneChipText, { color: tint }]}>
                            {track === "weight_reps"
                              ? `${s.weight_kg}×${s.reps}`
                              : `${Math.round(s.duration_sec / 60)}분`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {current ? (
                    <SetCard
                      set={current}
                      track={track}
                      index={current.set_no}
                      total={exerciseSets.length}
                      tint={tint}
                      onChange={(patch) => persist(current.id, patch)}
                      onComplete={() => persist(current.id, { done: true })}
                      onRemove={() => removeSet(current.id)}
                    />
                  ) : (
                    <Text style={styles.allDone}>이 종목은 다 하셨어요 🎉</Text>
                  )}

                  {track === "weight_reps" && (
                    <Pressable
                      style={styles.addSet}
                      onPress={() => addSet(exerciseId)}
                    >
                      <Ionicons name="add" size={18} color={colors.accent} />
                      <Text style={styles.addSetText}>세트 추가</Text>
                    </Pressable>
                  )}
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

        {(!done || workout.memo) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>메모</Text>
            <MemoField
              value={workout.memo ?? ""}
              editable={!done}
              onCommit={saveMemo}
            />
          </View>
        )}

        {!done && (
          <Pressable
            style={styles.discard}
            onPress={() =>
              confirmAction("운동 삭제", "이 운동 기록을 삭제할까요?", discard)
            }
          >
            <Text style={styles.discardText}>이 운동 삭제</Text>
          </Pressable>
        )}
      </ScrollView>

      {!done && (
        <View style={styles.bottomBar}>
          {restRemaining !== null && restLength > 0 && (
            <View style={styles.restTrack}>
              <View
                style={[
                  styles.restFill,
                  { width: `${(restRemaining / restLength) * 100}%` },
                ]}
              />
            </View>
          )}
          <View style={styles.rest}>
            <Text style={styles.restLabel} numberOfLines={1}>
              휴식{restExercise ? ` · ${restExercise.name}` : ""}
            </Text>
            {/* Running reads red and counting; idle is the length it will be. */}
            <Text
              style={[styles.restClock, restEnd !== null && styles.restClockOn]}
            >
              {restRemaining === null
                ? formatClock(restLength)
                : formatClock(restRemaining)}
            </Text>
            <View style={styles.restActions}>
              <Pressable
                style={styles.restButton}
                onPress={() =>
                  restEnd === null
                    ? changeRest(REST_GRAIN)
                    : setRestEnd(
                        (end) => (end ?? Date.now()) + REST_GRAIN * 1000,
                      )
                }
              >
                <Text style={styles.restButtonText}>+10</Text>
              </Pressable>
              <Pressable
                style={styles.restButton}
                onPress={() =>
                  restEnd === null
                    ? changeRest(-REST_GRAIN)
                    : setRestEnd((end) =>
                        Math.max(
                          Date.now(),
                          (end ?? Date.now()) - REST_GRAIN * 1000,
                        ),
                      )
                }
              >
                <Text style={styles.restButtonText}>−10</Text>
              </Pressable>
              <Pressable
                style={styles.restButton}
                onPress={() => {
                  setRestEnd(null);
                }}
              >
                <Text style={styles.restButtonText}>건너뛰기</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            {/*
              Only worth offering while something is still unticked — beside
              운동 완료 it read as a second way to end the workout, and with
              nothing left to tick it did nothing at all.
            */}
            {pendingSets > 0 && (
              <Pressable style={styles.actionGhost} onPress={completeAll}>
                <Ionicons
                  name="checkmark-done"
                  size={18}
                  color={colors.success}
                />
                <Text style={styles.actionGhostText}>
                  남은 {pendingSets}세트 체크
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.finish} onPress={finish}>
              <Text style={styles.finishText}>운동 완료</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ExercisePicker
        visible={picking}
        exercises={exercises}
        onSelect={(e) => addExercise(e)}
        onClose={() => setPicking(false)}
        onSeeded={load}
      />
    </View>
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
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  summarySub: { color: colors.textDim, marginTop: spacing.xs, fontSize: 13 },
  bodyWrap: { marginTop: spacing.md },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  upNext: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stripe: { width: 4, height: 32, borderRadius: 2 },
  cardHeadBody: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  cardSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  metrics: {
    color: colors.text,
    fontSize: 13,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  record: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: spacing.xs,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  recordText: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  previous: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs },
  circleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  circleItem: { alignItems: "center" },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  circleValue: { color: "#fff", fontWeight: "800", fontSize: 16 },
  circleReps: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  doneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  doneChipText: { fontWeight: "700", fontSize: 13 },
  allDone: {
    color: colors.textDim,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  // The same shape as 운동 종목 추가 below it: both add something, and one
  // reading as a link while the other was a framed button made them look like
  // different kinds of action.
  addSet: {
    marginTop: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  addSetText: { color: colors.accent, fontWeight: "600" },
  secondary: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  secondaryText: { color: colors.accent, fontWeight: "700" },
  memo: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    color: colors.text,
    padding: spacing.md,
    minHeight: 72,
    textAlignVertical: "top",
    marginTop: spacing.sm,
  },
  discard: { alignItems: "center", paddingVertical: spacing.sm },
  discardText: { color: colors.danger, fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  restTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  restFill: { height: "100%", backgroundColor: colors.accent },
  rest: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  restLabel: { color: colors.textDim, fontSize: 13, maxWidth: 120 },
  restClockOn: { color: colors.accent },
  restClock: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    minWidth: 62,
  },
  restActions: { flexDirection: "row", gap: spacing.sm, marginLeft: "auto" },
  restButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  restButtonText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionGhost: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  actionGhostText: { color: colors.success, fontWeight: "700", fontSize: 13 },
  finish: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  finishText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
