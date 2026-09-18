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
import { useFocusEffect } from 'expo-router';
import { createExercise, deleteExercise, listExercises } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { MUSCLE_GROUPS, type Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function SettingsScreen() {
  const { session } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string>(MUSCLE_GROUPS[0]);

  const load = useCallback(() => {
    listExercises()
      .then(setExercises)
      .catch((e) => Alert.alert('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createExercise(trimmed, group);
      setName('');
      load();
    } catch (e: any) {
      Alert.alert('추가 실패', e.message);
    }
  }

  function confirmDelete(exercise: Exercise) {
    Alert.alert('종목 삭제', `"${exercise.name}"을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(exercise.id);
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
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>운동 종목</Text>
            <TextInput
              style={styles.input}
              placeholder="새 종목 이름 (예: 벤치프레스)"
              placeholderTextColor={colors.textDim}
              value={name}
              onChangeText={setName}
            />
            <View style={styles.chipRow}>
              {MUSCLE_GROUPS.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.chip, group === g && styles.chipActive]}
                  onPress={() => setGroup(g)}>
                  <Text style={[styles.chipText, group === g && styles.chipTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.addButton} onPress={add}>
              <Text style={styles.addButtonText}>종목 추가</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onLongPress={() => confirmDelete(item)}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSub}>{item.muscle_group}</Text>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.account}>{session?.user.email}</Text>
            <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipActive: { backgroundColor: colors.accentSoft },
  chipText: { color: colors.textDim },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textDim },
  footer: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  account: { color: colors.textDim },
  logout: { padding: spacing.md },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
