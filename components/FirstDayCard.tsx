import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { FirstDayStep } from '@/lib/firstDay';
import { withParticle } from '@/lib/korean';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  /** Her entry for this session, or null while it is still being written. */
  diary: string | null;
  girlName: string;
  step: FirstDayStep;
  gold: number;
  onGift: () => void;
};

/**
 * The first finished session, said in her words and then handed on.
 *
 * Her entry sits in the middle of the screen and large, because it is the
 * first thing of hers this person reads; on every later day it is a quiet
 * line under the card. Under it, one button to the shop — not a tour. The
 * loop is shown by going round it once.
 */
export function FirstDayCard({ diary, girlName, step, gold, onGift }: Props) {
  if (step.step === 'none' && !diary) return null;

  return (
    <View style={styles.card}>
      {diary && (
        <>
          <Text style={styles.label}>{girlName}의 첫 일기</Text>
          <Text style={styles.diary}>{diary}</Text>
        </>
      )}

      {step.step === 'invite' && (
        <>
          <Text style={styles.lead}>
            지금 {gold.toLocaleString()} G가 있어요. {withParticle(step.gift.name, '을를')} 살 수
            있어요.
          </Text>
          <Pressable style={styles.button} onPress={onGift}>
            <Ionicons name="gift-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>{girlName}에게 선물하러 가기</Text>
          </Pressable>
        </>
      )}

      {step.step === 'given' && (
        <Text style={styles.lead}>
          {withParticle(girlName, '이가')} 첫 선물을 받았어요. 아래 카드에서 하고 있어요.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  diary: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 29,
    fontWeight: '600',
    textAlign: 'center',
  },
  lead: { color: colors.textDim, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
