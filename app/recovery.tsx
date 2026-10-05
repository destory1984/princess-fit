import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { BodyMap } from '@/components/BodyMap';
import { OrnateFrame } from '@/components/OrnateFrame';
import { ScreenState } from '@/components/ScreenState';
import { listMuscleLoad } from '@/lib/db';
import {
  everTrained,
  MAX_HOURS,
  READY,
  recoveryOf,
  sinceWord,
  todaysWord,
  type Muscle,
  type Session,
} from '@/lib/recovery';
import { colors, intensityRamp, radius, spacing } from '@/lib/theme';

/**
 * How rested each muscle is, and therefore what today could be.
 *
 * The figure is estimated, not measured — from the sets aimed at a muscle and
 * the hours since — and the screen says so at the bottom rather than letting a
 * percentage imply a sensor. It is still the most useful number here, because
 * the question it answers is a choice, not a fact: 오늘은 뭘 하지.
 */
export default function RecoveryScreen() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listMuscleLoad()
      .then(setSessions)
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  if (!sessions) return <ScreenState error={error} onRetry={load} />;

  const muscles = recoveryOf(sessions);
  const known = everTrained(muscles);
  const tired = muscles.filter((m) => m.recovery < 100);
  const rested = muscles.filter((m) => m.recovery >= 100);

  // The body is tinted by what is *owed*, so the eye lands on what to avoid.
  // Ramping over the four steps the map already uses keeps it readable beside
  // every other body on screen, which is coloured by volume.
  const tint = tired.map((m) => ({
    slug: m.slug,
    intensity: Math.max(
      1,
      Math.ceil(((100 - m.recovery) / 100) * intensityRamp.length)
    ),
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OrnateFrame>
        <Text style={styles.word}>{todaysWord(muscles)}</Text>
        <View style={styles.body}>
          <BodyMap data={tint} scale={0.62} labels={false} />
        </View>
        <Text style={styles.bodyNote}>짙을수록 아직 덜 쉰 곳이에요.</Text>
      </OrnateFrame>

      {/*
        With nothing recorded, every muscle is at 100% for the same reason —
        none of them have been touched — and sixteen rows saying so is a table
        of one fact repeated. The line above already said it.
      */}
      {known && (
        <>
          {tired.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>쉬고 있는 곳</Text>
              {tired.map((m) => (
                <Row key={m.slug} muscle={m} />
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>오늘 해도 되는 곳</Text>
            {rested.length === 0 ? (
              <Text style={styles.empty}>지금은 전부 쉬는 중이에요.</Text>
            ) : (
              rested.map((m) => <Row key={m.slug} muscle={m} />)
            )}
          </View>
        </>
      )}

      <View style={styles.caution}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textDim} />
        <Text style={styles.cautionText}>
          이건 잰 값이 아니라, 그 부위에 한 세트 수와 지난 시간으로 셈한 값이에요.
          실제 회복은 잠과 먹은 것, 그날 컨디션에 따라 달라져요. 아프면 숫자보다
          몸을 믿으세요.{'\n'}
          가장 힘든 날 기준 {MAX_HOURS / 24}일이면 다 찬 것으로 봐요. {READY}% 넘으면
          다시 해도 괜찮은 정도예요.
        </Text>
      </View>
    </ScrollView>
  );
}

function Row({ muscle }: { muscle: Muscle }) {
  const done = muscle.recovery >= READY;
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{muscle.label}</Text>
        <Text style={styles.rowSince}>{sinceWord(muscle.hoursSince)}</Text>
      </View>
      <View style={styles.rowTrack}>
        <View
          style={[
            styles.rowFill,
            { width: `${muscle.recovery}%` },
            done && styles.rowFillDone,
          ]}
        />
      </View>
      <Text style={[styles.rowPct, done && styles.rowPctDone]}>{muscle.recovery}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  word: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 26 },
  body: { marginTop: spacing.md, alignItems: 'center' },
  bodyNote: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  empty: { color: colors.textDim, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBody: { width: 96 },
  rowName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowSince: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  rowTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  rowFill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  rowFillDone: { backgroundColor: colors.success },
  rowPct: { color: colors.textDim, fontSize: 14, fontWeight: '700', width: 38, textAlign: 'right' },
  rowPctDone: { color: colors.success },
  caution: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs },
  cautionText: { color: colors.textDim, fontSize: 13, lineHeight: 20, flex: 1 },
});
