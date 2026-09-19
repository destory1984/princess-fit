import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/lib/theme';

type Props = {
  value: number;
  unit: string;
  step: number;
  /** Second, coarser step shown as an extra pair of buttons. */
  bigStep?: number;
  decimals?: number;
  onChange: (next: number) => void;
};

/** Trim a trailing .0 so the buttons read −2.5 and +10, never +10.0. */
function label(amount: number) {
  const sign = amount < 0 ? '−' : '+';
  return `${sign}${Math.abs(amount)}`;
}

export function BigStepper({ value, unit, step, bigStep, decimals = 0, onChange }: Props) {
  const set = (next: number) => onChange(Math.max(0, Number(next.toFixed(decimals))));

  // Coarse outside, fine inside, so the two sizes never sit next to each other
  // and the row reads outward from the middle in both directions.
  const amounts = bigStep ? [-bigStep, -step, step, bigStep] : [-step, step];

  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <Text style={styles.value}>{decimals ? value.toFixed(decimals) : value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.buttons}>
        {amounts.map((amount) => (
          <Pressable
            key={amount}
            style={styles.button}
            hitSlop={4}
            onPress={() => set(value + amount)}>
            <Text style={styles.buttonText}>{label(amount)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: spacing.sm },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { color: colors.text, fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  unit: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // Every button the same size and the same type: an icon beside a text chip
  // made one look like a control and the other like a note.
  button: {
    minWidth: 44,
    height: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 15, lineHeight: 20 },
});
