import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CONDITIONS, tiredWord, type Condition } from '@/lib/condition';
import { listMuscleLoad, listRecentConditions, routineSlugs } from '@/lib/db';
import {
  clashWord,
  freshest,
  recoveryOf,
  stillTired,
  type Muscle,
} from '@/lib/recovery';
import { colors, paper, radius, spacing } from '@/lib/theme';

type Props = {
  visible: boolean;
  onPick: (condition: Condition) => void;
  onClose: () => void;
  /** The routine about to be started, if one was chosen. */
  routineId?: string | null;
};

/**
 * One question before a session, asked where it can still change something.
 *
 * Asked afterwards it would be a survey; asked here it decides what goes on
 * the board. It is a sheet rather than a screen because the answer takes one
 * tap and any friction added to starting a workout is friction subtracted from
 * workouts happening at all.
 */
export function ConditionPicker({ visible, onPick, onClose, routineId }: Props) {
  const [recent, setRecent] = useState<(Condition | null)[]>([]);
  const [muscles, setMuscles] = useState<Muscle[] | null>(null);
  // Tagged with the routine it belongs to rather than cleared when there is
  // none. Clearing meant a setState run synchronously inside the effect, and
  // last session's muscles must not be read against this session's routine.
  const [plan, setPlan] = useState<{ id: string; slugs: string[] } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    listRecentConditions()
      .then((list) => alive && setRecent(list))
      .catch(() => {
        // Without the history she simply has nothing extra to say.
      });
    listMuscleLoad()
      .then((sessions) => alive && setMuscles(recoveryOf(sessions)))
      .catch(() => {
        // The three choices are the point; the advice is a bonus.
      });
    if (routineId) {
      routineSlugs(routineId)
        .then((slugs) => alive && setPlan({ id: routineId, slugs }))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [visible, routineId]);

  const tired = tiredWord(recent);
  const ready = muscles ? freshest(muscles) : [];
  const sore = muscles ? stillTired(muscles) : [];
  const planned = routineId && plan?.id === routineId ? plan.slugs : [];
  const clash = muscles && planned.length ? clashWord(planned, muscles) : null;

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

        {/*
          The question is about the body as a whole; this is about which parts
          of it. Shown beside the answers rather than on its own screen because
          this is the moment the choice is being made — the 회복 screen has the
          same numbers for anyone who wants to look properly.
        */}
        {clash ? (
          <View style={styles.advice}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.gold} />
            <Text style={styles.adviceText}>{clash}</Text>
          </View>
        ) : sore.length > 0 || ready.length > 0 ? (
          <View style={styles.advice}>
            <Ionicons name="pulse-outline" size={16} color={colors.gold} />
            <View style={styles.adviceBody}>
              {ready.length > 0 && (
                <Text style={styles.adviceText}>
                  오늘 할 만한 곳 · {ready.map((m) => m.label).join(' · ')}
                </Text>
              )}
              {sore.length > 0 && (
                <Text style={styles.adviceDim}>
                  아직 쉬는 중 ·{' '}
                  {sore.map((m) => `${m.label} ${m.recovery}%`).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        ) : null}

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
  advice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.faint,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  adviceBody: { flex: 1, gap: 2 },
  adviceText: { color: colors.text, fontSize: 12, lineHeight: 19 },
  adviceDim: { color: colors.textDim, fontSize: 12, lineHeight: 19 },
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
