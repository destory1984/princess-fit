import { StyleSheet, Text, View } from 'react-native';
import { muscleColor, radius, spacing } from '@/lib/theme';

export function MuscleTag({ group }: { group: string }) {
  const color = muscleColor(group);
  return (
    <View style={[styles.tag, { backgroundColor: `${color}26`, borderColor: `${color}66` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{group}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
