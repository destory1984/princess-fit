import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { confirmAction, notify } from '@/lib/confirm';
import { deleteWorkout, listWorkouts, type WorkoutSummary } from '@/lib/db';
import { formatDate } from '@/lib/format';
import type { Workout } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

function duration(workout: Workout) {
  if (!workout.ended_at) return '진행 중';
  const ms = new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime();
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes}분`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);

  const load = useCallback(() => {
    listWorkouts()
      .then(setWorkouts)
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  function confirmDelete(workout: Workout) {
    confirmAction('기록 삭제', `${formatDate(workout.started_at)} "${workout.title}" 기록을 삭제할까요?`, async () => {
      try {
        await deleteWorkout(workout.id);
        load();
      } catch (e: any) {
        notify('삭제 실패', e.message);
      }
    });
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>아직 기록이 없어요.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/workout/${item.id}`)}
            onLongPress={() => confirmDelete(item)}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>
                {formatDate(item.started_at)}
                {item.setCount > 0 && ` · ${item.setCount}세트 · ${item.volume.toLocaleString()}kg`}
              </Text>
            </View>
            <Text style={[styles.badge, !item.ended_at && styles.badgeActive]}>
              {duration(item)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl },
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
  rowSub: { color: colors.textDim, marginTop: spacing.xs },
  badge: { color: colors.textDim },
  badgeActive: { color: colors.success, fontWeight: '700' },
});
