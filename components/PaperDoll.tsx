import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { garmentArt, BASE_GIRL } from '@/lib/outfitArt';
import { layersOf } from '@/lib/outfit';

type Props = {
  /** Ids of the garments she has on. */
  worn: string[];
  style?: StyleProp<ViewStyle>;
};

/**
 * The girl and everything she has on, stacked back to front.
 *
 * Every layer fills the same box, so the base and the garments line up by
 * construction — a garment only needs its `fit` because its art was drawn on
 * its own canvas rather than over the base.
 */
export function PaperDoll({ worn, style }: Props) {
  return (
    <View style={[styles.doll, style]} pointerEvents="none">
      <Image source={BASE_GIRL} style={styles.layer} resizeMode="contain" />

      {layersOf(worn).map((garment) => (
        <Image
          key={garment.id}
          source={garmentArt(garment.id)}
          resizeMode="contain"
          style={[
            styles.layer,
            {
              left: `${garment.fit.x * 100}%`,
              top: `${garment.fit.y * 100}%`,
              width: `${garment.fit.w * 100}%`,
              right: undefined,
              bottom: undefined,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  doll: { aspectRatio: 1086 / 1448 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
