import { StyleSheet, Text, View } from 'react-native';
import { Portrait } from '@/components/Portrait';
import { colors, paper, spacing } from '@/lib/theme';

type Props = {
  name: string;
  /** Her portrait, or null to fall back to the emblem. */
  portrait?: number | null;
  children: string;
};

export function Advisor({ name, portrait, children }: Props) {
  return (
    <View style={styles.wrap}>
      <Portrait source={portrait ?? null} size={56} />

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
