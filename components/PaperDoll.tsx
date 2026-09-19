import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BASE_GIRL, garmentArt } from '@/lib/outfitArt';
import { layersOf } from '@/lib/outfit';

type Props = {
  /** Ids of the garments she has on. */
  worn: string[];
  style?: StyleProp<ViewStyle>;
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
export function PaperDoll({ worn, style }: Props) {
  return (
    <View style={[styles.doll, style]} pointerEvents="none">
      <Image source={BASE_GIRL.source} style={styles.base} resizeMode="contain" />

      {layersOf(worn).map((garment) => {
        const art = garmentArt(garment.id);
        return (
          <Image
            key={garment.id}
            source={art.source}
            resizeMode="contain"
            style={[
              styles.garment,
              {
                left: `${garment.fit.x * 100}%`,
                top: `${garment.fit.y * 100}%`,
                width: `${garment.fit.w * 100}%`,
                aspectRatio: art.aspect,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  doll: { aspectRatio: 1086 / 1448, overflow: 'hidden' },
  base: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  garment: { position: 'absolute' },
});
