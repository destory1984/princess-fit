import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { LevelCard } from '@/components/LevelCard';
import { notify } from '@/lib/confirm';
import { listWorkoutFacts } from '@/lib/db';
import { summarise, type Badge } from '@/lib/gamification';
import { colors, radius, spacing } from '@/lib/theme';

export default function AchievementsScreen() {
  const [summary, setSummary] = useState<ReturnType<typeof summarise> | null>(null);

  const load = useCallback(() => {
    listWorkoutFacts()
      .then((facts) => setSummary(summarise(facts)))
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  if (!summary) return <View style={styles.screen} />;

  const earned = summary.badges.filter((b) => b.earned);
  const locked = summary.badges.filter((b) => !b.earned);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LevelCard
        level={summary.level}
        title={summary.title}
        xp={summary.xp}
        progress={summary.progress}
        toNext={summary.toNext}
        streak={summary.streak}
        earnedCount={summary.earnedCount}
        badgeCount={summary.badges.length}
      />

      <Text style={styles.sectionTitle}>얻은 업적 {earned.length}</Text>
      {earned.length === 0 ? (
        <Text style={styles.empty}>운동을 한 번 마치면 첫 업적이 열려요.</Text>
      ) : (
        earned.map((b) => <BadgeRow key={b.id} badge={b} />)
      )}

      <Text style={styles.sectionTitle}>남은 업적 {locked.length}</Text>
      {locked.map((b) => (
        <BadgeRow key={b.id} badge={b} />
      ))}
    </ScrollView>
  );
}

function BadgeRow({ badge }: { badge: Badge }) {
  return (
    <View style={[styles.row, !badge.earned && styles.rowLocked]}>
      <View style={[styles.icon, badge.earned && styles.iconEarned]}>
        <Ionicons
          name={badge.icon as any}
          size={20}
          color={badge.earned ? '#0E1116' : colors.textDim}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, !badge.earned && styles.rowTitleLocked]}>{badge.name}</Text>
        <Text style={styles.rowSub}>{badge.detail}</Text>
        {!badge.earned && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(badge.progress * 100)}%` }]} />
          </View>
        )}
      </View>
      {badge.earned ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      ) : (
        <Text style={styles.percent}>{Math.round(badge.progress * 100)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  empty: { color: colors.textDim },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLocked: { opacity: 0.85 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEarned: { backgroundColor: colors.accent },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowTitleLocked: { color: colors.textDim },
  rowSub: { color: colors.textDim, fontSize: 12 },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginTop: 3,
  },
  fill: { height: 5, borderRadius: 3, backgroundColor: colors.accent },
  percent: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
});
