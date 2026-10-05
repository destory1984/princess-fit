import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Favour } from '@/lib/favour';
import { voiceOf } from '@/lib/voices';
import { colors, paper, radius, spacing } from '@/lib/theme';

type Props = {
  favour: Favour;
  girl: { id: string; name: string };
};

/**
 * Her favour for the week. Once it is met she says so, in a line picked by
 * the week so it stays the same line all week — and the card says it counts
 * at the festival, which is the only reason it is more than a nicety.
 */
export function FavourCard({ favour, girl }: Props) {
  const thanks = voiceOf(girl.id).favour.done;
  const seed = [...favour.week].reduce((n, c) => n + c.charCodeAt(0), 0);
  return (
    <View style={[styles.card, favour.done && styles.cardDone]}>
      <View style={styles.head}>
        <Ionicons
          name={favour.done ? 'heart' : 'heart-outline'}
          size={15}
          color={favour.done ? colors.accent : colors.textDim}
        />
        <Text style={styles.title}>{girl.name}의 이번 주 부탁</Text>
        <Text style={[styles.progress, favour.done && styles.progressDone]}>{favour.progress}</Text>
      </View>
      <Text style={styles.ask}>{favour.done ? thanks[seed % thanks.length] : favour.ask}</Text>
      <Text style={styles.foot}>
        {favour.done ? '들어준 부탁은 이번 달 축제에서 +2점이 돼요' : '들어주면 이번 달 축제에서 +2점'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: paper.bg,
    padding: spacing.md,
    gap: 4,
  },
  cardDone: { borderStyle: 'solid', borderColor: colors.accent, backgroundColor: colors.accentSoft },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1, color: colors.textDim, fontSize: 14, fontWeight: '700' },
  progress: { color: colors.textDim, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressDone: { color: colors.accent },
  ask: { color: colors.text, fontSize: 15, lineHeight: 22 },
  foot: { color: colors.textDim, fontSize: 13 },
});
