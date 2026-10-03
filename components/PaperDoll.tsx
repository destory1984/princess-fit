import { useEffect, useMemo } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { DOLL_ASPECT, dotGarmentArt } from "@/lib/outfitArt";
import { layersOf } from "@/lib/outfit";
import { crisp } from "@/lib/pixel";
import { useGirl, type Girl } from '@/lib/girl';

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
  /** Someone else's girl, when visiting. Defaults to the one this phone raises. */
  girl?: Girl;
};

/**
 * The girl and everything she has on, stacked back to front: her body, what she
 * wears, her hair.
 *
 * Every layer is the same canvas (`DOLL_ASPECT`), so each one simply fills the box
 * and they line up — there is no per-garment placement any more. A garment is drawn
 * only once it has dot art on that canvas (`dotGarmentArt`); until then she stays in
 * her gym clothes, which is wrong for the shop but not as wrong as a gown drawn for
 * a tall body hanging off a short one.
 *
 * Give the box a width, or both dimensions.
 */
export function PaperDoll({ worn, style, idle, girl: visiting }: Props) {
  const own = useGirl();
  const girl = visiting ?? own;
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
    <Animated.View style={[styles.doll, style, idle ? drift : null]}>
      <Image source={girl.art.body} style={styles.layer} resizeMode="contain" />
      <Image source={girl.art.clothes} style={styles.layer} resizeMode="contain" />
      {layersOf(worn).map((garment) => {
        const source = dotGarmentArt(garment.id);
        return source ? (
          <Image key={garment.id} source={source} style={styles.layer} resizeMode="contain" />
        ) : null;
      })}
      <Image source={girl.art.hair} style={styles.layer} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  doll: { pointerEvents: "none", aspectRatio: DOLL_ASPECT, overflow: "hidden" },
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    ...crisp,
  },
});
