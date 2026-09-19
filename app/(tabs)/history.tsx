import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Insights } from '@/components/Insights';
import { MonthCalendar } from '@/components/MonthCalendar';
import { confirmAction, notify } from '@/lib/confirm';
import {
  deleteWorkout,
  listWorkoutDays,
  listWorkoutFacts,
  listWorkouts,
  type WorkoutSummary,
} from '@/lib/db';
import { formatDate, localDayKey } from '@/lib/format';
import type { WorkoutFact } from '@/lib/gamification';
import type { Workout } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

function duration(workout: Workout) {
  if (!workout.ended_at) return '진행 중';
  const ms = new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime();
  return `${Math.max(1, Math.round(ms / 60000))}분`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [days, setDays] = useState<Set<string>>(new Set());
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);

  const load = useCallback(() => {
    listWorkoutFacts()
      .then(setFacts)
      .catch(() => {
        // The list below still works; only the reading is lost.
      });
    Promise.all([listWorkouts(), listWorkoutDays()])
      .then(([list, marked]) => {
        setWorkouts(list);
        setDays(new Set(marked.map((m) => m.day)));
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  const shown = useMemo(
    () =>
      selected
        ? workouts.filter((w) => localDayKey(new Date(w.started_at)) === selected)
        : workouts,
    [workouts, selected]
  );

  function confirmDelete(workout: Workout) {
    confirmAction(
      '기록 삭제',
      `${formatDate(workout.started_at)} "${workout.title}" 기록을 삭제할까요?`,
      async () => {
        try {
          await deleteWorkout(workout.id);
          load();
        } catch (e: any) {
          notify('삭제 실패', e.message);
        }
      }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <MonthCalendar
        month={month}
        markedDays={days}
        selected={selected}
        onSelect={(day) => setSelected((cur) => (cur === day ? null : day))}
        onShiftMonth={(delta) =>
          setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
        }
      />

      <Insights workouts={facts} limit={2} />

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {selected ? `${formatDate(`${selected}T00:00:00`)} 기록` : '전체 기록'}
        </Text>
        {selected && (
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.clear}>전체 보기</Text>
          </Pressable>
        )}
      </View>

      {shown.length === 0 ? (
        <Text style={styles.empty}>
          {selected ? '이 날은 기록이 없어요.' : '아직 기록이 없어요.'}
        </Text>
      ) : (
        shown.map((item) => (
          <Pressable
            key={item.id}
            style={styles.row}
            onPress={() =>
              router.push(
                item.ended_at
                  ? { pathname: '/summary/[id]', params: { id: item.id } }
                  : { pathname: '/workout/[id]', params: { id: item.id } }
              )
            }
            onLongPress={() => confirmDelete(item)}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>
                {formatDate(item.started_at)}
                {item.setCount > 0 && ` · ${item.setCount}세트 · ${item.volume.toLocaleString()}kg`}
              </Text>
            </View>
            <View style={styles.rowEnd}>
              <Text style={[styles.badge, !item.ended_at && styles.badgeActive]}>
                {duration(item)}
              </Text>
              <Pressable hitSlop={8} onPress={() => confirmDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={colors.textDim} />
              </Pressable>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  clear: { color: colors.accent, fontWeight: '600' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMain: { flex: 1, marginRight: spacing.md },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textDim, marginTop: spacing.xs, fontSize: 12 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { color: colors.textDim, fontSize: 12 },
  badgeActive: { color: colors.success, fontWeight: '700' },
});
