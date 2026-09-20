import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EQUIPMENT, MUSCLE_GROUPS, TRACK_TYPE_LABEL, type TrackType } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

type Props = {
  visible: boolean;
  onCreate: (name: string, group: string, gear: string, track: TrackType) => Promise<void>;
  onClose: () => void;
};

/**
 * Making a movement the catalogue does not have.
 *
 * A sheet rather than a block at the top of the list, because the list is
 * what people come to that screen for and this is the rare thing. It sat
 * above it permanently — a text box and three rows of unlabelled chips — and
 * earned the only review a control ever gets: 「이건 뭐야?」.
 *
 * Every row is asked as a question now. 「가슴 등 어깨」 on its own is a set of
 * words; 「어느 부위인가요?」 above them is a form.
 */
export function NewExerciseSheet({ visible, onCreate, onClose }: Props) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [gear, setGear] = useState<string>(EQUIPMENT[0]);
  const [track, setTrack] = useState<TrackType>('weight_reps');
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();

  async function submit() {
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onCreate(trimmed, group, gear, track);
      // Cleared only on success, so a failed save leaves the typing where it
      // was rather than asking for it all again.
      setName('');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grip} />
        <Text style={styles.title}>새 종목 만들기</Text>
        <Text style={styles.lead}>목록에 없는 운동을 직접 넣을 수 있어요.</Text>

        <ScrollView keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.input}
            placeholder="이름 (예: 케틀벨 클린)"
            placeholderTextColor={colors.textDim}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>어느 부위인가요?</Text>
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
                  style={[
                    styles.chipText,
                    group === g && { color: muscleColor(g), fontWeight: '700' },
                  ]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>무엇으로 하나요?</Text>
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

          <Text style={styles.label}>무엇을 적나요?</Text>
          <View style={styles.chipRow}>
            {(Object.keys(TRACK_TYPE_LABEL) as TrackType[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, track === t && styles.chipOn]}
                onPress={() => setTrack(t)}>
                <Text style={[styles.chipText, track === t && styles.chipTextOn]}>
                  {TRACK_TYPE_LABEL[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Pressable
          style={[styles.add, (!trimmed || saving) && styles.addOff]}
          disabled={!trimmed || saving}
          onPress={submit}>
          <Text style={styles.addText}>{saving ? '넣는 중…' : '종목 추가'}</Text>
        </Pressable>
        <Pressable style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>닫기</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  grip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.faint,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  lead: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
    marginTop: spacing.sm,
  },
  label: { color: colors.textDim, fontSize: 12, marginTop: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 13 },
  chipTextOn: { color: colors.accent, fontWeight: '700' },
  add: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addOff: { opacity: 0.5 },
  addText: { color: '#fff', fontWeight: '700' },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.textDim, fontWeight: '700' },
});
