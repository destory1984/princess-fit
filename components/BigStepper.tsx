import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/lib/theme";

type Props = {
  value: number;
  unit: string;
  step: number;
  /** Second, coarser step shown as an extra pair of buttons. */
  bigStep?: number;
  /**
   * Replaces `step` when the fine step depends on the value — weight moves by
   * whole kilos on dumbbells and by 2.5 on a loaded bar. It returns the next
   * value rather than a step size, so it can also refuse to overshoot: coming
   * down from 21kg lands on 20, not on 18.5. The buttons take their labels
   * from what it actually returns, so the rule is visible on screen.
   */
  nextAt?: (value: number, direction: 1 | -1) => number;
  decimals?: number;
  onChange: (next: number) => void;
};

/** Trim a trailing .0 so the buttons read −2.5 and +10, never +10.0. */
function label(amount: number) {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${Number(Math.abs(amount).toFixed(2))}`;
}

export function BigStepper({
  value,
  unit,
  step,
  bigStep,
  nextAt,
  decimals = 0,
  onChange,
}: Props) {
  const set = (next: number) =>
    onChange(Math.max(0, Number(next.toFixed(decimals))));

  const fineDown = nextAt ? nextAt(value, -1) - value : -step;
  const fineUp = nextAt ? nextAt(value, 1) - value : step;

  // Coarse outside, fine inside, so the two sizes never sit next to each other
  // and the row reads outward from the middle in both directions.
  const amounts = bigStep
    ? [-bigStep, fineDown, fineUp, bigStep]
    : [fineDown, fineUp];

  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <Text style={styles.value}>
          {decimals ? value.toFixed(decimals) : value}
        </Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.buttons}>
        {amounts.map((amount, i) => {
          // At zero there is nothing below to offer: the button would read
          // "+0" and do nothing, which looks like a bug because it is one.
          const dead = amount === 0;
          return (
            <Pressable
              key={i}
              style={[styles.button, dead && styles.buttonOff]}
              disabled={dead}
              hitSlop={4}
              onPress={() => set(value + amount)}
            >
              <Text style={styles.buttonText} numberOfLines={1}>
                {dead ? "−" : label(amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", gap: spacing.sm },
  readout: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: {
    color: colors.text,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
  },
  unit: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "stretch",
  },
  // Every button the same size and the same type: an icon beside a text chip
  // made one look like a control and the other like a note.
  //
  // They share the width they are given rather than claiming a fixed size —
  // at phone width four fixed buttons each side overran the middle and the
  // two steppers collided.
  button: {
    flex: 1,
    minWidth: 0,
    height: 38,
    paddingHorizontal: 2,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOff: { opacity: 0.35 },
  buttonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 19,
  },
});
