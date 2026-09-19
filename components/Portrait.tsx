import { Image, StyleSheet, View } from "react-native";
import { colors, paper } from "@/lib/theme";

type Props = {
  source: number;
  size: number;
  /** Ring colour; the accent marks the chosen one. */
  active?: boolean;
};

// The art is full-body, with the face near the top. Blown up and pulled upward,
// the round frame lands on the head instead of the whole doll.
const SCALE = 3.2;
const FACE_FROM_TOP = 0.3;

/** A round bust crop of a full-body portrait. */
export function Portrait({ source, size, active }: Props) {
  const height = size * SCALE;
  const width = height * 0.75;

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
        style={{
          position: "absolute",
          width,
          height,
          top: size / 2 - height * FACE_FROM_TOP,
          left: (size - width) / 2,
        }}
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
