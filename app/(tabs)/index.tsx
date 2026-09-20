import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { explain } from '@/lib/dbError';
import { notify } from '@/lib/confirm';
import { ScreenState } from '@/components/ScreenState';
import { Advisor } from '@/components/Advisor';
import { ConditionPicker } from '@/components/ConditionPicker';
import { Purse } from '@/components/Purse';
import { TrainingHall } from '@/components/TrainingHall';
import { WalkCard } from '@/components/WalkCard';
import {
  archetypeOf,
  computeStats,
  conditionOf,
  conditionPenalty,
  masterSays,
  scaleStats,
} from '@/lib/character';
import type { Condition } from '@/lib/condition';
import type { Enrolment } from '@/lib/lessons';
import { roomMood } from '@/lib/room';
import {
  conditionFactor,
  dailyLine,
  tomorrowsMessage,
  type Household,
} from '@/lib/economy';
import { DEFAULT_WEEKLY_GOAL, getNudgeHour, getWeeklyGoal } from '@/lib/prefs';
import { cancelStrayRestAlarms, scheduleDailyMessage } from '@/lib/notify';
import {
  getActiveWorkout,
  getWeeklyStats,
  listExercises,
  listRoutineExercises,
  listRoutines,
  getLedger,
  recentRoutineUse,
  listWorkoutFacts,
  startWorkout,
  type WeeklyStats,
} from '@/lib/db';
import { summarise, type WorkoutFact } from '@/lib/gamification';
import type { Routine, Workout } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';
import { isRotation, nextInSplit, type RoutineUse } from '@/lib/split';

async function armDailyMessage(
  name: string,
  house: Household,
  facts: WorkoutFact[],
  lesson: Enrolment | null
) {
  try {
    const hour = await getNudgeHour();
    if (hour === null) return;
    await scheduleDailyMessage(name, tomorrowsMessage(house, facts, new Date(), lesson), hour);
  } catch {
    // She will try again the next time the app is opened.
  }
}

