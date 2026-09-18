import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MUSCLE_GROUPS, type Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  visible: boolean;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
};

export function ExercisePicker({ visible, exercises, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (group === null || e.muscle_group === group) &&
        (q === '' || e.name.toLowerCase().includes(q))
    );
  }, [exercises, query, group]);

  function close() {
    setQuery('');
    setGroup(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>종목 선택</Text>
          <TextInput
            style={styles.search}
            placeholder="검색"
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            <View style={styles.chipRow}>
              <Chip label="전체" active={group === null} onPress={() => setGroup(null)} />
              {MUSCLE_GROUPS.map((g) => (
                <Chip key={g} label={g} active={group === g} onPress={() => setGroup(g)} />
              ))}
            </View>
          </ScrollView>
          <ScrollView keyboardShouldPersistTaps="handled">
            {exercises.length === 0 ? (
              <Text style={styles.empty}>설정 탭에서 종목을 먼저 추가해 주세요.</Text>
            ) : filtered.length === 0 ? (
              <Text style={styles.empty}>검색 결과가 없어요.</Text>
            ) : (
              filtered.map((e) => (
                <Pressable
                  key={e.id}
                  style={styles.row}
                  onPress={() => {
                    close();
                    onSelect(e);
                  }}>
                  <Text style={styles.rowText}>{e.name}</Text>
                  <Text style={styles.rowSub}>{e.muscle_group}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  search: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: { flexGrow: 0, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipActive: { backgroundColor: colors.accentSoft },
  chipText: { color: colors.textDim },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
  row: { paddingVertical: spacing.md, borderBottomColor: colors.border, borderBottomWidth: 1 },
  rowText: { color: colors.text, fontSize: 15 },
  rowSub: { color: colors.textDim, marginTop: 2 },
  empty: { color: colors.textDim, paddingVertical: spacing.lg },
});
