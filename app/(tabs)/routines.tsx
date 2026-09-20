import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenState } from '@/components/ScreenState';
import { confirmAction, notify } from '@/lib/confirm';
import {
  createRoutine,
  deleteRoutine,
  lastDoneByRoutine,
  listRoutineExercises,
  listRoutines,
} from '@/lib/db';
import { formatDate } from '@/lib/format';
import { byLastUsed } from '@/lib/split';
import type { Routine } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [lastDone, setLastDone] = useState<Map<string, string>>(new Map());
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listRoutines()
      .then((list) => {
        setRoutines(list);
        // Only reorders the list and adds a date under each name, so it is
        // never waited on — the routines are readable without it.
        lastDoneByRoutine()
          .then(setLastDone)
          .catch(() => {});
        // The counts only decide a subtitle, so the list does not wait on one
        // query per routine before it is allowed to appear.
        Promise.all(
          list.map(async (r) => [r.id, (await listRoutineExercises(r.id)).length] as const)
        )
          .then((counted) => setSizes(Object.fromEntries(counted)))
          .catch(() => {});
      })
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  // Most recently used first, with one never used counting as used the day it
  // was made — so a routine created a minute ago is where its owner is looking.
  const ordered = routines ? byLastUsed(routines, lastDone) : null;

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

  // "루틴이 없어요" and "not asked yet" look identical from an empty array,
  // and the second one is true for a moment every time this tab is opened.
  if (!routines) return <ScreenState error={error} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={ordered}
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
          ) : (
            // A beginner's first question is not what to call a routine, it is
            // what to put in one. Offer the answer before the blank field.
            <Pressable
              style={styles.presets}
              onPress={() => router.push('/routine/presets')}>
              <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
              <View style={styles.presetsBody}>
                <Text style={styles.presetsTitle}>짜여 있는 루틴에서 고르기</Text>
                <Text style={styles.presetsSub}>전신 입문 · 상하체 분할 · 집에서 맨몸</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </Pressable>
          )
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
              {/* Uncounted is not empty; a space holds the line meanwhile. */}
              <Text style={styles.rowSub}>
                {sizes[item.id] === undefined
                  ? ' '
                  : sizes[item.id] > 0
                    ? `종목 ${sizes[item.id]}개`
                    : '아직 종목이 없어요'}
                {/*
                  When it was last done, which is what tells two routines
                  apart at a glance. 「아직」 rather than nothing for one never
                  used — an empty space reads as a date that failed to load.
                */}
                {sizes[item.id] !== undefined &&
                  (lastDone.has(item.id)
                    ? ` · 지난번 ${formatDate(lastDone.get(item.id)!, 'short')}`
                    : ' · 아직 안 해봤어요')}
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
  presets: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  presetsBody: { flex: 1 },
  presetsTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  presetsSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  emptyAction: {
    marginTop: spacing.md,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyActionText: { color: colors.accent, fontWeight: '800' },
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
