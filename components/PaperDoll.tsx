import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { garmentArt } from "@/lib/outfitArt";
import { layersOf } from "@/lib/outfit";
import { useGirl } from '@/lib/girl';

// react-native-web has no native animation driver, so asking for one there
// only produces a warning and the same JS-driven animation.
const NATIVE_DRIVER = Platform.OS !== 'web';

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
  const girl = useGirl();
  // Percentages and aspectRatio both lose to an image's intrinsic size here,
  // so the box is measured and every garment placed in real pixels.
  const [box, setBox] = useState({ width: 0, height: 0 });
  // useMemo rather than a ref: the value is created once either way, and
  // reading a ref during render is the kind of thing that only works by luck.
  const breath = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!idle) return;
    const cycle = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    );
    cycle.start();
    return () => cycle.stop();
  }, [idle, breath]);

  // Whole-doll drift, so her clothes move with her rather than sliding off.
  const drift = {
    transform: [
      {
        translateY: breath.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={[styles.doll, style, idle ? drift : null]}
      onLayout={(e) => setBox(e.nativeEvent.layout)}
    >
      <Image
        source={girl.base}
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
  doll: { pointerEvents: "none", aspectRatio: 1086 / 1448, overflow: "hidden" },
  base: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  garment: { position: "absolute" },
});
