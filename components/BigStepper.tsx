import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
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
  /** Makes the number itself a button — the weight opens its plates. */
  onPressValue?: () => void;
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
  onPressValue,
  onChange,
}: Props) {
  /*
    Two decimals, not `decimals`.

    `decimals` says how to *write* the number; rounding the value to it threw
    away half a kilo on the way past. A weight showing 21 has no decimal place
    on screen, so 21 + 2.5 was saved as 24 — and from there the numbers drift
    off the rack and never come back. What may be stored is the caller's rule,
    not the formatter's.
  */
  const set = (next: number) => onChange(Math.max(0, Number(next.toFixed(2))));

  const fineUp = nextAt ? nextAt(value, 1) - value : step;
  const moveDown = nextAt ? nextAt(value, -1) - value : -step;
  /*
    At zero there is nowhere down to go, and `nextAt` says so by returning
    zero — but a button labelled 「−0」 or 「−」 is not what a person needs to
    see there. What they need is the row keeping its shape, with the step that
    *would* apply written on a button that plainly cannot be pressed. So the
    label falls back to the size of the step going the other way, which at the
    bottom of the scale is the same size.
  */
  const fineDown = moveDown !== 0 ? moveDown : -Math.abs(fineUp || step);

  // Coarse outside, fine inside, so the two sizes never sit next to each other
  // and the row reads outward from the middle in both directions.
  const amounts = bigStep
    ? [-bigStep, fineDown, fineUp, bigStep]
    : [fineDown, fineUp];

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.readout}
        disabled={!onPressValue}
        onPress={onPressValue}
        hitSlop={4}
      >
        <Text style={styles.value}>
          {decimals ? value.toFixed(decimals) : value}
        </Text>
        <Text style={styles.unit}>{unit}</Text>
      </Pressable>
      <View style={styles.buttons}>
        {amounts.map((amount, i) => {
          /*
            Dead when pressing it would land on the number already showing.

            It used to be only the fine step that could go dead, so at 0kg the
            −10 next to it stayed lit and did nothing at all: the weight is
            clamped at zero, so the press was swallowed. A button that looks
            live and answers nothing is worse than one that is plainly out of
            reach — the first time it reads as the app being broken, and after
            that as the tap not having registered.
          */
          const target = Math.max(0, Number((value + amount).toFixed(2)));
          const dead = target === value;
          return (
            <Pressable
              key={i}
              style={[styles.button, dead && styles.buttonOff]}
              disabled={dead}
              hitSlop={4}
              onPress={() => set(value + amount)}
            >
              <Text style={styles.buttonText} numberOfLines={1} allowFontScaling={false}>
                {label(amount)}
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
  unit: { color: colors.textDim, fontSize: 16, fontWeight: "600" },
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
    // No side padding: at 375 wide a button is 31 across and 「−2.5」 needs 30.
    // With 2 each side it had 28 and read 「−…」.
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOff: { opacity: 0.35 },
  buttonText: {
    color: colors.text,
    fontWeight: "700",
    // 14, and it stays 14: the type was made larger everywhere on 2026-10-06 and
    // these, at 16, read 「−.」 and 「+.」 on a phone. The button is as wide as
    // an eighth of the card and no wider.
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.3,
  },
});
