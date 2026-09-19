import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MuscleTag } from '@/components/MuscleTag';
import { seedDefaultExercises } from '@/lib/catalog';
import { notify } from '@/lib/confirm';
import { EQUIPMENT, MUSCLE_GROUPS, type Exercise } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

type Props = {
  visible: boolean;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  onSeeded?: () => void;
};

export function ExercisePicker({ visible, exercises, onSelect, onClose, onSeeded }: Props) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [gear, setGear] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (group === null || e.muscle_group === group) &&
        (gear === null || e.equipment === gear) &&
        (q === '' ||
          e.name.toLowerCase().includes(q) ||
          e.muscle_detail.toLowerCase().includes(q))
    );
  }, [exercises, query, group, gear]);

  function close() {
    setQuery('');
    setGroup(null);
    setGear(null);
    onClose();
  }

  async function seed() {
    setSeeding(true);
    try {
      await seedDefaultExercises();
      onSeeded?.();
    } catch (e: any) {
      notify('불러오기 실패', e.message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>어떤 운동을 하시겠어요?</Text>

          {exercises.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>아직 종목이 없어요</Text>
              <Text style={styles.emptyText}>
                벤치프레스, 스쿼트 같은 기본 종목을{'\n'}한 번에 불러올 수 있어요.
              </Text>
              <Pressable
                style={[styles.seedButton, seeding && styles.disabled]}
                disabled={seeding}
                onPress={seed}>
                {seeding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.seedButtonText}>기본 종목 불러오기</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.search}
                placeholder="종목 이름이나 근육으로 검색"
                placeholderTextColor={colors.textDim}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              <Text style={styles.filterLabel}>부위</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                <View style={styles.chipRow}>
                  <Chip label="전체" active={group === null} onPress={() => setGroup(null)} />
                  {MUSCLE_GROUPS.map((g) => (
                    <Chip
                      key={g}
                      label={g}
                      color={muscleColor(g)}
                      active={group === g}
                      onPress={() => setGroup(g)}
                    />
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.filterLabel}>기구</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                <View style={styles.chipRow}>
                  <Chip label="전체" active={gear === null} onPress={() => setGear(null)} />
                  {EQUIPMENT.map((g) => (
                    <Chip key={g} label={g} active={gear === g} onPress={() => setGear(g)} />
                  ))}
                </View>
              </ScrollView>
              <ScrollView keyboardShouldPersistTaps="handled">
                {filtered.length === 0 ? (
                  <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
                ) : (
                  filtered.map((e) => (
                    <Pressable
                      key={e.id}
                      style={styles.row}
                      onPress={() => {
                        close();
                        onSelect(e);
                      }}>
                      <View
                        style={[styles.stripe, { backgroundColor: muscleColor(e.muscle_group) }]}
                      />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowText}>{e.name}</Text>
                        {!!e.muscle_detail && (
                          <Text style={styles.rowSub}>
                            {e.muscle_detail} · {e.equipment}
                          </Text>
                        )}
                      </View>
                      <MuscleTag group={e.muscle_group} />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  const tint = color ?? colors.accent;
  return (
    <Pressable
      style={[styles.chip, active && { backgroundColor: `${tint}26`, borderColor: tint }]}
      onPress={onPress}>
      <Text style={[styles.chipText, active && { color: tint, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000B', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '82%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  search: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: { flexGrow: 0, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.textDim },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  stripe: { width: 4, height: 30, borderRadius: 2 },
  rowBody: { flex: 1 },
  rowText: { color: colors.text, fontSize: 16 },
  rowSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  filterLabel: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.textDim, textAlign: 'center', lineHeight: 20 },
  seedButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  seedButtonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
