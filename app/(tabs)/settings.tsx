import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MuscleTag } from '@/components/MuscleTag';
import { seedDefaultExercises } from '@/lib/catalog';
import { confirmAction, notify } from '@/lib/confirm';
import { countExerciseSets, createExercise, deleteExercise, listExercises } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { EQUIPMENT, MUSCLE_GROUPS, type Exercise } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

export default function SettingsScreen() {
  const { session } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [gear, setGear] = useState<string>(EQUIPMENT[0]);
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
      await createExercise(trimmed, group, gear);
      setName('');
      load();
    } catch (e: any) {
      notify('추가 실패', e.message);
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const { added, updated } = await seedDefaultExercises();
      const parts = [
        added ? `${added}개 추가` : '',
        updated ? `${updated}개 정보 갱신` : '',
      ].filter(Boolean);
      notify(parts.length ? parts.join(' · ') : '이미 최신 상태예요.');
      load();
    } catch (e: any) {
      notify('불러오기 실패', e.message);
    } finally {
      setSeeding(false);
    }
  }

  async function confirmDelete(exercise: Exercise) {
    let setCount = 0;
    try {
      setCount = await countExerciseSets(exercise.id);
    } catch (e: any) {
      notify('확인 실패', e.message);
      return;
    }
    const warning = setCount
      ? `\n\n이 종목으로 기록한 ${setCount}개 세트도 함께 지워지고 되돌릴 수 없어요.`
      : '';
    confirmAction('종목 삭제', `"${exercise.name}"을 삭제할까요?${warning}`, async () => {
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
                  style={[
                    styles.chip,
                    group === g && {
                      backgroundColor: `${muscleColor(g)}26`,
                      borderColor: muscleColor(g),
                    },
                  ]}
                  onPress={() => setGroup(g)}>
                  <Text
                    style={[styles.chipText, group === g && { color: muscleColor(g), fontWeight: '700' }]}>
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipRow}>
              {EQUIPMENT.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.chip, gear === g && styles.chipOn]}
                  onPress={() => setGear(g)}>
                  <Text style={[styles.chipText, gear === g && styles.chipTextOn]}>{g}</Text>
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
                {seeding ? '불러오는 중…' : '기본 종목 불러오기 · 정보 새로 고치기'}
              </Text>
            </Pressable>
            <Text style={styles.hint}>종목을 길게 누르면 삭제할 수 있어요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onLongPress={() => confirmDelete(item)}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>
                {item.muscle_detail ? `${item.muscle_detail} · ` : ''}
                {item.equipment}
              </Text>
            </View>
            <MuscleTag group={item.muscle_group} />
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
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.textDim },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipTextOn: { color: colors.accent, fontWeight: '700' },
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
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  footer: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  account: { color: colors.textDim },
  logout: { padding: spacing.md },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
