import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, paper } from '@/lib/theme';

/** Stands in until a portrait file exists. */
function Emblem({ size }: { size: number }) {
  return (
    <Svg viewBox="0 0 40 40" width={size * 0.78} height={size * 0.78}>
      <Circle cx={20} cy={20} r={18} fill={paper.bgAlt} stroke={colors.gold} strokeWidth={1.5} />
      <Path
        d="M20 9 L23 17 L31 17 L25 22 L27 30 L20 25 L13 30 L15 22 L9 17 L17 17 Z"
        fill={colors.accent}
        opacity={0.8}
      />
    </Svg>
  );
}

type Props = {
  source: number | null;
  size: number;
  /** Ring colour; the accent marks the chosen one. */
  active?: boolean;
};

// The art is full-body, with the face near the top. Blown up and pulled upward,
// the round frame lands on the head instead of the whole doll.
const SCALE = 3.2;
const FACE_FROM_TOP = 0.3;

/** A round bust crop of an advisor's portrait. */
export function Portrait({ source, size, active }: Props) {
  const height = size * SCALE;
  const width = height * 0.75;

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2 },
        active && styles.frameOn,
      ]}>
      {source ? (
        <Image
          source={source}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width,
            height,
            top: size / 2 - height * FACE_FROM_TOP,
            left: (size - width) / 2,
          }}
        />
      ) : (
        <Emblem size={size} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frameOn: { borderColor: colors.accent, borderWidth: 3 },
});
