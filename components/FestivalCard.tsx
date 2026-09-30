import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Festival } from '@/lib/festival';
import { colors, paper, radius, spacing } from '@/lib/theme';

type Props = {
  next: Festival;
  /** Days until it; 0 is today. */
  left: number;
  /** Where she is going, or null while that is still being worked out. */
  contest: string | null;
  /** A result not yet looked at: its title, and who went where. */
  news: { title: string; sub: string } | null;
  onPress: () => void;
};

/**
 * The way in to the festival from the today screen. One line most of the
 * month; a louder one on the morning a result is waiting, because a result
 * nobody hears about did not happen.
 */
export function FestivalCard({ next, left, contest, news, onPress }: Props) {
  if (news) {
    return (
      <Pressable style={[styles.card, styles.news]} onPress={onPress}>
        <Ionicons name="trophy" size={22} color={colors.gold} />
        <View style={styles.body}>
          <Text style={styles.newsTitle}>{news.title}</Text>
          <Text style={styles.newsSub}>{news.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.chromeText} />
      </Pressable>
    );
  }
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Ionicons name="flag-outline" size={18} color={colors.accent} />
      <View style={styles.body}>
        <Text style={styles.title}>
          {next.month}월 {next.name} · <Text style={styles.left}>{left === 0 ? '오늘' : `${left}일 남음`}</Text>
        </Text>
        {contest && <Text style={styles.sub}>{contest}에 나가요</Text>}
      </View>
      <Text style={styles.link}>준비 →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: paper.bgAlt,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  news: { backgroundColor: colors.chrome, borderColor: colors.gold, paddingVertical: spacing.md },
  body: { flex: 1 },
  title: { color: colors.text, fontSize: 13, fontWeight: '700' },
  left: { color: colors.accent, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  link: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  newsTitle: { color: colors.chromeText, fontSize: 15, fontWeight: '800' },
  newsSub: { color: colors.goldSoft, fontSize: 12, marginTop: 2 },
});
