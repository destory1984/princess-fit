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
import { accessoryArt, DOLL_ASPECT, dotGarmentArt } from "@/lib/outfitArt";
import { keepsOwnTop, stackOf, type Garment } from "@/lib/outfit";
import { useGirl, type Girl } from '@/lib/girl';

// react-native-web has no native animation driver, so asking for one there
// only produces a warning and the same JS-driven animation.
const NATIVE_DRIVER = Platform.OS !== 'web';

type Props = {
  /** Ids of the garments she has on, and of the accessories she owns (`adorned`). */
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
 * The girl and everything she has on, stacked back to front: her body, her own
 * clothes, what she has been given, her hair, and over the hair what is tied in it or
 * held (`stackOf`). Her own top comes off when she is given one (`keepsOwnTop`).
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

  const stack = stackOf(worn);
  const layer = (garment: Garment) => {
    const source = dotGarmentArt(garment.id);
    return source ? (
      <Image key={garment.id} source={source} style={styles.layer} resizeMode="contain" />
    ) : null;
  };

  // Accessories ride in the same list. They are not garments, so `stackOf`
  // passes over them and they are picked out here.
  const trinket = (overHair: boolean) =>
    worn.map((id) => {
      const art = accessoryArt(id);
      return art && art.overHair === overHair ? (
        <Image key={id} source={art.source} style={styles.layer} resizeMode="contain" />
      ) : null;
    });

  return (
    <Animated.View style={[styles.doll, style, idle ? drift : null]}>
      <Image source={girl.art.body} style={styles.layer} resizeMode="contain" />
      <Image source={girl.art.bottom} style={styles.layer} resizeMode="contain" />
      <Image source={girl.art.feet} style={styles.layer} resizeMode="contain" />
      {keepsOwnTop(worn) && (
        <Image source={girl.art.top} style={styles.layer} resizeMode="contain" />
      )}
      {stack.under.map(layer)}
      {trinket(false)}
      <Image source={girl.art.hair} style={styles.layer} resizeMode="contain" />
      {stack.over.map(layer)}
      {trinket(true)}
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
  },
});
