import { useEffect, useMemo, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BigStepper } from '@/components/BigStepper';
import { nextWeight, onRack } from '@/lib/weight';
import { BAR, BARS, plateWord } from '@/lib/plates';
import { successFeedback, tapFeedback } from '@/lib/feedback';
import type { TrackType, WorkoutSet } from '@/lib/types';
import { otherSide, SIDE_LABEL } from '@/lib/sides';
import { colors, radius, spacing } from '@/lib/theme';

// react-native-web has no native animation driver, so asking for one there
// only produces a warning and the same JS-driven animation.
const NATIVE_DRIVER = Platform.OS !== 'web';

type Props = {
  set: WorkoutSet;
  track: TrackType;
  index: number;
  total: number;
  tint: string;
  /** Loaded on a bar, so the weight can be turned into plates. */
  barbell?: boolean;
  /** The bar this exercise is done with. The full-size one unless told. */
  bar?: number;
  /** Change it to the next one. Without this the bar is only named. */
  onChangeBar?: () => void;
  onChange: (patch: Partial<WorkoutSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
};

export function SetCard({
  set,
  track,
  index,
  total,
  tint,
  barbell = false,
  bar = BAR,
  onChangeBar,
  onChange,
  onComplete,
  onRemove,
}: Props) {
  // Created once, without reading a ref during render.
  const scale = useMemo(() => new Animated.Value(1), []);
  // Stays open from one set to the next: whoever asked once is loading a bar,
  // and will be loading it again in two minutes.
  const [platesOpen, setPlatesOpen] = useState(false);
  const onBar = barbell && track === 'weight_reps';
  const plates = onBar ? plateWord(set.weight_kg, bar) : null;
  // The row stays for any weight the lightest bar could be: someone who moved
  // to a heavier bar by mistake has to be able to move back.
  const platesRow = onBar && set.weight_kg >= BARS[BARS.length - 1];

  useEffect(() => {
    scale.setValue(0.96);
    Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, friction: 6 }).start();
  }, [set.id, scale]);

  function change(patch: Partial<WorkoutSet>) {
    tapFeedback();
    onChange(patch);
  }

  function complete() {
    successFeedback();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.04, duration: 90, useNativeDriver: NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, friction: 5 }),
    ]).start();
    onComplete();
  }

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <View style={styles.head}>
        <Text style={styles.label}>
          {/*
            The side comes first, because it is what you check before you pick
            the dumbbell up. 「왼쪽 · 2번째 세트」 reads in the order the two
            facts are needed.
          */}
          {set.side ? `${SIDE_LABEL[set.side]} · ` : ''}
          {track === 'weight_reps' ? `${index}번째 세트` : '이번 기록'}
          {total > 1 && track === 'weight_reps' ? ` · 총 ${total}세트` : ''}
        </Text>
        {/*
          Changing sides is one tap, not a picker. The board alternates on its
          own, so this is only for the times it guessed wrong — starting on the
          right because the left is sore, or losing count mid-session.
        */}
        {set.side && (
          <Pressable
            hitSlop={8}
            style={styles.side}
            onPress={() => onChange({ side: otherSide(set.side!) })}>
            <Ionicons name="swap-horizontal" size={14} color={colors.textDim} />
          </Pressable>
        )}
        {/*
          Marked on the set itself, where the decision is made — you know a set
          was a warm-up while you are doing it, not afterwards on a settings
          screen. Weighted work only: there is no warming up to a plank.
        */}
        {track === 'weight_reps' && (
          <Pressable
            hitSlop={8}
            style={[styles.warmup, set.warmup && styles.warmupOn]}
            onPress={() => onChange({ warmup: !set.warmup })}>
            <Text style={[styles.warmupText, set.warmup && styles.warmupTextOn]}>
              워밍업
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.steppers}>
        {track === 'weight_reps' ? (
          <>
            <BigStepper
              value={set.weight_kg}
              unit="kg"
              // Whole kilos on dumbbells, 2.5 once there is a bar to load.
              step={1}
              nextAt={nextWeight}
              bigStep={10}
              decimals={set.weight_kg % 1 === 0 ? 0 : 1}
              // Snapped on the way in, because ±10 does not know the grid the
              // fine steps live on: from 11kg it landed on 21, and 2.5 at a
              // time from there is 23.5, 26, 28.5 — arithmetic, not weights.
              onChange={(v) => change({ weight_kg: onRack(v) })}
              onPressValue={plates ? () => setPlatesOpen((open) => !open) : undefined}
            />
            <View style={styles.divider} />
            <BigStepper
              value={set.reps}
              unit="회"
              step={1}
              bigStep={5}
              onChange={(v) => change({ reps: v })}
            />
          </>
        ) : (
          <>
            {track === 'duration' ? (
              // A hold is counted in seconds. In whole minutes a 30 or 45
              // second plank could not be written down at all.
              <BigStepper
                value={set.duration_sec}
                unit="초"
                step={5}
                bigStep={30}
                onChange={(v) => change({ duration_sec: v })}
              />
            ) : (
              <BigStepper
                value={Math.round(set.duration_sec / 60)}
                unit="분"
                step={1}
                bigStep={5}
                onChange={(v) => change({ duration_sec: v * 60 })}
              />
            )}
            {track === 'floors' && (
              <>
                <View style={styles.divider} />
                <BigStepper
                  value={set.reps}
                  unit="층"
                  step={1}
                  bigStep={5}
                  onChange={(v) => change({ reps: v })}
                />
              </>
            )}
            {track === 'cardio' && (
              <>
                <View style={styles.divider} />
                <BigStepper
                  value={set.distance_km}
                  unit="km"
                  step={0.5}
                  bigStep={1}
                  decimals={1}
                  onChange={(v) => change({ distance_km: v })}
                />
              </>
            )}
          </>
        )}
      </View>

      {/*
        The plates for one side, on a row that is there before it is asked
        for. Pressing the weight opens it too, but a number that turns out to
        be a button is found by accident or not at all — so the row says what
        it holds while it is still shut.

        Only on a bar, and only from the bar's own weight up (`plateWord`
        answers nothing below it). The bar is named because it is a guess: an
        EZ bar is not 20kg and the app cannot see which one is in the rack.
      */}
      {platesRow && (
        <View style={styles.plates}>
          <Pressable
            style={styles.platesOpen}
            hitSlop={4}
            onPress={() => setPlatesOpen((open) => !open)}>
            <Ionicons name="disc-outline" size={14} color={colors.textDim} />
            <Text style={styles.platesText}>
              {!platesOpen ? '원판 보기' : plates ?? '봉보다 가벼운 무게예요'}
            </Text>
          </Pressable>
          {/* Which bar, and the way to say it is another one. */}
          {platesOpen && (
            <Pressable
              style={styles.bar}
              hitSlop={6}
              disabled={!onChangeBar}
              onPress={onChangeBar}
              accessibilityLabel={`봉 ${bar}kg, 눌러서 바꾸기`}>
              <Text style={styles.barText}>봉 {bar}kg</Text>
              {onChangeBar && <Ionicons name="swap-horizontal" size={12} color={colors.accent} />}
            </Pressable>
          )}
        </View>
      )}

      {/*
        Deleting sat as a bare ✕ in the corner, where it read as 「close this
        card」 and took the set with it. It is now a named button beside the
        one it could be mistaken for, a third of the width, so the thumb that
        finishes a set lands on 완료.
      */}
      <View style={styles.actions}>
        <Pressable style={[styles.done, { backgroundColor: tint }]} onPress={complete}>
          <Ionicons name="checkmark" size={20} color={colors.surface} />
          <Text style={styles.doneText}>
            {track === 'weight_reps' ? '세트 완료' : '기록 완료'}
          </Text>
        </Pressable>
        <Pressable style={styles.remove} onPress={onRemove}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.removeText}>세트 삭제</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  side: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  warmup: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  warmupOn: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  warmupText: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  warmupTextOn: { color: colors.text },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  steppers: { flexDirection: 'row', alignItems: 'center' },
  // The margin keeps 「+10」 and 「−5」 apart: without it the two steppers sat
  // one pixel from each other and read as a single row of eight.
  divider: { width: 1, height: 52, marginHorizontal: 4, backgroundColor: colors.border },
  plates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  platesOpen: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  platesText: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  remove: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  removeText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  done: {
    flex: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  doneText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
