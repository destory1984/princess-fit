import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { confirmAction, notify } from '@/lib/confirm';
import { createRoutine, deleteRoutine, listRoutineExercises, listRoutines } from '@/lib/db';
import type { Routine } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    listRoutines()
      .then(async (list) => {
        setRoutines(list);
        const counted = await Promise.all(
          list.map(async (r) => [r.id, (await listRoutineExercises(r.id)).length] as const)
        );
        setSizes(Object.fromEntries(counted));
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await createRoutine(trimmed);
      setName('');
      setAdding(false);
      router.push(`/routine/${created.id}`);
    } catch (e: any) {
      notify('추가 실패', e.message);
    }
  }

  function confirmDelete(routine: Routine) {
    // workouts.routine_id is ON DELETE SET NULL, so past sessions survive —
    // worth saying, because "되돌릴 수 없어요" otherwise sounds like they go too.
    confirmAction(
      '루틴 삭제',
      `"${routine.name}"을 삭제할까요?

되돌릴 수 없어요. 이 루틴으로 했던 운동 기록은 그대로 남아요.`,
      async () => {
        try {
          await deleteRoutine(routine.id);
          load();
        } catch (e: any) {
          notify('삭제 실패', e.message);
        }
      }
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          adding ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder="루틴 이름 (예: 가슴/삼두)"
                placeholderTextColor={colors.textDim}
                value={name}
                onChangeText={setName}
                onSubmitEditing={add}
                returnKeyType="done"
                autoFocus
              />
              <Pressable style={styles.addButton} onPress={add}>
                <Text style={styles.addButtonText}>만들기</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={28} color={colors.textDim} />
            <Text style={styles.emptyTitle}>루틴이 아직 없어요</Text>
            <Text style={styles.emptyText}>
              자주 하는 운동을 묶어 두면{'\n'}다음부터 한 번에 시작할 수 있어요.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/routine/${item.id}`)}
            onLongPress={() => confirmDelete(item)}>
            <Ionicons name="flash" size={18} color={colors.accent} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>
                {sizes[item.id] ? `종목 ${sizes[item.id]}개` : '아직 종목이 없어요'}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={() => confirmDelete(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.textDim} />
            </Pressable>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </Pressable>
        )}
      />

      <View style={styles.bottomBar}>
        <Pressable style={styles.new} onPress={() => setAdding((v) => !v)}>
          <Ionicons name={adding ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={styles.newText}>{adding ? '취소' : '루틴 추가'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 110 },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl },
  emptyTitle: { color: colors.text, fontWeight: '700', marginTop: spacing.sm },
  emptyText: { color: colors.textDim, textAlign: 'center', lineHeight: 19 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  new: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  newText: { color: '#fff', fontWeight: '800' },
});
