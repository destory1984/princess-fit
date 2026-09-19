import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BASE_GIRL, garmentArt } from "@/lib/outfitArt";
import { layersOf } from "@/lib/outfit";

type Props = {
  /** Ids of the garments she has on. */
  worn: string[];
  style?: StyleProp<ViewStyle>;
  /**
   * Breathe. A standing sprite reads as a cardboard cut-out; a couple of
   * pixels of drift is enough to make her look alive, and costs no new art.
   */
  idle?: boolean;
};

/**
 * The girl and everything she has on, stacked back to front.
 *
 * Every layer is sized explicitly — width and height, never insets alone. An
 * image given only insets or only a width falls back to its intrinsic size,
 * which for this art is over a thousand pixels; the box clips as well, so a
 * mistake here can never spill out over the room again.
 *
 * Give the box a width, or both dimensions.
 */
export function PaperDoll({ worn, style, idle }: Props) {
  // Percentages and aspectRatio both lose to an image's intrinsic size here,
  // so the box is measured and every garment placed in real pixels.
  const [box, setBox] = useState({ width: 0, height: 0 });
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!idle) return;
    const cycle = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    cycle.start();
    return () => cycle.stop();
  }, [idle, breath]);

  // Whole-doll drift, so her clothes move with her rather than sliding off.
  const drift = {
    transform: [
      { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
    ],
  };

  return (
    <Animated.View
      style={[styles.doll, style, idle ? drift : null]}
      pointerEvents="none"
      onLayout={(e) => setBox(e.nativeEvent.layout)}
    >
      <Image
        source={BASE_GIRL.source}
        style={styles.base}
        resizeMode="contain"
      />

      {box.width > 0 &&
        layersOf(worn).map((garment) => {
          const art = garmentArt(garment.id);
          const width = box.width * garment.fit.w;
          return (
            <Image
              key={garment.id}
              source={art.source}
              resizeMode="contain"
              style={[
                styles.garment,
                {
                  left: box.width * garment.fit.x,
                  top: box.height * garment.fit.y,
                  width,
                  height: width / art.aspect,
                },
              ]}
            />
          );
        })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  doll: { aspectRatio: 1086 / 1448, overflow: "hidden" },
  base: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  garment: { position: "absolute" },
});
