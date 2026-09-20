import { StyleSheet, Text, View } from 'react-native';
import { Portrait } from '@/components/Portrait';
import { cheerFor } from '@/lib/cheer';
import { colors, paper, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';

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
  const girl = useGirl();
  const { line, done } = cheerFor(doneSets, totalSets);

  return (
    <View style={[styles.wrap, done && styles.wrapDone]}>
      <Portrait source={girl.base} size={40} active={done} />
      <View style={styles.body}>
        <Text style={styles.name}>{girl.name}</Text>
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
