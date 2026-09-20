import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CONDITIONS, tiredWord, type Condition } from '@/lib/condition';
import { listRecentConditions } from '@/lib/db';
import { colors, paper, radius, spacing } from '@/lib/theme';

type Props = {
  visible: boolean;
  onPick: (condition: Condition) => void;
  onClose: () => void;
};

/**
 * One question before a session, asked where it can still change something.
 *
 * Asked afterwards it would be a survey; asked here it decides what goes on
 * the board. It is a sheet rather than a screen because the answer takes one
 * tap and any friction added to starting a workout is friction subtracted from
 * workouts happening at all.
 */
export function ConditionPicker({ visible, onPick, onClose }: Props) {
  const [recent, setRecent] = useState<(Condition | null)[]>([]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    listRecentConditions()
      .then((list) => alive && setRecent(list))
      .catch(() => {
        // Without the history she simply has nothing extra to say.
      });
    return () => {
      alive = false;
    };
  }, [visible]);

  const tired = tiredWord(recent);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grip} />
        <Text style={styles.title}>오늘 몸은 어떠세요?</Text>
        <Text style={styles.lead}>답에 맞춰 오늘 할 세트를 맞춰 둘게요.</Text>

        {tired && (
          <View style={styles.tired}>
            <Ionicons name="moon-outline" size={16} color={colors.gold} />
            <Text style={styles.tiredText}>{tired}</Text>
          </View>
        )}

        {CONDITIONS.map((c) => (
          <Pressable key={c.id} style={styles.choice} onPress={() => onPick(c.id)}>
            <View style={styles.choiceBody}>
              <Text style={styles.choiceLabel}>{c.label}</Text>
              <Text style={styles.choiceDetail}>{c.detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        ))}

        {/*
          Said plainly, because a reward that moved with the answer would turn
          this into a question about gold rather than about the body.
        */}
        <Text style={styles.note}>어느 쪽이든 받는 골드는 같아요.</Text>

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
  lead: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  tired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  tiredText: { color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  choiceBody: { flex: 1, gap: 2 },
  choiceLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  choiceDetail: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  note: { color: colors.textDim, fontSize: 11, lineHeight: 17 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.textDim, fontWeight: '700' },
});
