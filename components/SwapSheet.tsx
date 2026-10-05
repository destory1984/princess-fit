import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getPlace } from '@/lib/prefs';
import type { Place } from '@/lib/onboarding';
import { substitutesHere, substituteWord } from '@/lib/substitute';
import type { Exercise } from '@/lib/types';
import { colors, paper, radius, spacing } from '@/lib/theme';

type Props = {
  /** The movement being stood in for, or null when the sheet is closed. */
  target: Exercise | null;
  exercises: Exercise[];
  /** How many sets are already done, so the sheet can say what it will keep. */
  doneCount: number;
  onPick: (replacement: Exercise) => void;
  onClose: () => void;
};

/**
 * Changing your mind with the machine in front of you.
 *
 * The detail screen answers the same question, but it answers it three taps
 * away and outside the session — by the time you have read it you have left
 * the board you were going to change. This is the version for someone standing
 * in a busy gym with a bar in their hands.
 *
 * It swaps only the sets still ahead. What is done is done, and an app that
 * quietly rewrote the last four sets under a different name would be editing
 * an afternoon rather than recording one.
 */
export function SwapSheet({ target, exercises, doneCount, onPick, onClose }: Props) {
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    // Only narrows where the answers come from; the list is right without it.
    getPlace()
      .then((p) => alive && setPlace(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [target]);

  const options = target ? substitutesHere(target, exercises, place) : [];

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grip} />
        <Text style={styles.title}>{target?.name}, 안 되시나요?</Text>
        <Text style={styles.lead}>비슷한 데를 쓰는 걸로 바꿔 드릴게요.</Text>

        {options.length === 0 ? (
          <Text style={styles.empty}>
            이걸 대신할 만한 종목이 아직 없어요. 오늘은 건너뛰셔도 괜찮아요.
          </Text>
        ) : (
          options.map((option) => (
            <Pressable
              key={option.exercise.id}
              style={styles.choice}
              onPress={() => onPick(option.exercise)}>
              <View style={styles.choiceBody}>
                <Text style={styles.choiceLabel}>{option.exercise.name}</Text>
                <Text style={styles.choiceDetail}>{substituteWord(option)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))
        )}

        {options.length > 0 && (
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={15} color={colors.gold} />
            <Text style={styles.noteText}>
              {doneCount > 0
                ? `이미 하신 ${doneCount}세트는 그대로 두고, 남은 세트만 바꿔요. `
                : ''}
              무게는 그대로 옮겨 두니, 기구가 달라졌으면 한 번 보고 고쳐 주세요.
            </Text>
          </View>
        )}

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
  lead: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
  empty: { color: colors.textDim, fontSize: 15, lineHeight: 23, paddingVertical: spacing.md },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  choiceBody: { flex: 1, gap: 2 },
  choiceLabel: { color: colors.text, fontSize: 17, fontWeight: '700' },
  choiceDetail: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.faint,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  noteText: { color: colors.textDim, fontSize: 14, lineHeight: 21, flex: 1 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.textDim, fontWeight: '700' },
});
