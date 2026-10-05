import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Portrait } from '@/components/Portrait';
import { colors, paper, spacing } from '@/lib/theme';

type Props = {
  /** Always her; passed in so the name lives in one place. */
  name: string;
  portrait: number;
  children: string;
};

export function Advisor({ name, portrait, children }: Props) {
  return (
    <View style={styles.wrap}>
      <Portrait source={portrait} size={56} />

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
  bubble: {
    flex: 1,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: spacing.md,
    // No margin above: the bubble starts where the portrait does, so the gap to the
    // card over it is the screen's gap and not eight more (2026-10-06).
  },
  // A small square rotated into a diamond, half tucked behind the bubble.
  tail: {
    position: 'absolute',
    left: -6,
    top: 22,
    width: 10,
    height: 10,
    backgroundColor: paper.bgAlt,
    borderLeftColor: colors.gold,
    borderBottomColor: colors.gold,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  name: { color: colors.accent, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  text: { color: colors.text, fontSize: 15, lineHeight: 23 },
});
