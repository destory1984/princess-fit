import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { paper, spacing } from '@/lib/theme';

const CELLS = 10;

type Props = { icon: string; name: string; value: number };

/** An old-RPG stat line: notched bar plus the raw number. */
export function StatBar({ icon, name, value }: Props) {
  const filled = Math.round((value / 100) * CELLS);
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={14} color={paper.inkDim} />
      <Text style={styles.name}>{name}</Text>
      <View style={styles.track}>
        {Array.from({ length: CELLS }, (_, i) => (
          <View key={i} style={[styles.cell, i < filled && styles.cellOn]} />
        ))}
      </View>
      <Text style={styles.value}>{String(value).padStart(3, ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: paper.ink, fontSize: 15, fontWeight: '700', width: 54 },
  track: { flex: 1, flexDirection: 'row', gap: 2 },
  cell: { flex: 1, height: 12, backgroundColor: paper.track, borderRadius: 1 },
  cellOn: { backgroundColor: paper.fill },
  value: {
    color: paper.ink,
    fontSize: 15,
    fontWeight: '800',
    width: 28,
    textAlign: 'right',
  },
});
