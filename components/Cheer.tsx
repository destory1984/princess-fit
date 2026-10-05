import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Portrait } from '@/components/Portrait';
import { cheerFor } from '@/lib/cheer';
import { offerWord, type Suggestion } from '@/lib/suggest';
import { colors, paper, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';
import { faceArt } from '@/lib/outfitArt';
import { getBond } from '@/lib/db';
import type { Stage } from '@/lib/companion';

type Props = {
  doneSets: number;
  totalSets: number;
  /** What to do when she asks for something. Ignored when she is not. */
  onInvite?: () => void;
  /** The movement she is offering, when she has one to offer. */
  suggestion?: Suggestion | null;
  /** Take her up on it. */
  onAccept?: (suggestion: Suggestion) => void;
};

/**
 * Her, beside the board, saying how it is going.
 *
 * The workout screen is otherwise numbers and steppers — a spreadsheet you
 * happen to sweat next to. One face and one line is enough to make it someone
 * you are training in front of.
 */
export function Cheer({
  doneSets,
  totalSets,
  onInvite,
  suggestion,
  onAccept,
}: Props) {
  const girl = useGirl();
  // How close the two of them are, because one of the girls speaks by it.
  // Until it answers she uses the first stage's words.
  const [stage, setStage] = useState<Stage>('new');
  useEffect(() => {
    let alive = true;
    getBond(girl.id)
      .then((bond) => alive && setStage(bond.stage))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [girl.id]);
  const { line, done, invites } = cheerFor(doneSets, totalSets, girl.id, stage);
  // 「종목을 하나 골라볼까요?」 read as a button and was not one. A question you
  // cannot answer by tapping it is a question only in shape — and now that the
  // app knows what has rested, where you train and what you use, handing back
  // a list of sixty-seven would be passing the question along. She names one.
  const asking = invites && !!onInvite;
  const offering = asking && !!suggestion && !!onAccept;

  const head = (
    <>
      {/* Finishing is the one thing here she is plainly glad of. */}
      <Portrait source={done ? faceArt(girl.id, 'happy') : girl.base} size={40} active={done} />
      <View style={styles.body}>
        <Text style={styles.name}>{girl.name}</Text>
        <Text style={styles.line}>{offering ? offerWord(suggestion!) : line}</Text>
      </View>
      {asking && !offering && (
        <Ionicons name="chevron-forward" size={18} color={colors.accent} />
      )}
    </>
  );

  if (offering) {
    return (
      <View style={[styles.wrap, styles.wrapAsking, styles.column]}>
        <View style={styles.row}>{head}</View>
        {/* Hers to offer, yours to ignore — both one tap away. */}
        <View style={styles.actions}>
          <Pressable style={styles.accept} onPress={() => onAccept!(suggestion!)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.acceptText} numberOfLines={1}>
              {suggestion!.name}
            </Text>
          </Pressable>
          <Pressable style={styles.browse} onPress={onInvite}>
            <Text style={styles.browseText}>직접 고를래요</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (asking) {
    return (
      <Pressable
        style={[styles.wrap, styles.wrapAsking]}
        accessibilityRole="button"
        onPress={onInvite}>
        {head}
      </Pressable>
    );
  }

  return <View style={[styles.wrap, done && styles.wrapDone]}>{head}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  wrapDone: { borderColor: colors.accent, borderWidth: 1.5 },
  wrapAsking: { borderColor: colors.accent, borderWidth: 1.5 },
  column: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accept: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  acceptText: { color: '#fff', fontWeight: '800', fontSize: 15, lineHeight: 21, flexShrink: 1 },
  browse: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  browseText: { color: colors.textDim, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  body: { flex: 1 },
  name: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  line: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
