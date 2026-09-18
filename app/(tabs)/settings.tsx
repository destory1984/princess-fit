import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { seedDefaultExercises } from '@/lib/catalog';
import { confirmAction, notify } from '@/lib/confirm';
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
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(() => {
    listExercises()
      .then(setExercises)
      .catch((e) => notify('불러오기 실패', e.message));
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
      notify('추가 실패', e.message);
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const added = await seedDefaultExercises();
      notify(added ? `${added}개 종목을 추가했어요.` : '이미 기본 종목이 모두 있어요.');
      load();
    } catch (e: any) {
      notify('불러오기 실패', e.message);
    } finally {
      setSeeding(false);
    }
  }

  function confirmDelete(exercise: Exercise) {
    confirmAction('종목 삭제', `"${exercise.name}"을 삭제할까요?`, async () => {
      try {
        await deleteExercise(exercise.id);
        load();
      } catch (e: any) {
        notify('삭제 실패', e.message);
      }
    });
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
            <Pressable
              style={[styles.seedButton, seeding && styles.disabled]}
              disabled={seeding}
              onPress={seed}>
              <Text style={styles.seedButtonText}>
                {seeding ? '불러오는 중…' : '기본 종목 불러오기 (벤치프레스, 스쿼트 등)'}
              </Text>
            </Pressable>
            <Text style={styles.hint}>종목을 길게 누르면 삭제할 수 있어요.</Text>
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
  seedButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  seedButtonText: { color: colors.accent, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  hint: { color: colors.textDim, fontSize: 12 },
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
