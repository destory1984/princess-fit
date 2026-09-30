import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Scroll } from '@/components/Scroll';
import { ScreenState } from '@/components/ScreenState';
import { FestivalAhead } from '@/components/FestivalAhead';
import { FestivalReveal } from '@/components/FestivalReveal';
import {
  festivalFavours,
  getLedger,
  judgeFestival,
  listFestivalResults,
  listWorkoutFacts,
  type FestivalRecord,
  type Ledger,
} from '@/lib/db';
import {
  CONTESTS,
  defaultEntry,
  festivalIndex,
  festivalTitle,
  formDays,
  latestFestival,
  nextFestival,
  prizeFor,
  standingAt,
  type ContestId,
} from '@/lib/festival';
import type { WorkoutFact } from '@/lib/gamification';
import { getFestivalEntry, getFestivalSeen, setFestivalEntry, setFestivalSeen } from '@/lib/prefs';
import { girlOf, useGirl } from '@/lib/girl';
import { colors, paper, spacing } from '@/lib/theme';

type Loaded = {
  facts: WorkoutFact[];
  ledger: Ledger;
  results: FestivalRecord[];
  /** The festival shown with its drum roll, because it has not been seen yet. */
  unseen: string | null;
  entry: ContestId | null;
  /** Favours met since the last festival, which the next one will count. */
  favours: number;
};

/**
 * 「축제」. The last result, told as it happened, then the next festival and
 * where she will go. See docs/festival.md.
 */
export default function FestivalScreen() {
  const girl = useGirl();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    (async () => {
      const facts = await listWorkoutFacts();
      // The today screen normally gets here first; judging again is a no-op.
      await judgeFestival(girl.id, facts).catch(() => null);
      const next = nextFestival();
      const [ledger, results, seen, chosen, favours] = await Promise.all([
        getLedger(),
        listFestivalResults(),
        getFestivalSeen(),
        getFestivalEntry(next.key),
        festivalFavours(girl.id, facts, next, new Date()),
      ]);
      const latest = results[0];
      const unseen = latest && latest.key !== seen ? latest.key : null;
      if (unseen) void setFestivalSeen(unseen);
      const entry = CONTESTS.some((c) => c.id === chosen) ? (chosen as ContestId) : null;
      setData({ facts, ledger, results, unseen, entry, favours });
    })().catch((e) => setError(e.message));
  }, [girl.id]);

  useFocusEffect(load);

  if (!data) return <ScreenState error={error} onRetry={load} />;

  const today = new Date();
  const next = nextFestival(today);
  const standing = standingAt(data.facts, data.ledger, today, data.favours);
  const entry = data.entry ?? defaultEntry(standing);
  // The last one, while it is still that month's news.
  const recent = data.results.find((r) => r.key === latestFestival(today).key) ?? null;
  const past = data.results.filter((r) => r !== recent);

  function choose(id: ContestId) {
    setData((d) => (d ? { ...d, entry: id } : d));
    void setFestivalEntry(next.key, id);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {recent && (
        <Scroll title="지난 축제">
          <FestivalReveal
            result={recent}
            girl={recent.girl ? girlOf(recent.girl) : girl}
            prize={recent.key === data.unseen ? prizeFor(recent.place) : undefined}
            animate={recent.key === data.unseen}
          />
        </Scroll>
      )}

      <Scroll title="다음 축제">
        <FestivalAhead
          festival={next}
          today={today}
          girl={girl}
          standing={standing}
          formDays={formDays(data.facts, today)}
          index={festivalIndex(data.facts, next)}
          entry={entry}
          onChoose={choose}
        />
      </Scroll>

      {past.length > 0 && (
        <Scroll title="지난 기록">
          {past.map((r) => (
            <View key={r.key} style={styles.row}>
              <Text style={styles.rowTitle}>{festivalTitle(r)}</Text>
              <Text style={styles.rowLine}>
                {(r.girl ? girlOf(r.girl) : girl).name} · {r.contestName} ·{' '}
                {r.place === 1 ? '우승' : r.place === 4 ? '참가' : `${r.place}등`}
              </Text>
            </View>
          ))}
        </Scroll>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
  },
  rowTitle: { color: paper.ink, fontSize: 14, fontWeight: '700' },
  rowLine: { color: colors.textDim, fontSize: 12 },
});