export default function TodayScreen() {
  const router = useRouter();
  const girl = useGirl();
  const [active, setActive] = useState<Workout | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineSizes, setRoutineSizes] = useState<Record<string, number>>({});
  const [exerciseCount, setExerciseCount] = useState(0);
  const [weekly, setWeekly] = useState<WeeklyStats>({ workouts: 0, volume: 0, streakDays: 0 });
  const [summary, setSummary] = useState<ReturnType<typeof summarise> | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof computeStats> | null>(null);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);
  const [house, setHouse] = useState<Household | null>(null);
  const [furniture, setFurniture] = useState<string[]>([]);
  const [worn, setWorn] = useState<string[]>([]);
  const [lesson, setLesson] = useState<Enrolment | null>(null);
  // The routine waiting on an answer about today's body, if one is.
  const [pending, setPending] = useState<{ routine: Routine | null } | null>(null);
  const [weeklyGoal, setWeeklyGoalState] = useState(DEFAULT_WEEKLY_GOAL);
  // Whether the answers have arrived. An empty routine list and a zero count
  // are also what this screen holds before it has asked anything, and telling
  // the two apart is the difference between greeting a newcomer and greeting
  // everyone, every launch, for as long as the query takes.
  const [loaded, setLoaded] = useState(false);
  const [routineUse, setRoutineUse] = useState<RoutineUse[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * What the screen needs in order to exist, and nothing else.
   *
   * The paint used to wait on two things it does not draw with: the whole
   * exercise catalogue, read only for a line in a guide that almost never
   * shows, and one query per routine for the "종목 N개" subtitle. Those ran
   * before the screen was allowed to appear, so a second routine meant a
   * longer blank screen — for a caption. They fill themselves in afterwards
   * now, against a screen that is already there.
   */
  const load = useCallback(() => {
    setError(null);
    Promise.all([getActiveWorkout(), listRoutines(), getWeeklyStats(), listWorkoutFacts()])
      .then(([a, r, w, facts]) => {
        setActive(a);
        // Nobody is resting if nobody is mid-workout, so anything still booked
        // is a bell the app was killed before it could call off. This is the
        // only place that knows both facts at once.
        if (!a) void cancelStrayRestAlarms();
        setRoutines(r);
        setWeekly(w);
        setFacts(facts);
        setSummary(summarise(facts));
        setStats(computeStats(facts));
        setLoaded(true);

        getWeeklyGoal().then(setWeeklyGoalState);
        getLedger()
          .then(({ house: h, furniture: mine, worn: dressed, lesson: course }) => {
            setHouse(h);
            setFurniture(mine);
            setWorn(dressed);
            setLesson(course);
            // Re-arm her daily message with the mood she will be in by then.
            // A failure here is never worth interrupting the screen for.
            void armDailyMessage(girl.name, h, facts, course);
          })
          .catch(() => setHouse(null));

        // Which routine the second start button offers. Off the critical path:
        // the button has a sensible thing to say without it.
        recentRoutineUse()
          .then(setRoutineUse)
          .catch(() => {});

        // Only decides whether the newcomer guide's first step is ticked.
        listExercises()
          .then((ex) => setExerciseCount(ex.length))
          .catch(() => {});

        Promise.all(
          r.map(
            async (routine) =>
              [routine.id, (await listRoutineExercises(routine.id)).length] as const
          )
        )
          .then((sizes) => setRoutineSizes(Object.fromEntries(sizes)))
          .catch(() => {
            // The subtitle stays as "종목을 더 담아 주세요" rather than lying.
          });
      })
      .catch((e) => setError(e.message));
  }, [girl.name]);

  useFocusEffect(load);

  /**
   * Starting asks one question first. A session already under way does not:
   * the body was asked about when it began, and asking again would be asking
   * about a different day than the one being recorded.
   */
  function begin(routine: Routine | null) {
    if (active) {
      router.push(`/workout/${active.id}`);
      return;
    }
    setPending({ routine });
  }

  async function beginWith(condition: Condition) {
    // Two taps on the sheet before the insert lands would start two sessions,
    // and the second would be the one you end up in while the first sits
    // half-finished in the history.
    if (starting) return;
    const routine = pending?.routine ?? null;
    setStarting(true);
    setPending(null);
    try {
      const w = await startWorkout(
        routine?.name ?? '오늘의 운동',
        routine?.id ?? null,
        condition
      );
      router.push(`/workout/${w.id}`);
    } catch (e: any) {
      notify('시작 실패', explain(e));
    } finally {
      setStarting(false);
    }
  }

  // Falls back to the newest routine, so the button is useful before the first
  // routine session has ever been finished.
  const ids = routines.map((r) => r.id);
  const nextRoutine =
    routines.find((r) => r.id === nextInSplit(routineUse, ids)) ?? routines[0] ?? null;
  const rotating = isRotation(routineUse, ids);

  // The one on the button is already on screen; listing it again below made
  // the same routine appear twice, above and below, on one screen. A session
  // under way hides the button, so then the list shows everything again.
  const otherRoutines = active ? routines : routines.filter((r) => r.id !== nextRoutine?.id);

  const isNew = loaded && weekly.workouts === 0 && routines.length === 0 && !active;

  // What she can show today, not what she once managed. Neglect dims it.
  const factor = house ? conditionFactor(house) : 1;
  const shownStats = stats ? scaleStats(stats, factor) : null;
  const penalty = conditionPenalty(factor);

  // Drawn all at once or not at all. The room, the purse and her line are all
  // absent until the queries answer, so a first paint without them puts the
  // start button alone at the top of the screen and then shoves it down — the
  // "바로 운동 시작 화면" that flashes past on launch.
  if (!loaded) return <ScreenState error={error} onRetry={load} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isNew && (
        <View style={styles.guide}>
          <Text style={styles.guideTitle}>처음이신가요?</Text>
          <Text style={styles.guideLead}>아래 순서대로 하시면 1분이면 첫 기록을 남길 수 있어요.</Text>
          <Step
            n={1}
            done={exerciseCount > 0}
            title="운동 종목 준비"
            body="아래 '바로 운동 시작'을 누르면 종목 고르는 창이 열려요. 거기서 기본 종목을 한 번에 불러올 수 있어요."
          />
          <Step
            n={2}
            done={false}
            title="무게와 횟수 입력"
            body="종목을 고르면 지금 할 세트가 크게 떠요. − + 로 무게와 횟수를 맞추고 '세트 완료'를 누르면 휴식 타이머가 돌아가요."
          />
          <Step
            n={3}
            done={false}
            title="운동 완료"
            body="다 하셨으면 아래 '운동 완료'를 누르세요. 오늘의 기록 카드가 뜨고, 기록·통계 탭에 쌓입니다."
          />
        </View>
      )}

      {summary && stats && shownStats && (
        <>
          <TrainingHall
            today={new Date()}
            rank={summary.title}
            level={summary.level}
            archetype={archetypeOf(stats).name}
            condition={conditionOf(stats, summary.streak)}
            stats={shownStats}
            streak={summary.streak}
            furniture={furniture}
            penalty={penalty}
            worn={worn}
            caption={roomMood(furniture)}
          />
          {house && (
            <Pressable onPress={() => router.push('/shop')}>
              <Purse house={house} opensShop />
            </Pressable>
          )}
          {/* The one reason to open this on a day you are not training. */}
          <WalkCard onFed={load} dense />
          <Advisor name={girl.name} portrait={girl.base}>
            {house ? dailyLine(house, facts, new Date(), lesson) : masterSays(stats, facts)}
          </Advisor>
        </>
      )}


      {/*
        A session under way is one thing to do, not two: offering to start a
        routine on top of one already running is offering to lose it.
      */}
      {active ? (
        <Pressable style={styles.primary} onPress={() => router.push(`/workout/${active.id}`)}>
          <View style={styles.primaryIcon}>
            <Ionicons name="play" size={26} color="#fff" />
          </View>
          <View style={styles.primaryBody}>
            <Text style={styles.primaryText}>진행 중인 운동 이어하기</Text>
            <Text style={styles.primarySub}>{active.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.accentSoft} />
        </Pressable>
      ) : (
        <View style={styles.starters}>
          <Pressable style={styles.starter} onPress={() => begin(null)}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.starterText}>바로 운동 시작</Text>
            <Text style={styles.starterSub}>종목은 나중에 골라요</Text>
          </Pressable>

          {/*
            One routine rather than a list of them: the list below already
            handles the others, and a second button that only opened that list
            would be a longer way to the same place. Which one is `nextInSplit`
            — the same routine for someone who has one, the other one for
            someone alternating. Named, so it is never a surprise which starts.
          */}
          <Pressable
            style={[styles.starter, styles.starterGhost]}
            onPress={() => (nextRoutine ? begin(nextRoutine) : router.push('/routines'))}>
            <Ionicons
              name={nextRoutine ? (rotating ? 'swap-horizontal' : 'repeat') : 'add-circle-outline'}
              size={22}
              color={colors.accent}
            />
            <Text style={[styles.starterText, styles.starterTextGhost]} numberOfLines={1}>
              {nextRoutine ? (rotating ? '다음 차례' : '루틴으로 시작') : '루틴 만들기'}
            </Text>
            {/*
              A routine's name, in the place where the other card keeps a hint
              — so it has to look like a name, not like a hint.

              A routine called 「2」 read as a count of routines sitting under a
              button labelled 루틴으로 시작, and the list below it looked like
              the same thing said twice. A longer name would have hidden the
              problem rather than fixed it: whatever is written here is the one
              thing that decides which session starts, and that is not a
              footnote to the label above it.
            */}
            <Text
              style={[styles.starterSub, nextRoutine && styles.starterName]}
              numberOfLines={1}>
              {nextRoutine?.name ?? '자주 하는 운동을 묶어요'}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.weekly} onPress={() => router.push('/achievements')}>
        <Ionicons name="flag-outline" size={15} color={colors.textDim} />
        {/*
          Only what the room does not already say. Her plaque prints the rank
          and level two cards up; repeating it here was the very thing this
          line replaced three cards to stop doing.
        */}
        <Text style={styles.weeklyText}>
          이번 주 <Text style={styles.weeklyStrong}>{weekly.workouts}</Text>/{weeklyGoal}회
          {weekly.workouts >= weeklyGoal ? ' · 약속 지키셨어요' : ''}
        </Text>
        {/*
          Named for what is behind it, not for the passage of time. 「지금까지」
          was read as the training history — which lives in its own tab and is
          a list of sessions — when what opens here is 품계, 업적 and the year
          so far. Two different answers to 「내가 얼마나 했나」, and the one
          worded vaguely is the one that gets tapped by mistake.
        */}
        <Text style={styles.weeklyLink}>품계와 업적 →</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내 루틴</Text>
        <Pressable onPress={() => router.push('/routines')}>
          <Text style={styles.sectionAction}>관리</Text>
        </Pressable>
      </View>

      {/* Same flash, one line down: nothing is said about an empty list until
          it is known to be empty rather than merely unanswered. */}
      {!loaded ? null : routines.length === 0 ? (
        <Pressable style={styles.emptyCard} onPress={() => router.push('/routines')}>
          <Ionicons name="list-outline" size={22} color={colors.textDim} />
          <Text style={styles.emptyTitle}>정해 둔 루틴이 아직 없어요</Text>
          <Text style={styles.emptyText}>
            자주 하는 운동을 묶어 두면 다음부터 한 번에 시작할 수 있어요.
          </Text>
          <Text style={styles.emptyAction}>루틴 만들러 가기 →</Text>
        </Pressable>
      ) : otherRoutines.length === 0 ? (
        <Text style={styles.onlyOne}>
          루틴이 하나뿐이에요. 위 버튼으로 바로 시작할 수 있어요.
        </Text>
      ) : (
        otherRoutines.map((r) => (
          <Pressable key={r.id} style={styles.row} onPress={() => begin(r)}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{r.name}</Text>
              {/*
                Three states, not two. Counted-as-zero means the routine is
                empty and should say so; not-counted-yet means nothing is
                known, and a space holds the line at its height rather than
                telling every routine it is empty for a moment.
              */}
              <Text style={styles.rowSub}>
                {routineSizes[r.id] === undefined
                  ? ' '
                  : routineSizes[r.id] > 0
                    ? `종목 ${routineSizes[r.id]}개`
                    : '종목을 더 담아 주세요'}
              </Text>
            </View>
            <View style={styles.startPill}>
              <Ionicons name="play" size={12} color={colors.accent} />
              <Text style={styles.rowAction}>시작</Text>
            </View>
          </Pressable>
        ))
      )}

      <ConditionPicker
        visible={pending !== null}
        routineId={pending?.routine?.id ?? null}
        onPick={beginWith}
        onClose={() => setPending(null)}
      />
    </ScrollView>
  );
}


