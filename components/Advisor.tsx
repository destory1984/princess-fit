import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, paper, spacing } from '@/lib/theme';

/** A framed emblem, used until there is a portrait to show. */
function Emblem() {
  return (
    <Svg viewBox="0 0 40 40" width={44} height={44}>
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
  name: string;
  /** Her portrait, or null to fall back to the emblem. */
  portrait?: number | null;
  children: string;
};

export function Advisor({ name, portrait, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.portrait}>
        {portrait ? (
          <Image source={portrait} style={styles.portraitImage} resizeMode="contain" />
        ) : (
          <Emblem />
        )}
      </View>

      <View style={styles.bubble}>
        <View style={styles.tail} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.text}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  portrait: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  portraitImage: { width: '100%', height: '100%' },
  bubble: {
    flex: 1,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  // A small square rotated into a diamond, half tucked behind the bubble.
  tail: {
    position: 'absolute',
    left: -6,
    top: 14,
    width: 10,
    height: 10,
    backgroundColor: paper.bgAlt,
    borderLeftColor: colors.gold,
    borderBottomColor: colors.gold,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  name: { color: colors.accent, fontSize: 11, fontWeight: '800', marginBottom: 3 },
  text: { color: colors.text, fontSize: 13, lineHeight: 20 },
});
