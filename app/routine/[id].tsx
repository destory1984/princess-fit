import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  addRoutineExercise,
  listExercises,
  listRoutineExercises,
  listRoutines,
  removeRoutineExercise,
} from '@/lib/db';
import type { Exercise, Routine, RoutineExercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [items, setItems] = useState<RoutineExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [picking, setPicking] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([listRoutines(), listRoutineExercises(id), listExercises()])
      .then(([routines, re, ex]) => {
        setRoutine(routines.find((r) => r.id === id) ?? null);
        setItems(re);
        setExercises(ex);
      })
      .catch((e) => Alert.alert('불러오기 실패', e.message));
  }, [id]);

  useFocusEffect(load);

  const exerciseName = useMemo(() => {
    const map = new Map(exercises.map((e) => [e.id, e.name]));
    return (exerciseId: string) => map.get(exerciseId) ?? '삭제된 종목';
  }, [exercises]);

  async function add(exerciseId: string) {
    if (!id) return;
    try {
      const created = await addRoutineExercise(id, exerciseId, items.length);
      setItems((prev) => [...prev, created]);
    } catch (e: any) {
      Alert.alert('추가 실패', e.message);
    }
  }

  async function remove(item: RoutineExercise) {
    try {
      await removeRoutineExercise(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (e: any) {
      Alert.alert('삭제 실패', e.message);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{routine?.name ?? ''}</Text>
        <Text style={styles.hint}>길게 눌러 종목을 삭제할 수 있어요.</Text>

        {items.length === 0 ? (
          <Text style={styles.empty}>아직 종목이 없어요.</Text>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} style={styles.row} onLongPress={() => remove(item)}>
              <Text style={styles.rowTitle}>{exerciseName(item.exercise_id)}</Text>
              <Text style={styles.rowSub}>
                {item.target_sets}세트 × {item.target_reps}회
              </Text>
            </Pressable>
          ))
        )}

        <Pressable style={styles.secondary} onPress={() => setPicking(true)}>
          <Text style={styles.secondaryText}>+ 종목 추가</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={picking} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicking(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>종목 선택</Text>
            <ScrollView>
              {exercises.length === 0 ? (
                <Text style={styles.empty}>설정 탭에서 종목을 먼저 추가해 주세요.</Text>
              ) : (
                exercises.map((e) => (
                  <Pressable
                    key={e.id}
                    style={styles.modalRow}
                    onPress={() => {
                      setPicking(false);
                      add(e.id);
                    }}>
                    <Text style={styles.modalRowText}>{e.name}</Text>
                    <Text style={styles.rowSub}>{e.muscle_group}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  hint: { color: colors.textDim, marginBottom: spacing.md },
  empty: { color: colors.textDim, paddingVertical: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textDim },
  secondary: {
    marginTop: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  modalRow: {
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  modalRowText: { color: colors.text, fontSize: 15 },
});
