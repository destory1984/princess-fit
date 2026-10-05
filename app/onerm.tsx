import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { BigStepper } from '@/components/BigStepper';
import { OneRmChart } from '@/components/OneRmChart';
import { estimates, MAX_REPS, spread } from '@/lib/oneRm';
import { nextWeight } from '@/lib/weight';
import { colors, paper, radius, spacing } from '@/lib/theme';

/**
 * What one rep of your heaviest would be, from a set you actually did.
 *
 * The answer is a range, not a number: the published formulas disagree, and
 * by more the further you are from a single. Showing the range and then the
 * five values is more honest than picking a favourite and calling it your max.
 */
export default function OneRmScreen() {
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(8);

  const range = spread(weight, reps);
  const all = estimates(weight, reps);

  return (
    // Taller than a small phone once the chart and the five values are in, so
    // it scrolls rather than hiding the list and the caution below the fold.
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        정확한 자세로 딱 한 번 들 수 있는 무게예요. 실제로 해본 세트를 넣으면 계산해 드려요.
      </Text>

      <View style={styles.inputs}>
        <BigStepper
          value={weight}
          unit="kg"
          step={1}
          nextAt={nextWeight}
          bigStep={10}
          decimals={weight % 1 === 0 ? 0 : 1}
          onChange={setWeight}
        />
        <View style={styles.divider} />
        <BigStepper
          value={reps}
          unit="회"
          step={1}
          bigStep={5}
          onChange={(v) => setReps(Math.max(1, Math.min(MAX_REPS, v)))}
        />
      </View>

      {range && (
        <View style={styles.answer}>
          <Text style={styles.answerLabel}>예상 1RM</Text>
          <Text style={styles.answerValue}>
            {range.low === range.high
              ? `${range.low}kg`
              : `${range.low} ~ ${range.high}kg`}
          </Text>
          <Text style={styles.answerNote}>
            식마다 답이 달라요. 이 범위 안 어딘가로 보시면 돼요.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <OneRmChart weight={weight} />
      </View>

      <View style={styles.card}>
        {all.map((e) => (
          <View key={e.name} style={styles.row}>
            <Text style={styles.rowName}>{e.name}</Text>
            <Text style={styles.rowValue}>{e.kg}kg</Text>
          </View>
        ))}
      </View>

      <Text style={styles.caution}>
        계산일 뿐이에요. 실제로 1회를 시도할 때는 보조자를 두세요.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  lead: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
  inputs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  divider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  answer: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  answerLabel: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  answerValue: { color: colors.accent, fontSize: 30, fontWeight: '800' },
  answerNote: { color: colors.textDim, fontSize: 14, lineHeight: 21, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  rowName: { color: colors.text, fontSize: 15, flex: 1 },
  rowValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  caution: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
});
