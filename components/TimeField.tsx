import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { formatMinuteOfDay } from '@/lib/sleep';
import { colors, spacing } from '@/lib/theme';

type Props = {
  label: string;
  /** Minutes past midnight. */
  value: number;
  onChange: (next: number) => void;
};

const DAY = 24 * 60;

/**
 * A clock time, set by nudging rather than typing.
 *
 * Wraps at midnight in both directions, because the times this is used for —
 * going to bed — are usually on the wrong side of it, and an input that
 * stops at 00:00 would refuse the most common answer.
 */
export function TimeField({ label, value, onChange }: Props) {
  const shift = (delta: number) => onChange((((value + delta) % DAY) + DAY) % DAY);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatMinuteOfDay(value)}</Text>
      <View style={styles.buttons}>
        {[-60, -10, 10, 60].map((delta) => (
          <Pressable key={delta} style={styles.button} hitSlop={4} onPress={() => shift(delta)}>
            <Text style={styles.buttonText} numberOfLines={1} allowFontScaling={false}>
              {delta < 0 ? '−' : '+'}
              {Math.abs(delta) === 60 ? '1시간' : `${Math.abs(delta)}분`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: spacing.sm },
  label: { color: colors.textDim, fontSize: 14 },
  value: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  button: {
    flex: 1,
    minWidth: 0,
    height: 38,
    paddingHorizontal: 2,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 12 and no larger, for the same reason as BigStepper's: 「−1시간」 in a fixed button.
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 12, lineHeight: 16 },
});
