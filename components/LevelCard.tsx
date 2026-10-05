import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { OrnateFrame } from '@/components/OrnateFrame';
import { colors, spacing } from '@/lib/theme';

type Props = {
  level: number;
  title: string;
  xp: number;
  progress: number;
  toNext: number;
  streak: number;
  earnedCount: number;
  badgeCount: number;
  onPress?: () => void;
};

export function LevelCard({
  level,
  title,
  xp,
  progress,
  toNext,
  streak,
  earnedCount,
  badgeCount,
  onPress,
}: Props) {
  return (
    <OrnateFrame>
      <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.badgeLevel}>{level}품</Text>
        </View>
        <View style={styles.headBody}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            경험치 {xp.toLocaleString()} · 다음 품계까지 {toNext.toLocaleString()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="flame" size={14} color={streak > 0 ? colors.danger : colors.textDim} />
          <Text style={styles.statText}>연속 {streak}일</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="trophy" size={14} color={colors.textDim} />
          <Text style={styles.statText}>
            업적 {earnedCount}/{badgeCount}
          </Text>
        </View>
      </View>
      </Pressable>
    </OrnateFrame>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLevel: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  headBody: { flex: 1 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  stats: { flexDirection: 'row', gap: spacing.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: colors.textDim, fontSize: 14 },
});
