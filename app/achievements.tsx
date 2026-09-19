import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { Scroll } from '@/components/Scroll';
import { StatBar } from '@/components/StatBar';
import { ScreenState } from '@/components/ScreenState';
import { GIRL_NAME } from '@/lib/girl';
import {
  CULTURE_META,
  CULTURE_ORDER,
  EMPTY_CULTURE,
  refinementTitle,
  type Culture,
} from '@/lib/lessons';
import { notify } from '@/lib/confirm';
import {
  archetypeOf,
  computeStats,
  masterSays,
  weeklyPlan,
  STAT_META,
  STAT_ORDER,
} from '@/lib/character';
import { getLedger, listWorkoutFacts } from '@/lib/db';
import { effectiveCulture } from '@/lib/shop';
import { outfitProgress } from '@/lib/outfit';
import { roomProgress } from '@/lib/room';
import { getWeeklyGoal, setWeeklyGoal } from '@/lib/prefs';
import {
  LEVEL_TITLES,
  summarise,
  type Badge,
  type WorkoutFact,
} from '@/lib/gamification';
import { colors, paper, radius, spacing } from '@/lib/theme';

export default function TrainingLedgerScreen() {
  const [facts, setFacts] = useState<WorkoutFact[] | null>(null);
  const [goal, setGoal] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [culture, setCulture] = useState<Culture>(EMPTY_CULTURE);
  const [wardrobe, setWardrobe] = useState<string[]>([]);
  const [wearing, setWearing] = useState<string[]>([]);
  const [furniture, setFurniture] = useState<string[]>([]);

  const load = useCallback(() => {
    setError(null);
    Promise.all([listWorkoutFacts(), getWeeklyGoal()])
      .then(([list, savedGoal]) => {
        setFacts(list);
        setGoal(savedGoal);
        // Her schooling is a side note here, so a failure to read it leaves
        // the bars at zero rather than blocking the whole chronicle.
        getLedger()
          .then((l) => {
            setCulture(l.culture);
            setWardrobe(l.wardrobe);
            setWearing(l.worn);
            setFurniture(l.furniture);
          })
          .catch(() => {});
      })
      .catch((e) => setError(e.message));
  }, []);

  async function changeGoal(delta: number) {
    const next = Math.max(1, Math.min(7, goal + delta));
    if (next === goal) return;
    setGoal(next);
    try {
      await setWeeklyGoal(next);
    } catch (e: any) {
      notify('목표 저장 실패', e.message);
      setGoal(goal);
    }
  }

  useFocusEffect(load);

  if (!facts) return <ScreenState error={error} onRetry={load} />;

  const summary = summarise(facts);
  // Lessons plus what she is wearing, so this never disagrees with the shop.
  const standing = effectiveCulture(culture, wardrobe, wearing);
  const clothes = outfitProgress(wardrobe);
  const room = roomProgress(furniture);
  const stats = computeStats(facts);
  const archetype = archetypeOf(stats);
  const plan = weeklyPlan(facts, goal);
  const saying = masterSays(stats, facts);
  const trained = workedParts(
    facts.flatMap((f) => f.groups.map((g) => ({ muscle_group: g, secondary_group: null })))
  );

  const earned = summary.badges.filter((b) => b.earned);
  const locked = summary.badges.filter((b) => !b.earned);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Scroll>
        <View style={styles.nameplate}>
          <Text style={styles.rank}>제 {summary.level} 품 · {summary.title}</Text>
          <Text style={styles.archetype}>{archetype.name}</Text>
          <Text style={styles.archetypeDetail}>{archetype.detail}</Text>
        </View>

        <View style={styles.portraitRow}>
          <View style={styles.portrait}>
            <BodyMap data={trained} scale={0.5} labels={false} fill={paper.track} />
          </View>
          <View style={styles.stats}>
            {STAT_ORDER.map((key) => (
              <StatBar
                key={key}
                icon={STAT_META[key].icon}
                name={STAT_META[key].name}
                value={stats[key]}
              />
            ))}
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>경험</Text>
              <Text style={styles.xpValue}>{summary.xp.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.speech}>
          <View style={styles.speaker}>
            <Text style={styles.speakerText}>{GIRL_NAME}</Text>
          </View>
          <Text style={styles.speechText}>{saying}</Text>
        </View>
      </Scroll>

      <Scroll title="이번 주 훈련">
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>주간 목표</Text>
          <Pressable hitSlop={8} onPress={() => changeGoal(-1)}>
            <Text style={styles.goalStep}>−</Text>
          </Pressable>
          <Text style={styles.goalValue}>{goal}회</Text>
          <Pressable hitSlop={8} onPress={() => changeGoal(1)}>
            <Text style={styles.goalStep}>+</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {Array.from({ length: plan.goal }, (_, i) => (
            <View key={i} style={[styles.weekDot, i < plan.done && styles.weekDotOn]}>
              <Ionicons
                name={i < plan.done ? 'checkmark' : 'ellipse-outline'}
                size={16}
                color={i < plan.done ? paper.bg : paper.lineSoft}
              />
            </View>
          ))}
          <Text style={styles.weekText}>
            {plan.met
              ? '이번 주 몫을 다 하였습니다.'
              : `${plan.goal - plan.done}번 남았고, ${plan.daysLeft}일 남았습니다.`}
          </Text>
        </View>
      </Scroll>

      <Scroll title="일 년의 길">
        <Text style={styles.yearHint}>
          꾸준히 일 년이면 옷장을 채울 수 있어요. 방은 그 다음이에요.
        </Text>
        {[
          { label: '옷장', done: clothes.count, total: clothes.total, ratio: clothes.ratio, unit: '벌' },
          { label: '방', done: room.count, total: room.total, ratio: room.ratio, unit: '개' },
        ].map((line) => (
          <View key={line.label} style={styles.cultureRow}>
            <Text style={styles.yearLabel}>{line.label}</Text>
            <View style={styles.cultureTrack}>
              <View style={[styles.cultureFill, { width: `${line.ratio * 100}%` }]} />
            </View>
            <Text style={styles.yearValue}>
              {line.done}/{line.total}
              {line.unit}
            </Text>
          </View>
        ))}
      </Scroll>

      <Scroll title="배운 것">
        <Text style={styles.refineTitle}>{refinementTitle(standing)}</Text>
        {CULTURE_ORDER.map((key) => (
          <View key={key} style={styles.cultureRow}>
            <Ionicons name={CULTURE_META[key].icon as any} size={15} color={paper.line} />
            <Text style={styles.cultureName}>{CULTURE_META[key].name}</Text>
            <View style={styles.cultureTrack}>
              <View style={[styles.cultureFill, { width: `${standing[key]}%` }]} />
            </View>
            <Text style={styles.cultureValue}>{standing[key]}</Text>
          </View>
        ))}
        <Text style={styles.cultureHint}>
          운동으로는 오르지 않아요. 상점의 수업에서만 자라요.
        </Text>
      </Scroll>

      <Scroll title="품계">
        <View style={styles.rankRow}>
          {LEVEL_TITLES.map((title, i) => (
            <View key={title} style={[styles.rankCell, i + 1 === summary.level && styles.rankNow]}>
              <Text
                style={[
                  styles.rankCellText,
                  i + 1 <= summary.level && styles.rankReached,
                  i + 1 === summary.level && styles.rankNowText,
                ]}>
                {title}
              </Text>
            </View>
          ))}
        </View>
      </Scroll>

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
    <View style={styles.badgeRow}>
      <View style={[styles.badgeIcon, badge.earned && styles.badgeIconOn]}>
        <Ionicons
          name={badge.icon as any}
          size={20}
          color={badge.earned ? colors.surface : colors.textDim}
        />
      </View>
      <View style={styles.badgeBody}>
        <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
          {badge.name}
        </Text>
        <Text style={styles.badgeDetail}>{badge.detail}</Text>
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
  yearHint: { color: paper.inkDim, fontSize: 11, lineHeight: 16, marginBottom: spacing.sm },
  yearLabel: { color: paper.inkDim, fontSize: 12, width: 32 },
  yearValue: { color: paper.inkDim, fontSize: 11, width: 44, textAlign: 'right' },
  refineTitle: { color: paper.ink, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  cultureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  cultureName: { color: paper.inkDim, fontSize: 12, width: 32 },
  cultureTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: paper.bg,
    borderColor: paper.lineSoft,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cultureFill: { height: '100%', backgroundColor: paper.line },
  cultureValue: { color: paper.inkDim, fontSize: 11, width: 24, textAlign: 'right' },
  cultureHint: { color: paper.inkDim, fontSize: 11, lineHeight: 16, marginTop: 4 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  nameplate: { alignItems: 'center', gap: 2 },
  rank: { color: paper.inkDim, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  archetype: { color: paper.ink, fontSize: 24, fontWeight: '800' },
  archetypeDetail: { color: paper.inkDim, fontSize: 12 },

  portraitRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  portrait: {
    backgroundColor: paper.bgAlt,
    borderColor: paper.lineSoft,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  stats: { flex: 1, gap: spacing.sm },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopColor: paper.lineSoft,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  xpLabel: { color: paper.inkDim, fontSize: 12, fontWeight: '700' },
  xpValue: { color: paper.accent, fontSize: 13, fontWeight: '800' },

  speech: {
    backgroundColor: paper.bgAlt,
    borderColor: paper.line,
    borderWidth: 2,
    borderRadius: 4,
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  speaker: {
    position: 'absolute',
    top: -11,
    left: spacing.md,
    backgroundColor: paper.line,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: 3,
  },
  speakerText: { color: paper.bg, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  speechText: { color: paper.ink, fontSize: 14, lineHeight: 21 },

  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goalLabel: { color: paper.inkDim, fontSize: 12, fontWeight: '700', flex: 1 },
  goalStep: { color: paper.accent, fontSize: 20, fontWeight: '800', width: 20, textAlign: 'center' },
  goalValue: { color: paper.ink, fontSize: 15, fontWeight: '800', minWidth: 34, textAlign: 'center' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: paper.lineSoft,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotOn: { backgroundColor: paper.fill, borderColor: paper.fill },
  weekText: { color: paper.inkDim, fontSize: 12, flex: 1, marginLeft: spacing.sm },

  rankRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rankCell: {
    borderColor: paper.lineSoft,
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  rankNow: { backgroundColor: paper.fill, borderColor: paper.line },
  rankCellText: { color: colors.faint, fontSize: 12, lineHeight: 17 },
  rankReached: { color: paper.inkDim },
  rankNowText: { color: paper.bg, fontWeight: '800' },

  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing.lg },
  empty: { color: colors.textDim },
  badgeRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconOn: { backgroundColor: colors.accent },
  badgeBody: { flex: 1, gap: 3 },
  badgeName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  badgeNameLocked: { color: colors.textDim },
  badgeDetail: { color: colors.textDim, fontSize: 12 },
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
