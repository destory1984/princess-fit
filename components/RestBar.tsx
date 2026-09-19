import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  /** The exercise this rest belongs to, or null before anything is done. */
  exerciseName: string | null;
  /** How long this exercise rests, in seconds. */
  length: number;
  /** Seconds left, or null when nothing is running. */
  remaining: number | null;
  /** Ten seconds on or off: the current rest if one is running, else the
   *  exercise's own length. */
  onAdjust: (delta: number) => void;
  /** Start the rest by hand, without finishing a set first. */
  onStart: () => void;
  grain: number;
};

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The rest between sets, pinned to the bottom of the workout.
 *
 * It says two different things depending on whether it is running — seconds
 * left, or how long this exercise rests — so the running state has to be
 * visible at a glance, not inferred from whether the number is changing.
 */
export function RestBar({
  exerciseName,
  length,
  remaining,
  onAdjust,
  onStart,
  grain,
}: Props) {
  const running = remaining !== null;

  return (
    <View>
      {running && length > 0 && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(remaining / length) * 100}%` }]} />
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          휴식{exerciseName ? ` · ${exerciseName}` : ''}
        </Text>
        <Text style={[styles.clock, running && styles.clockOn]}>
          {clock(running ? remaining : length)}
        </Text>

        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={() => onAdjust(-grain)}>
            <Text style={styles.buttonText}>−{grain}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => onAdjust(grain)}>
            <Text style={styles.buttonText}>+{grain}</Text>
          </Pressable>
          {/*
            No skip button: a rest blocks nothing, so starting the next set is
            already the way out of one. Only starting a rest needs a control.
          */}
          {!running && (
            <Pressable style={[styles.button, styles.primary]} onPress={onStart}>
              <Text style={[styles.buttonText, styles.primaryText]}>시작</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  fill: { height: '100%', backgroundColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { color: colors.textDim, fontSize: 13, maxWidth: 120 },
  clock: { color: colors.text, fontSize: 22, fontWeight: '800', minWidth: 62 },
  clockOn: { color: colors.accent },
  actions: { flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto' },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  primary: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1 },
  primaryText: { fontWeight: '800' },
});
