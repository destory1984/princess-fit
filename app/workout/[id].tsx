import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { SwapSheet } from "@/components/SwapSheet";
import { RestBar } from "@/components/RestBar";
import { SetCard } from "@/components/SetCard";
import { ScreenState } from "@/components/ScreenState";
import { confirmAction, notify } from "@/lib/confirm";
import {
  cancelRestAlarm,
  cancelStrayRestAlarms,
  scheduleRestAlarm,
} from "@/lib/notify";
import { celebrateFeedback, successFeedback } from "@/lib/feedback";

import { formatDate, formatDuration, formatKm } from "@/lib/format";
import { warmUpAdvice } from "@/lib/advice";
import { summarise } from "@/lib/gamification";
import {
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
  swapRemainingSets,
  listWorkoutFacts,
  listWorkoutSets,
  listRoutineExercises,
  addRoutineExercise,
  reorderWorkoutBlocks,
  updateWorkout,
  clampRest,
  DEFAULT_REST_SEC,
  REST_GRAIN,
  setExerciseRest,
  type ExerciseHistoryPoint,
} from "@/lib/db";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";
import { followOn, planFor } from "@/lib/setPlan";
import {
  applyLabel,
  progressWord,
  readiness,
  RIR_CHOICES,
  RIR_QUESTION,
} from "@/lib/progress";
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
import {
  getAskRoutine,
  getPlace,
  getRestEnd,
  setRestEnd as rememberRestEnd,
} from "@/lib/prefs";
import { recoveryOf, type Muscle } from "@/lib/recovery";
import { suggestExercise } from "@/lib/suggest";
import * as Crypto from "expo-crypto";
import {
  overlay,
  pendingRows,
  pendingWord,
  type PendingWrite,
} from "@/lib/outbox";
import {
  flushOutbox,
  forgetSet,
  saveSet,
  watchPending,
} from "@/lib/outboxStore";
import { remainingSeconds, remainingWord } from "@/lib/duration";
import { bringForward, canBringForward } from "@/lib/order";
import { balanceOf, balanceWord, isUnilateral, nextSide, type Side } from "@/lib/sides";
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
  // The block whose remaining sets are being handed to something else. The
  // block and not the movement: the same movement may be on the board twice,
  // and swapping the second visit must not touch the first.
  const [swapping, setSwapping] = useState<{
    blockId: string;
    exercise: Exercise;
  } | null>(null);
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
  /*
    For the movement she offers on an empty board: what has rested, and where
    they said they train.

    Null until the recovery read answers. An empty list is not "nothing is
    tired", it is "nobody has asked" — and suggesting from it means she names
    one movement and swaps it the moment the answer lands, which is the one
    thing a suggestion must never do.

    The place is waited for too, and wrapped rather than stored bare, because
    null is a real answer there — it means nobody was ever asked. Equipment
    outranks every other term in the scoring, so a place arriving one tick late
    would swap a barbell movement for a bodyweight one in front of you.
  */
  const [muscles, setMuscles] = useState<Muscle[] | null>(null);
  const [place, setPlace] = useState<{ value: Place | null } | null>(null);
  /*
    Edits that have not reached the server. Held in a ref as well as state
    because `load` reads them while re-laying the board, and a reload that saw
    a stale copy would be the very thing this is here to prevent.
  */
  const [unsent, setUnsent] = useState<PendingWrite[]>([]);
  const unsentRef = useRef<PendingWrite[]>([]);

  useEffect(
    () =>
      watchPending((pending) => {
        unsentRef.current = pending;
        setUnsent(pending);
      }),
    [],
  );

  useEffect(() => {
    let alive = true;
    listMuscleLoad()
      .then((sessions) => alive && setMuscles(recoveryOf(sessions)))
      .catch(() => {
        // Without it she offers no particular movement and falls back to
        // 「종목을 하나 골라볼까요?」, which is a smaller loss than a wrong pick.
      });
    getPlace()
      .then((stored) => alive && setPlace({ value: stored }))
      .catch(() => alive && setPlace({ value: null }));
    return () => {
      alive = false;
    };
  }, []);

  const unsentWord = pendingWord(unsent);

  // Rest comes from the exercise, which is where it was set; a movement that
  // has gone missing falls back to the default rather than counting as zero.
  const restOfExercise = (exerciseId: string) =>
    exercises.find((e) => e.id === exerciseId)?.rest_sec ?? DEFAULT_REST_SEC;
  const leftWord = remainingWord(remainingSeconds(sets, restOfExercise));

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    Promise.all([getWorkout(id), listWorkoutSets(id), listExercises()])
      .then(async ([w, s, e]) => {
        setWorkout(w);
        // The server's rows, with anything that has not reached it laid back
        // on top. Without this a reload is what loses the set you just typed.
        // Server rows with unsent edits laid over them, then the sets that
        // exist only in the queue — those have no row underneath to lay over.
        const mine = unsentRef.current;
        setSets([
          ...overlay(s, mine),
          ...(pendingRows(mine).filter(
            (r) => r.workout_id === id && !s.some((x) => x.id === r.id),
          ) as WorkoutSet[]),
        ]);
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

  useFocusEffect(
    useCallback(() => {
      // Coming back to the screen is the commonest moment for the signal to
      // have returned — a pocket, a lift, a walk out of the basement.
      void flushOutbox().finally(load);
    }, [load]),
  );

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

  /*
    A rest survives the app being closed.

    The bell always did — it is booked with the OS. The countdown did not: it
    lived here, so glancing at another app and coming back showed a rest that
    was never happening. 「휴식타이머 켜져있을때 아이폰 화면 들어가면 타이머
    꺼져버림」, from the reviews of the app this is measured against.

    Restored before it is mirrored, and the mirror waits for that — otherwise
    the first render's null would wipe the stored value a moment before the
    read that was going to recover it.
  */
  const [restRestored, setRestRestored] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getRestEnd(id)
      .then(async (at) => {
        if (!alive || !at) return;
        // The bell booked before the app was killed is still with the OS, and
        // setting the end below books another. Two rings for one rest.
        await cancelStrayRestAlarms();
        if (alive) setRestEnd(at);
      })
      .finally(() => alive && setRestRestored(true));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !restRestored) return;
    void rememberRestEnd(id, restEnd);
  }, [id, restEnd, restRestored]);

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

  /*
    The board, in blocks.

    Grouped by position rather than by exercise, which is the whole of this
    change: 「A머신 사용이후 마지막단계 A머신 한번더 사용한 기록을 올릴수
    있도록 머신 두번 ADD 할수있도록 해주세요」. Keyed by exercise, a second
    visit to the bench silently folded into the first card, and the board
    disagreed with the hour — the two blocks were half an hour and four other
    movements apart.

    A block is identified by its position as a string, because the screen's
    state has always been keyed by a string and a number would only mean
    tracking down every === in the file to no purpose.
  */
  const grouped = useMemo(() => {
    const map = new Map<number, WorkoutSet[]>();
    for (const s of sets) {
      const list = map.get(s.position) ?? [];
      list.push(s);
      map.set(s.position, list);
    }
    return [...map.entries()]
      .map(([position, list]) => ({
        blockId: String(position),
        position,
        exerciseId: list[0].exercise_id,
        exercise: byId.get(list[0].exercise_id) ?? null,
        sets: [...list].sort((a, b) => a.set_no - b.set_no),
      }))
      // Ordered by the stored position rather than by whatever order the rows
      // arrived in. Those matched until the board could be reordered — after
      // which the numbers changed and nothing on screen moved, which looks
      // exactly like the tap being missed.
      .sort((a, b) => a.position - b.position);
  }, [sets, byId]);

  // What the reorder button asks about: which movements are behind which, and
  // which of them are finished.
  const boardOrder = grouped.map((g) => ({
    blockId: g.blockId,
    done: g.sets.every((x) => x.done),
  }));

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
      sets.length > 0 || muscles === null || place === null
        ? null
        : suggestExercise(exercises, muscles, {
            place: place.value,
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
    opened ?? upNext?.blockId ?? grouped[grouped.length - 1]?.blockId ?? null;
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
  function applyWeight(position: number, weight: number) {
    const waiting = sets.filter((x) => x.position === position && !x.done);
    if (waiting.length === 0) return;
    setSets((prev) =>
      prev.map((x) =>
        waiting.some((w) => w.id === x.id) ? { ...x, weight_kg: weight } : x,
      ),
    );
    void Promise.all(
      waiting.map((x) => saveSet(x.id, { weight_kg: weight })),
    ).then((landed) => {
      // Queued counts as saved here: the number is on the screen and in the
      // outbox, and the banner already says what has not gone out yet.
      if (landed.every(Boolean)) successFeedback();
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
          // Queued rather than dropped on failure — this was the line that
          // said 「a failed save shows up on reload」, which was true and was
          // the bug: what showed up was the older number.
          void Promise.all(waiting.map((w) => saveSet(w.id, carry)));
        }
      }
    }
    // No notify and no reload: an edit that cannot go out now goes out later,
    // and the banner says how many are waiting. Interrupting someone between
    // sets to tell them about a signal they cannot do anything about was the
    // old behaviour, and it took their numbers away as it went.
    await saveSet(setId, patch);
  }

  async function completeAll() {
    const pending = sets.filter((s) => !s.done);
    if (pending.length === 0) return;
    setSets((prev) => prev.map((s) => ({ ...s, done: true })));
    await Promise.all(pending.map((s) => saveSet(s.id, { done: true })));
  }

  /**
   * Put a set on the board, named here rather than by the server.
   *
   * The id is made before anything is sent, so the set exists as far as this
   * screen and the queue are concerned whether or not the write lands. Every
   * edit that follows has something to point at, which is the whole reason a
   * set can now be added in a basement.
   */
  async function newSet(
    exerciseId: string,
    position: number,
    setNo: number,
    weight: number,
    reps: number,
    side: Side | null = null,
  ) {
    const row = {
      id: Crypto.randomUUID(),
      workout_id: id!,
      exercise_id: exerciseId,
      position,
      set_no: setNo,
    };
    const set = {
      ...row,
      weight_kg: weight,
      reps,
      duration_sec: 0,
      distance_km: 0,
      done: false,
      side,
    } as WorkoutSet;
    setSets((prev) => [...prev, set]);
    await saveSet(row.id, { weight_kg: weight, reps, side }, row);
    return set;
  }

  /**
   * 「이거 먼저 할게요」 — the rack is free now, or the machine is taken.
   *
   * The screen moves first and the write follows. A reorder that waits on the
   * network before anything visibly happens feels like the tap was missed,
   * and it is exactly the tap someone makes while walking across a gym.
   */
  async function bringForwardTo(blockId: string) {
    if (!id) return;
    const next = bringForward(boardOrder, blockId);
    if (next === boardOrder) return;

    const setsOf = new Map(grouped.map((g) => [g.blockId, g.sets.map((x) => x.id)]));
    const moved = next.map((e, position) => ({
      setIds: setsOf.get(e.blockId) ?? [],
      position,
    }));

    const at = new Map<string, number>();
    for (const block of moved) for (const setId of block.setIds) at.set(setId, block.position);
    setSets((prev) => prev.map((x) => ({ ...x, position: at.get(x.id) ?? x.position })));

    try {
      await reorderWorkoutBlocks(moved);
    } catch (e: any) {
      notify("순서 바꾸기 실패", e.message);
      load();
    }
  }

  async function addSet(position: number) {
    if (!id) return;
    // This block's sets, not every set of this movement — the same movement
    // may be sitting further down the board as a block of its own.
    const existing = sets.filter((s) => s.position === position);
    const exerciseId = existing[0]?.exercise_id;
    if (!exerciseId) return;
    const previous = existing[existing.length - 1];
    const lastTime = last.get(exerciseId)?.sets;
    // Prefer the last set actually finished today: the one at the end of the
    // list may be a planned set still sitting at zero.
    const lastDone = [...existing].reverse().find((s) => s.done);
    const template =
      lastDone ??
      previous ??
      lastTime?.[Math.min(existing.length, lastTime.length - 1)];
    // A one-sided movement alternates, so adding a set asks for the arm that
    // has not just been done rather than repeating the last one.
    const sided = isUnilateral(byId.get(exerciseId)?.name ?? '');
    await newSet(
      exerciseId,
      position,
      existing.length + 1,
      template?.weight_kg ?? 0,
      template?.reps ?? 10,
      sided ? nextSide(existing) : null,
    );
    if (!last.has(exerciseId)) {
      try {
        const fetched = await getLastPerformance([exerciseId], id);
        if (fetched.size) setLast((prev) => new Map([...prev, ...fetched]));
      } catch {
        // Only the 「지난번」 line; the set itself is already on the board.
      }
    }
  }

  /**
   * Put an exercise on the board with the sets it is likely to need: the ones
   * it ended on last time, or a plain preset if it has never been done. Adding
   * a single empty set meant typing the whole thing out again every session.
   */
  /**
   * Hand the sets still ahead to a different movement.
   *
   * Reloaded afterwards rather than patched in place: the swap regroups the
   * board, moves the history line and changes what 「지난번」 means for two
   * cards at once, and reproducing all of that by hand is how the screen and
   * the table drift apart.
   */
  async function swapTo(replacement: Exercise) {
    const from = swapping;
    setSwapping(null);
    if (!id || !from) return;
    const block = grouped.find((g) => g.blockId === from.blockId);
    const ahead = (block?.sets ?? []).filter((x) => !x.done).map((x) => x.id);
    if (ahead.length === 0) return;
    try {
      await swapRemainingSets(ahead, replacement.id);
      load();
    } catch (e: any) {
      notify('바꾸기 실패', e.message);
    }
  }

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
    /*
      Sequential rather than in parallel: each one appends to the board, and
      the queue they may end up in has to keep the order they were planned in.

      A one-sided movement gets each planned set twice, left then right. Three
      sets of a split squat is six trips to the floor, and a board that says
      three is a board that is lying about the afternoon ahead.
    */
    const sided = isUnilateral(exercise.name);
    let setNo = 0;
    for (const planned of plan) {
      for (const side of sided ? (['L', 'R'] as Side[]) : [null]) {
        setNo += 1;
        await newSet(exercise.id, position, setNo, planned.weight, planned.reps, side);
      }
    }
    void offerToRoutine(exercise);
  }

  /**
   * 「이 종목, 루틴에도 넣어둘까요?」 — asked after the fact, never before.
   *
   * Adding something to today is a decision about today. Asking first would
   * put a question about next week between someone and the set they came to
   * do, so the movement goes on the board immediately and the question comes
   * afterwards, where it can be ignored.
   *
   * Not asked at all when the answer cannot matter: no routine behind this
   * session, the movement already in it, or the person has said stop asking.
   * That last one is why the switch exists — from a review of the app this
   * borrows from, 「바꾸고 싶지 않던 기존 플랜 변경 버튼이 눌립니다」. A
   * question asked often enough becomes a trap.
   */
  async function offerToRoutine(exercise: Exercise) {
    const routineId = workout?.routine_id;
    if (!routineId) return;
    try {
      if (!(await getAskRoutine())) return;
      const already = await listRoutineExercises(routineId);
      if (already.some((r) => r.exercise_id === exercise.id)) return;

      confirmAction(
        '루틴에도 넣을까요?',
        `"${exercise.name}"을(를) 이 루틴에 넣어두면 다음에도 같이 나와요.

` +
          '오늘 기록은 이미 저장됐으니, 넣지 않으셔도 괜찮아요.',
        async () => {
          try {
            await addRoutineExercise(routineId, exercise.id, already.length);
          } catch (e: any) {
            notify('루틴에 넣지 못했어요', e.message);
          }
        },
      );
    } catch {
      // The set is on the board either way; a failure here costs only the ask.
    }
  }

  /**
   * Take one set off the board. The exercise is a grouping of its sets, so
   * removing the last one removes the exercise too — which is the only way to
   * drop an exercise now, and needs no separate button or confirmation.
   */
  async function removeSet(setId: string) {
    try {
      // Taken out of the queue first, or a set added offline would be brought
      // back by its own unsent insert the moment the signal returned. When it
      // was only ever in the queue there is nothing on the server to delete.
      const neverSent = await forgetSet(setId);
      if (!neverSent) await deleteWorkoutSet(setId);
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

      /*
        Pay her for the session. A failure here must not swallow the workout,
        which is already safely saved — but it must not be swallowed either.
        `settle` only ever charges the days that have passed; it has no notion
        of a session it still owes for, so gold that fails to land is gone and
        nothing would ever have said so.

        Retried once, because the realistic failure is a blip between two
        queries that had just succeeded. If it still will not go through, it is
        said out loud rather than left to a recovery that does not exist.
      */
      let earned = 0;
      let unpaid = false;
      const fact = facts.find((f) => f.id === id);
      if (fact) {
        try {
          earned = (await payForWorkout(fact)).gold;
        } catch {
          try {
            earned = (await payForWorkout(fact)).gold;
          } catch {
            unpaid = true;
          }
        }
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
      if (unpaid) {
        notify(
          "골드를 넣지 못했어요",
          "운동 기록은 저장됐어요. 이번 골드만 들어가지 않았어요.",
        );
      } else if (lines.length) notify(title, lines.join("\n"));
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

          {/*
            The answer to 「이거 오늘 안에 끝나나」, which is a question asked in
            a doorway with a coat on. Counted from what is left rather than the
            original total, or it would go on announcing the same number all
            session and stop being read by the third set.
          */}
          {!done && leftWord && (
            <View style={styles.condition}>
              <Ionicons name="time-outline" size={16} color={colors.gold} />
              <Text style={styles.conditionText}>{leftWord}</Text>
            </View>
          )}

          {/*
            Shown only when something is actually waiting. A status line that
            is always there stops being read, and the whole promise is that a
            bad signal is not something anyone has to think about. Tapping it
            tries again, for the one who would rather not wait for the lift.
          */}
          {unsentWord && (
            <Pressable style={styles.unsent} onPress={() => void flushOutbox()}>
              <Ionicons name="cloud-offline-outline" size={15} color={colors.gold} />
              <Text style={styles.unsentText}>{unsentWord}</Text>
            </Pressable>
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

        {grouped.map(({ blockId, position, exerciseId, exercise, sets: exerciseSets }) => {
          const previous = last.get(exerciseId);
          const exDone = exerciseSets.filter((s) => s.done);
          // What counts as the session's work. Warm-ups are done and real and
          // still not what the top weight, the record or the question is about.
          const exWorking = exDone.filter((s) => !s.warmup);
          const current = exerciseSets.find((s) => !s.done) ?? null;
          const track = exercise?.track_type ?? "weight_reps";
          const top = Math.max(0, ...exWorking.map((s) => s.weight_kg));
          const oneRm = Math.max(
            0,
            ...exWorking.map((s) => estimateOneRm(s.weight_kg, s.reps)),
          );
          const totalSec = exDone.reduce((sum, s) => sum + s.duration_sec, 0);
          const totalKm = exDone.reduce((sum, s) => sum + s.distance_km, 0);
          const tint = muscleColor(exercise?.muscle_group ?? "기타");
          const previousBest = bests.get(exerciseId) ?? 0;
          const isRecord =
            track === "weight_reps" && previousBest > 0 && top > previousBest;
          const expanded = blockId === expandedId;

          return (
            <View key={blockId} style={styles.card}>
              <Pressable
                style={styles.cardHead}
                onPress={() => setOpened(expanded ? null : blockId)}
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
                {/*
                  The one place you actually want the how-to is standing in
                  front of the machine, and until now it lived only in
                  설정 → 운동 종목 — three taps away and out of the workout.
                */}
                {exercise && (
                  <Pressable
                    hitSlop={10}
                    style={styles.cardInfo}
                    onPress={() =>
                      router.push({
                        pathname: "/exercise/[id]",
                        params: { id: exercise.id },
                      })
                    }
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={19}
                      color={colors.textDim}
                    />
                  </Pressable>
                )}
                {/*
                  Offered only while sets remain, and only once the session is
                  still open: swapping a card with nothing left ahead of it
                  would do nothing, and an offer that does nothing is worse
                  than no offer.
                */}
                {exercise && !done && exDone.length < exerciseSets.length && (
                  <Pressable
                    hitSlop={10}
                    style={styles.cardInfo}
                    onPress={() => setSwapping({ blockId, exercise })}
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={19}
                      color={colors.textDim}
                    />
                  </Pressable>
                )}
                {/*
                  Not dragging. One tap that means 「이거 먼저 할게요」, which is
                  the only thing anyone wants while standing in a gym — and the
                  app this borrows from had dragging, which is what its own
                  users complained was slow. Hidden on the one already next,
                  because a button that visibly does nothing teaches people to
                  stop trusting the buttons.
                */}
                {!done && canBringForward(boardOrder, blockId) && (
                  <Pressable
                    hitSlop={10}
                    style={styles.cardInfo}
                    onPress={() => bringForwardTo(blockId)}
                  >
                    <Ionicons
                      name="arrow-up-circle-outline"
                      size={19}
                      color={colors.textDim}
                    />
                  </Pressable>
                )}
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
                      {totalKm > 0 && ` · ${formatKm(totalKm)}km`}
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
                    The answer to 「어느 쪽이 약한가요」, which is the whole
                    reason the sides are recorded at all. Read off today's
                    board, so it appears as the second side is finished rather
                    than next week — and silent when they are close, which is
                    most of the time.
                  */}
                  {(() => {
                    const said = balanceWord(
                      balanceOf(exDone),
                      exercise?.name ?? "이 종목",
                    );
                    return said ? (
                      <View style={styles.balance}>
                        <Ionicons name="git-compare-outline" size={14} color={colors.gold} />
                        <Text style={styles.balanceText}>{said}</Text>
                      </View>
                    ) : null;
                  })()}

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
                    // Whether they answered last time, so she can speak as
                    // someone who was told rather than someone who guessed.
                    const told =
                      typeof previous?.sets[previous.sets.length - 1]?.rir === "number";
                    const word = progressWord(read, told);
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
                          onPress={() => applyWeight(position, read.weight)}
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
                                ? `분 · ${formatKm(s.distance_km)}km`
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
                        <>
                          <Text style={styles.allDone}>
                            이 종목은 다 하셨어요 🎉
                          </Text>
                          {/*
                            Asked once a movement is finished, and only then.
                            After every set it would be the thing a review of
                            the app this borrows from called 「쓸데없는 말이 너무
                            많음」; before the set it would be a question about
                            effort not yet spent. Answering is optional — the
                            card reads the same whether or not anyone does.
                          */}
                          {(() => {
                            // The last working set, not the last row: asking
                            // how much was left in a warm-up answers nothing.
                            const working = exerciseSets.filter((x) => !x.warmup);
                            const lastSet = working[working.length - 1];
                            if (!lastSet || track !== "weight_reps") return null;
                            if (lastSet.weight_kg <= 0) return null;
                            if (typeof lastSet.rir === "number") {
                              return (
                                <Text style={styles.rirSaid}>
                                  {
                                    RIR_CHOICES.find((c) => c.rir === lastSet.rir)
                                      ?.label
                                  }{" "}
                                  더 하실 수 있었다고 하셨어요.
                                </Text>
                              );
                            }
                            return (
                              <View style={styles.rir}>
                                <Text style={styles.rirAsk}>{RIR_QUESTION}</Text>
                                <View style={styles.rirRow}>
                                  {RIR_CHOICES.map((choice) => (
                                    <Pressable
                                      key={choice.rir}
                                      style={styles.rirChip}
                                      onPress={() =>
                                        persist(lastSet.id, { rir: choice.rir })
                                      }
                                    >
                                      <Text style={styles.rirChipText}>
                                        {choice.label}
                                      </Text>
                                    </Pressable>
                                  ))}
                                </View>
                                <Text style={styles.rirWhy}>
                                  다음에 무게를 올릴지 정할 때 써요. 안 고르셔도 돼요.
                                </Text>
                              </View>
                            );
                          })()}
                        </>
                      )}

                      {/*
                    Only once the exercise is finished. With a set still in
                    front of you the thing to do is finish it, and two large
                    buttons side by side made that a choice rather than a step.
                  */}
                      {track === "weight_reps" && !current && (
                        <Pressable
                          style={styles.addSet}
                          onPress={() => addSet(position)}
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

      <SwapSheet
        target={swapping?.exercise ?? null}
        exercises={exercises}
        doneCount={
          grouped.find((g) => g.blockId === swapping?.blockId)?.sets.filter((x) => x.done)
            .length ?? 0
        }
        onPick={swapTo}
        onClose={() => setSwapping(null)}
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
  // Whether there is typing here that the workout has not been told about.
  // State rather than a ref: it is read while deciding what to render.
  const [dirty, setDirty] = useState(false);

  /*
    Adopt a memo that changed underneath us — reloaded, or saved elsewhere —
    during render rather than in an effect, which would paint the stale text
    first and then replace it.

    Unless something is being typed. Returning to this screen reloads it, and
    the reload used to hand back the server's older memo, which landed here and
    replaced the sentence half written in the box. That is how a memo goes
    missing without anything reporting an error.
  */
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (!dirty) setText(value);
  }

  /*
    Saved while typing, not only when the box is let go of.

    Blur is not a promise. The app is backgrounded mid-sentence, the phone is
    put in a pocket, the session is ended from the button above — and on none
    of those paths is the field guaranteed to be told it lost focus. A memo is
    usually written in exactly those moments, which is why it was the thing
    that kept disappearing.
  */
  // Held in a ref because the parent rebuilds it on every render, and the rest
  // countdown re-renders twice a second — a timer that restarted with it would
  // never once reach the end of its wait.
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      setDirty(false);
      commit.current(text);
    }, 1200);
    return () => clearTimeout(timer);
  }, [text, dirty]);

  return (
    <TextInput
      style={styles.memo}
      placeholder="컨디션, 통증, 다음에 올릴 무게…"
      placeholderTextColor={colors.textDim}
      value={text}
      editable={editable}
      multiline
      onChangeText={(next) => {
        setDirty(true);
        setText(next);
      }}
      onBlur={() => {
        setDirty(false);
        onCommit(text);
      }}
    />
  );
}

const styles = StyleSheet.create({
  balance: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  balanceText: { color: colors.textDim, fontSize: 12, lineHeight: 18, flex: 1 },
  rir: { gap: spacing.sm, paddingTop: spacing.md },
  rirAsk: { color: colors.text, fontSize: 13, fontWeight: "700" },
  rirRow: { flexDirection: "row", gap: spacing.sm },
  rirChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  rirChipText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  rirWhy: { color: colors.textDim, fontSize: 11, lineHeight: 17 },
  rirSaid: { color: colors.textDim, fontSize: 12, paddingTop: spacing.sm },
  unsent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  unsentText: { color: colors.text, fontSize: 12, lineHeight: 18, flex: 1 },
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
  cardInfo: { paddingHorizontal: spacing.xs },
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
