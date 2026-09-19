import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Household } from '@/lib/economy';
import { FULL } from '@/lib/economy';
import { colors, paper, radius, spacing } from '@/lib/theme';

/** A need, drawn as a bar that empties rather than a number nobody reads. */
function Need({ icon, label, value }: { icon: any; label: string; value: number }) {
  const ratio = Math.max(0, Math.min(1, value / FULL));
  // Low needs turn red so a glance is enough; the label carries it for anyone
  // who cannot tell the colours apart.
  const tone = ratio <= 0.3 ? colors.accent : ratio <= 0.6 ? colors.gold : colors.chromeDim;

  return (
    <View style={styles.need}>
      <Ionicons name={icon} size={14} color={tone} />
      <Text style={styles.needLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: tone }]} />
      </View>
      <Text style={styles.needValue}>{Math.round(value)}</Text>
    </View>
  );
}

/** What she has, and what she needs. */
export function Purse({ house }: { house: Household }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.goldRow}>
        <Ionicons name="ellipse" size={14} color={colors.gold} />
        <Text style={styles.gold}>{house.gold.toLocaleString()}</Text>
        <Text style={styles.goldUnit}>G</Text>
      </View>
      <Need icon="restaurant-outline" label="포만감" value={house.satiety} />
      <Need icon="shirt-outline" label="차림새" value={house.attire} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  goldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  gold: { color: colors.text, fontSize: 20, fontWeight: '800', lineHeight: 26 },
  goldUnit: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  need: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  needLabel: { color: colors.textDim, fontSize: 12, width: 44 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: paper.bg,
    borderColor: colors.faint,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
  needValue: { color: colors.textDim, fontSize: 11, width: 24, textAlign: 'right' },
});
