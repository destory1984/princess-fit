import { Image, StyleSheet, View } from "react-native";
import { DOLL_ASPECT } from "@/lib/outfitArt";
import { crisp } from "@/lib/pixel";
import { colors, paper } from "@/lib/theme";

type Props = {
  source: number;
  size: number;
  /** Ring colour; the accent marks the chosen one. */
  active?: boolean;
};

// The art is full-body, with the face in the upper half. Blown up and pulled upward,
// the round frame lands on the head instead of the whole doll. On the 96-dot canvas
// the head is rows 8 to 50, so its middle is 0.31 of the way down, and at this scale
// the frame is a little narrower than the head: hair touches the ring, the face fills it.
const SCALE = 2.1;
const FACE_FROM_TOP = 0.31;

/** A round bust crop of a full-body portrait. */
export function Portrait({ source, size, active }: Props) {
  const height = size * SCALE;
  const width = height * DOLL_ASPECT;

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2 },
        active && styles.frameOn,
      ]}
    >
      <Image
        source={source}
        resizeMode="contain"
        style={[crisp, {
          position: "absolute",
          width,
          height,
          top: size / 2 - height * FACE_FROM_TOP,
          left: (size - width) / 2,
        }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  frameOn: { borderColor: colors.accent, borderWidth: 3 },
});
