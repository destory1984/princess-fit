import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { createRoutine, deleteRoutine, listRoutines } from '@/lib/db';
import type { Routine } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [name, setName] = useState('');

  const load = useCallback(() => {
    listRoutines()
      .then(setRoutines)
      .catch((e) => Alert.alert('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createRoutine(trimmed);
      setName('');
      load();
    } catch (e: any) {
      Alert.alert('추가 실패', e.message);
    }
  }

  function confirmDelete(routine: Routine) {
    Alert.alert('루틴 삭제', `"${routine.name}"을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoutine(routine.id);
            load();
          } catch (e: any) {
            Alert.alert('삭제 실패', e.message);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="새 루틴 이름 (예: 등/이두)"
          placeholderTextColor={colors.textDim}
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={add}>
          <Text style={styles.addButtonText}>추가</Text>
        </Pressable>
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>루틴을 만들어 운동을 시작해 보세요.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/routine/${item.id}`)}
            onLongPress={() => confirmDelete(item)}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowHint}>편집</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  addRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg },
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
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowHint: { color: colors.textDim },
});
