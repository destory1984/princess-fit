import { StyleSheet, Text, View } from 'react-native';
import type { GroupTotal } from '@/lib/db';
import { colors, muscleColor, spacing } from '@/lib/theme';

/** Sets per muscle group, as labelled bars — the imbalance should be obvious. */
export function GroupBreakdown({ totals }: { totals: GroupTotal[] }) {
  if (totals.length === 0) {
    return <Text style={styles.empty}>최근 30일 기록이 없어요.</Text>;
  }

  const max = Math.max(...totals.map((t) => t.sets));
  const allSets = totals.reduce((sum, t) => sum + t.sets, 0);

  return (
    <View style={styles.wrap}>
      {totals.map((t) => (
        <View key={t.group} style={styles.row}>
          <Text style={styles.name}>{t.group}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(3, (t.sets / max) * 100)}%`, backgroundColor: muscleColor(t.group) },
              ]}
            />
          </View>
          <Text style={styles.value}>
            {t.sets}
            <Text style={styles.share}> · {Math.round((t.sets / allSets) * 100)}%</Text>
          </Text>
        </View>
      ))}
      <Text style={styles.caption}>최근 30일 · 완료한 세트 {allSets}개 기준</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontSize: 15, fontWeight: '700', width: 40 },
  track: { flex: 1, height: 14, borderRadius: 3, backgroundColor: colors.surfaceAlt },
  fill: { height: 14, borderRadius: 3 },
  value: { color: colors.text, fontSize: 14, fontWeight: '700', width: 66, textAlign: 'right' },
  share: { color: colors.textDim, fontWeight: '400' },
  caption: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs },
  empty: { color: colors.textDim },
});
