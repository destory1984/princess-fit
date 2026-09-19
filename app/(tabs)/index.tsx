import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { notify } from '@/lib/confirm';
import { workedParts } from '@/components/BodyMap';
import { LevelCard } from '@/components/LevelCard';
import { TrainingHall } from '@/components/TrainingHall';
import { archetypeOf, computeStats, conditionOf } from '@/lib/character';
import {
  getActiveWorkout,
  getWeeklyStats,
  listExercises,
  listRoutineExercises,
  listRoutines,
  listWorkoutFacts,
  startWorkout,
  type WeeklyStats,
} from '@/lib/db';
import { summarise } from '@/lib/gamification';
import type { Routine, Workout } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function TodayScreen() {
  const router = useRouter();
  const [active, setActive] = useState<Workout | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineSizes, setRoutineSizes] = useState<Record<string, number>>({});
  const [exerciseCount, setExerciseCount] = useState(0);
  const [weekly, setWeekly] = useState<WeeklyStats>({ workouts: 0, volume: 0, streakDays: 0 });
  const [summary, setSummary] = useState<ReturnType<typeof summarise> | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof computeStats> | null>(null);
  const [trained, setTrained] = useState<ReturnType<typeof workedParts>>([]);

  const load = useCallback(() => {
    Promise.all([
      getActiveWorkout(),
      listRoutines(),
      getWeeklyStats(),
      listExercises(),
      listWorkoutFacts(),
    ])
      .then(async ([a, r, w, ex, facts]) => {
        setActive(a);
        setRoutines(r);
        setWeekly(w);
        setExerciseCount(ex.length);
        setSummary(summarise(facts));
        setStats(computeStats(facts));
        setTrained(
          workedParts(
            facts.flatMap((f) =>
              f.groups.map((g) => ({ muscle_group: g, secondary_group: null }))
            )
          )
        );
        const sizes = await Promise.all(
          r.map(async (routine) => [routine.id, (await listRoutineExercises(routine.id)).length] as const)
        );
        setRoutineSizes(Object.fromEntries(sizes));
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  async function begin(routine: Routine | null) {
    if (active) {
      router.push(`/workout/${active.id}`);
      return;
    }
    try {
      const w = await startWorkout(routine?.name ?? '오늘의 운동', routine?.id ?? null);
      router.push(`/workout/${w.id}`);
    } catch (e: any) {
      notify('시작 실패', e.message);
    }
  }

  const isNew = weekly.workouts === 0 && routines.length === 0 && !active;

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
            body="종목을 고르면 세트가 생겨요. 든 무게와 횟수를 적고 오른쪽 ✓를 누르면 휴식 타이머가 돌아가요."
          />
          <Step
            n={3}
            done={false}
            title="운동 완료"
            body="다 하셨으면 아래 '운동 완료'를 누르세요. 기록 탭과 통계 탭에 쌓입니다."
          />
        </View>
      )}

      {summary && stats && (
        <>
          <TrainingHall
            today={new Date()}
            rank={summary.title}
            level={summary.level}
            archetype={archetypeOf(stats).name}
            condition={conditionOf(stats, summary.streak)}
            stats={stats}
            streak={summary.streak}
            trained={trained}
          />
          <LevelCard
            level={summary.level}
            title={summary.title}
            xp={summary.xp}
            progress={summary.progress}
            toNext={summary.toNext}
            streak={summary.streak}
            earnedCount={summary.earnedCount}
            badgeCount={summary.badges.length}
            onPress={() => router.push('/achievements')}
          />
        </>
      )}

      <View style={styles.statRow}>
        <StatCard
          icon="barbell"
          value={String(weekly.workouts)}
          label="이번 주 운동"
          suffix="회"
        />
        <StatCard
          icon="trending-up"
          value={
            weekly.volume >= 10000
              ? (weekly.volume / 1000).toFixed(1)
              : weekly.volume.toLocaleString()
          }
          label="주간 총 무게"
          suffix={weekly.volume >= 10000 ? '톤' : 'kg'}
        />
        <StatCard icon="flame" value={String(weekly.streakDays)} label="연속 운동" suffix="일" />
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => (active ? router.push(`/workout/${active.id}`) : begin(null))}>
        <View style={styles.primaryIcon}>
          <Ionicons name={active ? 'play' : 'add'} size={26} color="#fff" />
        </View>
        <View style={styles.primaryBody}>
          <Text style={styles.primaryText}>
            {active ? '진행 중인 운동 이어하기' : '바로 운동 시작'}
          </Text>
          <Text style={styles.primarySub}>
            {active ? active.title : '종목은 시작한 뒤 골라도 돼요'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.accentSoft} />
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내 루틴</Text>
        <Pressable onPress={() => router.push('/routines')}>
          <Text style={styles.sectionAction}>관리</Text>
        </Pressable>
      </View>

      {routines.length === 0 ? (
        <Pressable style={styles.emptyCard} onPress={() => router.push('/routines')}>
          <Ionicons name="list-outline" size={22} color={colors.textDim} />
          <Text style={styles.emptyTitle}>정해 둔 루틴이 아직 없어요</Text>
          <Text style={styles.emptyText}>
            자주 하는 운동을 묶어 두면 다음부터 한 번에 시작할 수 있어요.
          </Text>
          <Text style={styles.emptyAction}>루틴 만들러 가기 →</Text>
        </Pressable>
      ) : (
        routines.map((r) => (
          <Pressable key={r.id} style={styles.row} onPress={() => begin(r)}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{r.name}</Text>
              <Text style={styles.rowSub}>
                {routineSizes[r.id] ? `종목 ${routineSizes[r.id]}개` : '종목을 더 담아 주세요'}
              </Text>
            </View>
            <View style={styles.startPill}>
              <Ionicons name="play" size={12} color={colors.accent} />
              <Text style={styles.rowAction}>시작</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  value,
  label,
  suffix,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  suffix: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={16} color={colors.textDim} />
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statSuffix}> {suffix}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statSuffix: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  statLabel: { color: colors.textDim, fontSize: 11 },
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
