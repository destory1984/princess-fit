import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { creditWalk } from '@/lib/db';
import { localDayKey } from '@/lib/format';
import { getStepGoal, getWalkCredit, setStepGoal, setWalkCredit } from '@/lib/prefs';
import {
  DEFAULT_STEP_GOAL,
  MAX_STEP_GOAL,
  MIN_STEP_GOAL,
  STEP_GRAIN,
  clampGoal,
  walkNote,
  walkOwed,
  walkShare,
  walkWord,
  WALK_REASON,
} from '@/lib/steps';
import { stepsToday } from '@/lib/stepCounter';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  /** Called when the walk actually fed her, so the purse can be re-read. */
  onFed: () => void;
  /**
   * Start as a single row, opening on a tap.
   *
   * The home screen has one screenful to spend and the room, her line and the
   * start button have first claim on it. A step count pushed below the fold is
   * a step count nobody sees — which is how this arrived as a bug report —
   * so on home it earns one line until asked for more.
   */
  dense?: boolean;
};

/**
 * Today's walking, and what it did for her.
 *
 * This is the only reason to open the app on a day you are not training, which
 * is the point: skipping costs hunger, dimmed stats and upkeep all at once, and
 * a week too busy to train is the normal case rather than the exception.
 *
 * It pays no gold and says so by never mentioning any. The shop is priced
 * against a year of steady training; a second income would pull that apart
 * quietly.
 */
export function WalkCard({ onFed, dense = false }: Props) {
  const [steps, setSteps] = useState<number | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [goal, setGoal] = useState(DEFAULT_STEP_GOAL);
  const [fed, setFed] = useState(0);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(!dense);

  const load = useCallback(() => {
    let alive = true;
    (async () => {
      const [reading, saved] = await Promise.all([stepsToday(), getStepGoal()]);
      if (!alive) return;
      setGoal(saved);
      if (reading.steps === null) {
        setWhy(reading.why);
        setSteps(null);
        return;
      }
      setWhy(null);
      setSteps(reading.steps);

      // Walking carries on while the app is closed, so what is owed is the
      // difference from what today has already paid, never the whole thing.
      const day = localDayKey(new Date());
      const credited = await getWalkCredit(day);
      const owed = walkOwed(reading.steps, credited, saved);
      if (owed <= 0) {
        if (alive) setFed(credited);
        return;
      }
      try {
        const paid = await creditWalk(owed);
        if (!alive) return;
        // Only what the ledger actually took is written down. She may already
        // have been full, and recording a payment she never received would
        // lose it for the rest of the day.
        await setWalkCredit(day, credited + paid);
        setFed(credited + paid);
        if (paid > 0) onFed();
      } catch {
        // She goes unfed until the next time this screen opens.
      }
    })();
    return () => {
      alive = false;
    };
  }, [onFed]);

  useFocusEffect(load);

  async function changeGoal(delta: number) {
    const next = clampGoal(goal + delta);
    setGoal(next);
    await setStepGoal(next);
  }

  // A browser has no step counter, and the card could only say so: 「걸음 수는
  // 폰에서만 셀 수 있어요」, read on a phone, by someone who opened the web app
  // on it. A card that can do nothing and says something untrue-sounding is
  // worse than no card, so on the web there is none.
  if (Platform.OS === 'web') return null;

  const share = steps === null ? 0 : walkShare(steps, goal);
  const note = walkNote(fed);

  if (!open) {
    return (
      <Pressable style={styles.row} onPress={() => setOpen(true)}>
        <Ionicons name="walk-outline" size={17} color={colors.accent} />
        {steps === null ? (
          <Text style={styles.rowWhy} numberOfLines={1}>
            {why ?? '걸음을 세는 중이에요…'}
          </Text>
        ) : (
          <>
            <Text style={styles.rowValue}>
              {steps.toLocaleString()}
              <Text style={styles.rowUnit}> / {goal.toLocaleString()}</Text>
            </Text>
            <View style={styles.rowTrack}>
              <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
            </View>
            {fed > 0 && <Text style={styles.rowFed}>장 봄 +{fed}</Text>}
          </>
        )}
        <Ionicons name="chevron-down" size={16} color={colors.faint} />
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="walk-outline" size={18} color={colors.accent} />
        <Text style={styles.title}>오늘 걸음</Text>
        <Pressable hitSlop={8} onPress={() => setEditing(!editing)}>
          <Text style={styles.goal}>목표 {goal.toLocaleString()}</Text>
        </Pressable>
        {dense && (
          <Pressable hitSlop={8} onPress={() => setOpen(false)}>
            <Ionicons name="chevron-up" size={16} color={colors.faint} />
          </Pressable>
        )}
      </View>

      {steps === null ? (
        <Text style={styles.why}>{why ?? '세는 중이에요…'}</Text>
      ) : (
        <>
          <Text style={styles.value}>
            {steps.toLocaleString()}
            <Text style={styles.unit}> 걸음</Text>
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
          </View>
          <Text style={styles.word}>{walkWord(steps, goal)}</Text>
          {note && (
            <View style={styles.fed}>
              <Ionicons name="restaurant-outline" size={13} color={colors.gold} />
              <Text style={styles.fedText}>{note}</Text>
            </View>
          )}
        </>
      )}

      {editing && (
        <View style={styles.editor}>
          <Pressable
            style={[styles.round, goal <= MIN_STEP_GOAL && styles.roundOff]}
            disabled={goal <= MIN_STEP_GOAL}
            onPress={() => changeGoal(-STEP_GRAIN)}>
            <Ionicons name="remove" size={18} color={colors.accent} />
          </Pressable>
          <Text style={styles.editorValue}>{goal.toLocaleString()}걸음</Text>
          <Pressable
            style={[styles.round, goal >= MAX_STEP_GOAL && styles.roundOff]}
            disabled={goal >= MAX_STEP_GOAL}
            onPress={() => changeGoal(STEP_GRAIN)}>
            <Ionicons name="add" size={18} color={colors.accent} />
          </Pressable>
        </View>
      )}

      <Text style={styles.note}>{WALK_REASON}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  rowUnit: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  rowTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  rowFed: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  rowWhy: { color: colors.textDim, fontSize: 14, flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  goal: { color: colors.textDim, fontSize: 14 },
  value: { color: colors.text, fontSize: 26, fontWeight: '800' },
  unit: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  word: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  fed: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fedText: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  why: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  editor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOff: { opacity: 0.4 },
  editorValue: { color: colors.text, fontSize: 17, fontWeight: '700', minWidth: 110, textAlign: 'center' },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
});
