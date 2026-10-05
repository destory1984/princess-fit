import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Svg, { Line, Path } from 'react-native-svg';
import { curves, MAX_REPS } from '@/lib/oneRm';
import { colors, paper, spacing } from '@/lib/theme';

/**
 * Five colours, validated against this surface for colourblind separation.
 * Formula order is fixed, so a curve keeps its colour whatever the weight.
 */
const SERIES = ['#1F6FD0', '#C24A16', '#0E7A57', '#7C3FBF', '#8A6A0E'];

const PAD = { top: 12, right: 12, bottom: 22, left: 36 };

/**
 * Every formula's estimate across the rep range, drawn together.
 *
 * Together is the point: they disagree, and by more the further you get from
 * a single rep. One line would look like an answer; five look like the range
 * they actually are.
 */
export function OneRmChart({ weight, height = 200 }: { weight: number; height?: number }) {
  const [width, setWidth] = useState(0);

  const all = curves(weight);
  const values = all.flatMap((c) => c.points.map((p) => p.kg));
  const max = Math.max(...values, weight);
  const min = Math.min(...values, weight);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (reps: number) => PAD.left + ((reps - 1) / (MAX_REPS - 1)) * plotW;
  const y = (kg: number) => PAD.top + (1 - (kg - min) / (max - min || 1)) * plotH;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        {[min, (min + max) / 2, max].map((value) => (
          <Line
            key={value}
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(value)}
            y2={y(value)}
            stroke={paper.lineSoft}
            strokeWidth={1}
          />
        ))}

        {width > 0 &&
          all.map((curve, i) => (
            <Path
              key={curve.name}
              d={curve.points
                .map((p, j) => `${j === 0 ? 'M' : 'L'}${x(p.reps).toFixed(1)},${y(p.kg).toFixed(1)}`)
                .join(' ')}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2}
              fill="none"
            />
          ))}
      </Svg>

      <View style={styles.axis}>
        <Text style={styles.axisText}>1회</Text>
        <Text style={styles.axisText}>{MAX_REPS}회</Text>
      </View>

      {/* Always a legend: five lines are never told apart by colour alone. */}
      <View style={styles.legend}>
        {all.map((curve, i) => (
          <View key={curve.name} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: SERIES[i % SERIES.length] }]} />
            <Text style={styles.legendText}>{curve.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD.left },
  axisText: { color: colors.textDim, fontSize: 13 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: colors.textDim, fontSize: 13 },
});
