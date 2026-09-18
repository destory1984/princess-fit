import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { notify } from '@/lib/confirm';
import { getActiveWorkout, listRoutines, listWorkouts, startWorkout } from '@/lib/db';
import type { Routine, Workout } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function TodayScreen() {
  const router = useRouter();
  const [active, setActive] = useState<Workout | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [recent, setRecent] = useState<Workout[]>([]);

  const load = useCallback(() => {
    Promise.all([getActiveWorkout(), listRoutines(), listWorkouts(5)])
      .then(([a, r, w]) => {
        setActive(a);
        setRoutines(r);
        setRecent(w.filter((x) => x.ended_at));
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  async function begin(routine: Routine | null) {
    try {
      const w = await startWorkout(routine?.name ?? '오늘의 운동', routine?.id ?? null);
      router.push(`/workout/${w.id}`);
    } catch (e: any) {
      notify('시작 실패', e.message);
    }
  }

  const thisWeek = recent.filter((w) => {
    const d = new Date(w.started_at);
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{thisWeek}</Text>
          <Text style={styles.statLabel}>이번 주 운동</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{recent.length}</Text>
          <Text style={styles.statLabel}>최근 완료</Text>
        </View>
      </View>

      {active ? (
        <Pressable style={styles.primary} onPress={() => router.push(`/workout/${active.id}`)}>
          <Text style={styles.primaryText}>진행 중인 운동 이어하기</Text>
          <Text style={styles.primarySub}>{active.title}</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.primary} onPress={() => begin(null)}>
          <Text style={styles.primaryText}>빈 운동 시작</Text>
          <Text style={styles.primarySub}>종목을 그때그때 추가해요</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>루틴으로 시작</Text>
      {routines.length === 0 ? (
        <Text style={styles.empty}>아직 루틴이 없어요. 루틴 탭에서 만들어 보세요.</Text>
      ) : (
        routines.map((r) => (
          <Pressable key={r.id} style={styles.row} onPress={() => begin(r)}>
            <Text style={styles.rowTitle}>{r.name}</Text>
            <Text style={styles.rowAction}>시작</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '800' },
  statLabel: { color: colors.textDim, marginTop: spacing.xs },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  primarySub: { color: '#DCE8FF', marginTop: spacing.xs },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  empty: { color: colors.textDim },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowAction: { color: colors.accent, fontWeight: '700' },
});