function Step({ n, done, title, body }: { n: number; done: boolean; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, done && styles.stepNumDone]}>
        {done ? (
          <Ionicons name="checkmark" size={14} color={colors.surface} />
        ) : (
          <Text style={styles.stepNumText}>{n}</Text>
        )}
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  guide: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  guideTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  guideLead: { color: colors.textDim, marginTop: -spacing.sm, lineHeight: 19 },
  step: { flexDirection: 'row', gap: spacing.md },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDone: { backgroundColor: colors.success },
  stepNumText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  stepBody: { flex: 1 },
  stepTitle: { color: colors.text, fontWeight: '700' },
  stepText: { color: colors.textDim, marginTop: 2, lineHeight: 19 },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBody: { flex: 1 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  primarySub: { color: colors.accentSoft, marginTop: 2, fontSize: 13 },
  onlyOne: { color: colors.textDim, fontSize: 12, lineHeight: 18, paddingHorizontal: spacing.xs },
  starters: { flexDirection: 'row', gap: spacing.sm },
  starter: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  starterGhost: { backgroundColor: colors.surface },
  starterText: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 },
  starterTextGhost: { color: colors.accent },
  starterSub: { color: colors.textDim, fontSize: 11 },
  starterName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  weekly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  weeklyText: { color: colors.textDim, fontSize: 12, flex: 1 },
  weeklyStrong: { color: colors.text, fontWeight: '800', fontSize: 13 },
  weeklyLink: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sectionAction: { color: colors.accent, fontWeight: '600' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: { color: colors.text, fontWeight: '700', marginTop: spacing.xs },
  emptyText: { color: colors.textDim, textAlign: 'center', lineHeight: 19 },
  emptyAction: { color: colors.accent, fontWeight: '700', marginTop: spacing.sm },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  startPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowAction: { color: colors.accent, fontWeight: '700' },
});
