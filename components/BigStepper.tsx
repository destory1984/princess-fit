import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  value: number;
  unit: string;
  step: number;
  /** Second, coarser step shown as an extra pair of buttons. */
  bigStep?: number;
  decimals?: number;
  onChange: (next: number) => void;
};

export function BigStepper({ value, unit, step, bigStep, decimals = 0, onChange }: Props) {
  const set = (next: number) => onChange(Math.max(0, Number(next.toFixed(decimals))));

  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <Text style={styles.value}>{decimals ? value.toFixed(decimals) : value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => set(value - step)}>
          <Ionicons name="remove" size={20} color={colors.text} />
        </Pressable>
        {bigStep ? (
          <>
            <Pressable style={styles.chip} onPress={() => set(value - bigStep)}>
              <Text style={styles.chipText}>-{bigStep}</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => set(value + bigStep)}>
              <Text style={styles.chipText}>+{bigStep}</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable style={styles.button} onPress={() => set(value + step)}>
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
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
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
});
