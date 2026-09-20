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
import { Cheer } from "@/components/Cheer";
import { ExercisePicker } from "@/components/ExercisePicker";
import { RestBar } from "@/components/RestBar";
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
  getExerciseUsage,
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
import { applyLabel, progressWord, readiness } from "@/lib/progress";
import {
  conditionLabel,
  conditionLine,
  conditionNote,
  DEFAULT_CONDITION,
  shapePlan,
} from "@/lib/condition";
import type { UsageMap } from "@/lib/exerciseUsage";
import { listMuscleLoad } from "@/lib/db";
import type { Place } from "@/lib/onboarding";
import { getPlace } from "@/lib/prefs";
import { recoveryOf, type Muscle } from "@/lib/recovery";
import { suggestExercise } from "@/lib/suggest";
import { colors, muscleColor, radius, spacing } from "@/lib/theme";

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
  // Which exercise card is open. Null means "whichever is next", so the board
  // follows the workout on its own until you say otherwise.
  const [opened, setOpened] = useState<string | null>(null);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  // Lazy, so the clock is read once on mount rather than on every render.
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageMap>(new Map());
  // For the movement she offers on an empty board: what has rested, and where
  // they said they train. Both optional — without either she still suggests,
  // just with less to go on.
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    let alive = true;
    listMuscleLoad()
      .then((sessions) => alive && setMuscles(recoveryOf(sessions)))
      .catch(() => {
        // Without it she offers no particular movement and falls back to
        // 「종목을 하나 골라볼까요?」, which is a smaller loss than a wrong pick.
      });
    getPlace().then((stored) => alive && stored && setPlace(stored));
    return () => {
      alive = false;
    };
  }, []);

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
    // Only used to order the picker, so a failure costs nothing but the order.
    getExerciseUsage()
      .then(setUsage)
      .catch(() => {});
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
      .catch(() => {
        // Said out loud, once. The countdown on screen keeps running, so
        // nothing looks broken — and the whole point of the bell is the phone
        // that is already back in a pocket by now.
        if (!cancelled) notify('쉬는 시간 알림을 걸지 못했어요', '이 화면을 켜 두시면 시간은 보여요.');
      });

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

  // Only worth working out for an empty board, which is the only time she asks.
  const suggestion = useMemo(
    () =>
      sets.length > 0
        ? null
        : suggestExercise(exercises, muscles, {
            place,
            // Familiarity is a count; the map also carries when it was last
            // done, which the picker orders by and this does not need.
            usage: new Map([...usage].map(([id, u]) => [id, u.count])),
            exclude: new Set(sets.map((s) => s.exercise_id)),
          }),
    [sets, exercises, muscles, place, usage]
  );
  const upNext = grouped.find((g) => g.sets.some((s) => !s.done));
  // A long workout is mostly finished exercises; those collapse to one line so
  // the set you are actually on is never three screens down.
  const expandedId =
    opened ??
    upNext?.exerciseId ??
    grouped[grouped.length - 1]?.exerciseId ??
    null;
  // While resting, the exercise just finished — that is whose rest is running.
  // Once it ends, the one coming up, because that is what the buttons would
  // change and what the next set will use.
  const restExercise =
    (restEnd !== null ? byId.get(restFor ?? "") : upNext?.exercise) ??
    byId.get(restFor ?? "") ??
    upNext?.exercise ??
    null;
  const restLength = restExercise?.rest_sec ?? DEFAULT_REST_SEC;

  /**
   * Put a suggested weight on this exercise's remaining sets.
   *
   * Only the ones not yet done: a set already finished is a record of what was
   * lifted, and rewriting it to match a suggestion would turn the log into a
   * plan. Screen first, then the server — the board is the only sign the tap
   * landed.
   */
  function applyWeight(exerciseId: string, weight: number) {
    const waiting = sets.filter((x) => x.exercise_id === exerciseId && !x.done);
    if (waiting.length === 0) return;
    setSets((prev) =>
      prev.map((x) =>
        waiting.some((w) => w.id === x.id) ? { ...x, weight_kg: weight } : x,
      ),
    );
    Promise.all(waiting.map((x) => updateWorkoutSet(x.id, { weight_kg: weight })))
      .then(() => successFeedback())
      .catch((e: any) => {
        notify("저장 실패", e.message);
        load();
      });
  }

  async function persist(setId: string, patch: Partial<WorkoutSet>) {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    );
    if (patch.done === true) {
      const finished = sets.find((x) => x.id === setId);
      const forExercise = finished?.exercise_id ?? null;
      const seconds = byId.get(forExercise ?? "")?.rest_sec ?? DEFAULT_REST_SEC;
      setRestFor(forExercise);
      // persist runs from a press, never during render; the rule cannot tell
      // the difference for a function declared in the component body.
      // eslint-disable-next-line react-hooks/purity
      setRestEnd(Date.now() + seconds * 1000);
      successFeedback();

      // Carry the weight onto the sets still waiting, so a set laid out in
      // advance does not send you back to zero halfway through the exercise.
      if (finished) {
        const merged = { ...finished, ...patch };
        const waiting = followOn(
          sets.filter((x) => x.exercise_id === finished.exercise_id),
          merged,
        );
        if (waiting.length) {
          const carry = { weight_kg: merged.weight_kg, reps: merged.reps };
          setSets((prev) =>
            prev.map((x) =>
              waiting.some((w) => w.id === x.id) ? { ...x, ...carry } : x,
            ),
          );
          Promise.all(waiting.map((w) => updateWorkoutSet(w.id, carry))).catch(
            () => {
              // The numbers on screen are right; a failed save shows up on reload.
            },
          );
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
      lastDone ??
      previous ??
      lastTime?.[Math.min(existing.length, lastTime.length - 1)];
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

    // An exercise added halfway through gets the same adjustment the routine
    // got at the start, or the day would be half eased and half not.
    const plan = shapePlan(
      planFor(exercise.track_type, past),
      workout?.condition ?? DEFAULT_CONDITION
    );
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
          }),
        ),
      );
      setSets((prev) => [...prev, ...created]);
    } catch (e: any) {
      notify("종목 추가 실패", e.message);
      load();
    }
  }

  /**
   * Take one set off the board. The exercise is a grouping of its sets, so
   * removing the last one removes the exercise too — which is the only way to
   * drop an exercise now, and needs no separate button or confirmation.
   */
  async function removeSet(setId: string) {
    try {
      await deleteWorkoutSet(setId);
      setSets((prev) => {
        const next = prev.filter((s) => s.id !== setId);
        // Renumber what is left, or the remaining sets read 1, 3, 4.
        const gone = prev.find((s) => s.id === setId);
        if (!gone) return next;
        let n = 0;
        return next.map((s) =>
          s.exercise_id === gone.exercise_id ? { ...s, set_no: ++n } : s,
        );
      });
    } catch (e: any) {
      notify("삭제 실패", e.message);
      load();
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

          {/*
            An adjusted board with nothing said about it reads as the app
            having forgotten last week's weights. One line, and only when
            something was actually changed.
          */}
          {!done && workout.condition && workout.condition !== "normal" && (
            <View style={styles.condition}>
              <Ionicons
                name={
                  workout.condition === "heavy"
                    ? "cloudy-outline"
                    : "sunny-outline"
                }
                size={16}
                color={colors.gold}
              />
              <Text style={styles.conditionText}>
                오늘 · {conditionLabel(workout.condition)}
                {(() => {
                  const note = conditionNote(workout.condition, sets.length);
                  return note ? ` · ${note}` : "";
                })()}
                {"\n"}
                {conditionLine(workout.condition)}
              </Text>
            </View>
          )}

          {/* Otherwise this screen is a spreadsheet you sweat next to. */}
          {!done && (
            <Cheer
              doneSets={doneSets.length}
              totalSets={sets.length}
              suggestion={suggestion}
              onAccept={(picked) => {
                const exercise = exercises.find((e) => e.id === picked.id);
                if (exercise) void addExercise(exercise);
              }}
              onInvite={() => setPicking(true)}
            />
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
          const expanded = exerciseId === expandedId;

          return (
            <View key={exerciseId} style={styles.card}>
              <Pressable
                style={styles.cardHead}
                onPress={() => setOpened(expanded ? null : exerciseId)}
              >
                <View style={[styles.stripe, { backgroundColor: tint }]} />
                <View style={styles.cardHeadBody}>
                  <Text style={styles.cardTitle}>
                    {exercise?.name ?? "삭제된 종목"}
                  </Text>
                  {expanded && !!exercise?.muscle_detail && (
                    <Text style={styles.cardSub}>
                      {exercise.muscle_detail} · {exercise.equipment}
                    </Text>
                  )}
                  {!expanded && (
                    <Text style={styles.cardSub}>
                      {exDone.length}/{exerciseSets.length}세트
                      {track === "weight_reps" && top > 0 && ` · 최고 ${top}kg`}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textDim}
                />
              </Pressable>

              {!expanded ? null : (
                <>
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

                  {/*
                    The board already carries last time's weight forward, and
                    said nothing about whether it had been earned — so the
                    number that got you here could sit there for months. Only
                    shown when there is something to change: staying put is
                    what already happens, and a line every session saying
                    nothing changed is one people learn to look past.
                  */}
                  {(() => {
                    if (done || !expanded || track !== "weight_reps") return null;
                    const read = previous ? readiness(previous.sets) : null;
                    const word = progressWord(read);
                    if (!word || !read) return null;
                    return (
                      <View style={styles.suggest}>
                        <Ionicons
                          name={
                            read.verdict === "add"
                              ? "trending-up-outline"
                              : "trending-down-outline"
                          }
                          size={15}
                          color={colors.gold}
                        />
                        <Text style={styles.suggestText}>{word}</Text>
                        <Pressable
                          style={styles.suggestButton}
                          onPress={() => applyWeight(exerciseId, read.weight)}
                        >
                          <Text style={styles.suggestButtonText}>
                            {applyLabel(read)}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })()}

                  {done ? (
                    <View style={styles.circleRow}>
                      {exDone.map((s) => (
                        <View key={s.id} style={styles.circleItem}>
                          <View
                            style={[styles.circle, { backgroundColor: tint }]}
                          >
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
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color={tint}
                              />
                              <Text
                                style={[styles.doneChipText, { color: tint }]}
                              >
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
                        <Text style={styles.allDone}>
                          이 종목은 다 하셨어요 🎉
                        </Text>
                      )}

                      {/*
                    Only once the exercise is finished. With a set still in
                    front of you the thing to do is finish it, and two large
                    buttons side by side made that a choice rather than a step.
                  */}
                      {track === "weight_reps" && !current && (
                        <Pressable
                          style={styles.addSet}
                          onPress={() => addSet(exerciseId)}
                        >
                          <Ionicons
                            name="add"
                            size={18}
                            color={colors.accent}
                          />
                          <Text style={styles.addSetText}>세트 추가</Text>
                        </Pressable>
                      )}
                    </>
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
              // "운동" means a session here and an exercise two buttons above,
              // so this says which one, and what is actually lost.
              confirmAction(
                "오늘 기록 삭제",
                doneSets.length
                  ? `기록한 ${doneSets.length}세트가 모두 지워지고 되돌릴 수 없어요.`
                  : "이 기록을 지우고 나갈까요?",
                discard,
              )
            }
          >
            <Text style={styles.discardText}>오늘 기록 삭제</Text>
          </Pressable>
        )}
      </ScrollView>

      {!done && (
        <View style={styles.bottomBar}>
          <RestBar
            exerciseName={restExercise?.name ?? null}
            length={restLength}
            remaining={restRemaining}
            grain={REST_GRAIN}
            onAdjust={(delta) =>
              restEnd === null
                ? changeRest(delta)
                : setRestEnd((end) =>
                    Math.max(Date.now(), (end ?? Date.now()) + delta * 1000),
                  )
            }
            onStart={() => {
              setRestFor(restExercise?.id ?? null);
              setRestEnd(Date.now() + restLength * 1000);
            }}
          />

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
              <Text style={styles.finishText}>오늘의 운동 완료</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ExercisePicker
        usage={usage}
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

  // Adopt a memo that changed underneath us — reloaded, or saved elsewhere —
  // during render rather than in an effect, which would paint the stale text
  // first and then replace it.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }

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
  condition: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderColor: colors.gold,
    borderWidth: 1,
  },
  conditionText: { color: colors.text, fontSize: 12, lineHeight: 19, flex: 1 },
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
  suggest: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderColor: colors.gold,
    borderWidth: 1,
  },
  suggestText: { color: colors.text, fontSize: 12, lineHeight: 18, flex: 1 },
  suggestButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  suggestButtonText: { color: "#fff", fontWeight: "800", fontSize: 12 },
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
