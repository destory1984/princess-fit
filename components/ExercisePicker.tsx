import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  visible: boolean;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
};

export function ExercisePicker({ visible, exercises, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>종목 선택</Text>
          <ScrollView>
            {exercises.length === 0 ? (
              <Text style={styles.empty}>설정 탭에서 종목을 먼저 추가해 주세요.</Text>
            ) : (
              exercises.map((e) => (
                <Pressable
                  key={e.id}
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    onSelect(e);
                  }}>
                  <Text style={styles.rowText}>{e.name}</Text>
                  <Text style={styles.rowSub}>{e.muscle_group}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  row: { paddingVertical: spacing.md, borderBottomColor: colors.border, borderBottomWidth: 1 },
  rowText: { color: colors.text, fontSize: 15 },
  rowSub: { color: colors.textDim, marginTop: 2 },
  empty: { color: colors.textDim, paddingVertical: spacing.lg },
});
