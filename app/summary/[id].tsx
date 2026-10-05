import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { AdviceCard } from '@/components/AdviceCard';
import { BragCard } from '@/components/BragCard';
import { FirstDayCard } from '@/components/FirstDayCard';
import { ScreenState } from '@/components/ScreenState';
import { explain } from '@/lib/dbError';
import { notify } from '@/lib/confirm';
import {
  getActiveWorkout,
  getLastPerformance,
  getLedger,
  getWorkout,
  getWorkoutDetail,
  monthOfSessions,
  previousRoutineSession,
  type SessionLine,
  listWorkoutFacts,
  repeatWorkout,
  type Ledger,
  type WorkoutDetailExercise,
  writeDiaries,
} from '@/lib/db';
import { firstDayStep, isFirstWorkout } from '@/lib/firstDay';
import { girlOf, useGirl } from '@/lib/girl';
import { formatDate } from '@/lib/format';
import { GOALS, PLACES } from '@/lib/onboarding';
import { getGoal, getPlace, getWeeklyGoal } from '@/lib/prefs';
import { computeStats } from '@/lib/character';
import { summarise, type WorkoutFact } from '@/lib/gamification';
import type { Workout } from '@/lib/types';
import { adorned } from '@/lib/shop';
import { colors, radius, spacing } from '@/lib/theme';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const girl = useGirl();
  const card = useRef<View>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [items, setItems] = useState<WorkoutDetailExercise[]>([]);
  const [fact, setFact] = useState<WorkoutFact | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof summarise> | null>(null);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);
  // The heaviest set of each movement last time, for 「지난번보다」.
  const [lastTime, setLastTime] = useState<Map<string, number>>(new Map());
  // The last outing of this same routine, for reading the two boards against
  // each other — including what is missing from today's.
  const [previous, setPrevious] = useState<Awaited<
    ReturnType<typeof previousRoutineSession>
  > | null>(null);
  const [month, setMonth] = useState<SessionLine[]>([]);
  const [plan, setPlan] = useState<{ goal: string; place: string; perWeek: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    Promise.all([getWorkoutDetail(id), listWorkoutFacts()])
      .then(([detail, facts]) => {
        setWorkout(detail.workout);

        // Paying writes her entry without waiting, so the card can open
        // before it is there. Write it here too (only where there is none)
        // and read the line back.
        if (detail.workout.ended_at && !detail.workout.diary && detail.items.length) {
          void writeDiaries(girl.id)
            .then(() => getWorkout(id))
            .then((w) => {
              if (w.diary) setWorkout((prev) => (prev ? { ...prev, diary: w.diary, diary_by: w.diary_by } : prev));
            })
            .catch(() => {});
        }
        setItems(detail.items);
        setFact(facts.find((f) => f.id === id) ?? null);
        setFacts(facts);
        setSummary(summarise(facts));

        // The card is what gets sent to other people, and on it she wears
        // what she was given (docs/direction.md) — it was her gym clothes
        // until 2026-10-03. Read on every focus, so coming back from the shop
        // on the first day shows her in the gift.
        getLedger()
          .then(setLedger)
          .catch(() => {});

        // Only feeds the adviser's 「지난번보다」, so the screen never waits.
        const ids = [...new Set(detail.items.map((i) => i.exercise_id))];
        getLastPerformance(ids, id)
          .then((seen) =>
            setLastTime(
              new Map(
                [...seen].map(([exerciseId, point]) => [
                  exerciseId,
                  Math.max(0, ...point.sets.map((s) => s.weight_kg)),
                ])
              )
            )
          )
          .catch(() => {});

        // Only feeds the adviser's 「지난번 같은 루틴」, so it is never waited on.
        previousRoutineSession(id)
          .then(setPrevious)
          .catch(() => {});

        // The month, and what they said they came for. Both only widen what
        // the adviser can see, so neither holds the screen up.
        monthOfSessions()
          .then(setMonth)
          .catch(() => {});
        Promise.all([getGoal(), getPlace(), getWeeklyGoal()])
          .then(([goal, place, perWeek]) =>
            setPlan(
              goal && place
                ? {
                    goal: GOALS.find((g) => g.id === goal)?.label ?? goal,
                    place: PLACES.find((p) => p.id === place)?.label ?? place,
                    perWeek,
                  }
                : null
            )
          )
          .catch(() => {});
      })
      .catch((e) => setError(e.message));
  }, [id, girl.id]);

  useFocusEffect(load);

  /*
    What was actually done, for the adviser.

    Built here because this screen already holds the detail, and without it the
    facts block is four aggregate numbers — which is all the advice could ever
    be made of. Last time's best comes from one extra query rather than the
    session totals, because 「지난번보다 올랐다」 is the thing worth saying and
    nothing in the totals can tell you that about one movement.
  */
  const done = useMemo(
    () =>
      items.map((item) => {
        const finished = item.sets.filter((s) => s.done && !s.warmup);
        const top = finished.reduce(
          (best, s) => (s.weight_kg > best.weight_kg ? s : best),
          finished[0] ?? { weight_kg: 0, reps: 0 }
        );
        return {
          name: item.exercise?.name ?? '삭제된 종목',
          sets: finished.length,
          topWeight: item.topWeight,
          topReps: top.reps,
          lastTop: lastTime.get(item.exercise_id) ?? null,
          seconds: finished.reduce((sum, s) => sum + s.duration_sec, 0),
          rest: item.exercise?.rest_sec,
        };
      }),
    [items, lastTime]
  );

  // The same board as it stood last time, described the same way — the point
  // is that the two lists can be read against each other.
  const previousSession = useMemo(
    () =>
      previous
        ? {
            date: formatDate(previous.started_at, 'short'),
            done: previous.items.map((item) => {
              const finished = item.sets.filter((x) => x.done && !x.warmup);
              const top = finished.reduce(
                (best, x) => (x.weight_kg > best.weight_kg ? x : best),
                finished[0] ?? { weight_kg: 0, reps: 0 }
              );
              return {
                name: item.exercise?.name ?? '삭제된 종목',
                sets: finished.length,
                topWeight: item.topWeight,
                topReps: top.reps,
                lastTop: null,
                seconds: finished.reduce((sum, x) => sum + x.duration_sec, 0),
              };
            }),
          }
        : null,
    [previous]
  );

  // One line per session: date, what it was called, and the movements with
  // the weight that mattered.
  const monthLines = useMemo(
    () =>
      month.map((s) => ({
        date: formatDate(s.started_at, 'short'),
        title: s.title,
        did: s.did
          .map((d) => (d.topWeight > 0 ? `${d.name} ${d.topWeight}kg` : `${d.name} ${d.sets}세트`))
          .join(', '),
      })),
    [month]
  );

  // Null when nobody recorded it, which is what the card shows as 「—」.
  const minutes = useMemo(() => {
    if (!workout?.ended_at) return null;
    const span = +new Date(workout.ended_at) - +new Date(workout.started_at);
    return span >= 60_000 && span < 4 * 60 * 60 * 1000 ? Math.round(span / 60_000) : null;
  }, [workout]);

  // Must be stable: AdviceCard refetches whenever this object's identity changes.
  const adviceContext = useMemo(
    () =>
      fact && summary
        ? {
            today: fact,
            done,
            minutes,
            previous: previousSession,
            plan,
            month: monthLines,
            history: facts,
            stats: computeStats(facts),
            streak: summary.streak,
          }
        : null,
    [fact, done, minutes, previousSession, plan, monthLines, facts, summary]
  );

  async function repeat() {
    if (!id) return;
    try {
      const active = await getActiveWorkout();
      if (active) {
        notify('진행 중인 운동이 있어요', '먼저 마무리해 주세요.');
        router.push({ pathname: '/workout/[id]', params: { id: active.id } });
        return;
      }
      const created = await repeatWorkout(id);
      router.replace({ pathname: '/workout/[id]', params: { id: created.id } });
    } catch (e: any) {
      notify('다시 하기 실패', explain(e));
    }
  }

  async function share() {
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1 });
      if (Platform.OS === 'web') {
        // Sharing is unavailable in the browser, so hand over a download.
        const link = document.createElement('a');
        link.href = uri;
        link.download = `refit-${formatDate(workout!.started_at).replace(/\./g, '')}.png`;
        link.click();
        return;
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else notify('공유를 쓸 수 없어요', '이미지는 저장되었어요.');
    } catch (e: any) {
      notify('저장 실패', explain(e));
    }
  }

  if (!workout || !fact || !summary) return <ScreenState error={error} onRetry={load} />;

  // Nothing of the first day is decided until the ledger answers: the offer
  // depends on the purse, and guessing would flash a button and take it away.
  const firstDay = ledger
    ? firstDayStep(facts, workout.id, ledger.house.gold, ledger.giftedOn !== null)
    : ({ step: 'none' } as const);
  const isFirst = isFirstWorkout(facts, workout.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isFirst && (
        <FirstDayCard
          diary={workout.diary ?? null}
          girlName={girlOf(workout.diary_by ?? girl.id).name}
          step={firstDay}
          gold={ledger?.house.gold ?? 0}
          // Straight to the thing the card just named. The shop opens on the
          // kitchen, and the ribbon is nine rows down another shelf.
          onGift={() =>
            router.push({
              pathname: '/shop',
              params: firstDay.step === 'invite' ? { gift: firstDay.gift.id } : {},
            })
          }
        />
      )}

      <BragCard
        ref={card}
        workout={workout}
        items={items}
        fact={fact}
        summary={summary}
        worn={ledger ? adorned(ledger.worn, ledger.wardrobe) : []}
        first={isFirst}
      />

      {/* On the first day her entry is at the top, large; not said twice. */}
      {workout.diary && !isFirst && (
        <View style={styles.diaryBox}>
          <Text style={styles.diary}>
            {workout.diary}
            <Text style={styles.diaryBy}> — {girlOf(workout.diary_by ?? '').name}</Text>
          </Text>
        </View>
      )}

      {adviceContext && (
        <AdviceCard
          context={adviceContext}
          saved={
            workout.advice
              ? { text: workout.advice, source: workout.advice_source ?? null, speaker: workout.advice_speaker ?? null }
              : null
          }
        />
      )}

      {/*
        What was done and what got written down are not always the same —
        a phone left in the locker, a set nobody ticked. This is where the
        record is put right, after the fact.
      */}
      <Pressable
        style={styles.repeat}
        onPress={() =>
          router.replace({ pathname: '/workout/[id]', params: { id: workout.id, edit: '1' } })
        }>
        <Ionicons name="create-outline" size={18} color={colors.accent} />
        <Text style={styles.repeatText}>운동 추가·삭제하기</Text>
      </Pressable>

      <Pressable style={styles.repeat} onPress={repeat}>
        <Ionicons name="repeat" size={18} color={colors.accent} />
        <Text style={styles.repeatText}>이 운동 그대로 다시 하기</Text>
      </Pressable>

      <Pressable style={styles.share} onPress={share}>
        <Ionicons name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={18} color="#fff" />
        <Text style={styles.shareText}>
          {Platform.OS === 'web' ? '이미지로 저장하기' : '이미지로 자랑하기'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        <Text style={styles.secondaryText}>닫기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.textDim, textAlign: 'center' },
  diaryBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md },
  diary: { color: colors.text, fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  diaryBy: { color: colors.textDim, fontSize: 12, fontStyle: 'normal' },
  repeat: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  repeatText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  share: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  shareText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryText: { color: colors.textDim, fontWeight: '600' },
});
