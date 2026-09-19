import { StyleSheet, Text, View } from 'react-native';
import { Portrait } from '@/components/Portrait';
import { cheerFor } from '@/lib/cheer';
import { GIRL_NAME } from '@/lib/girl';
import { BASE_GIRL } from '@/lib/outfitArt';
import { colors, paper, radius, spacing } from '@/lib/theme';

type Props = {
  doneSets: number;
  totalSets: number;
};

/**
 * 리나, beside the board, saying how it is going.
 *
 * The workout screen is otherwise numbers and steppers — a spreadsheet you
 * happen to sweat next to. One face and one line is enough to make it someone
 * you are training in front of.
 */
export function Cheer({ doneSets, totalSets }: Props) {
  const { line, done } = cheerFor(doneSets, totalSets);

  return (
    <View style={[styles.wrap, done && styles.wrapDone]}>
      <Portrait source={BASE_GIRL.source} size={40} active={done} />
      <View style={styles.body}>
        <Text style={styles.name}>{GIRL_NAME}</Text>
        <Text style={styles.line}>{line}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  wrapDone: { borderColor: colors.accent, borderWidth: 1.5 },
  body: { flex: 1 },
  name: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  line: { color: colors.text, fontSize: 13, lineHeight: 19 },
});
