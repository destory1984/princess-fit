import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  /** The exercise this rest belongs to, or null before anything is done. */
  exerciseName: string | null;
  /** How long this exercise rests, in seconds. */
  length: number;
  /** Seconds left, or null when nothing is running. */
  remaining: number | null;
  /** Seconds left on a rest held still, or null when none is. */
  held?: number | null;
  /** Ten seconds on or off: the current rest if one is running, else the
   *  exercise's own length. */
  onAdjust: (delta: number) => void;
  /** Start the rest by hand, without finishing a set first. */
  onStart: () => void;
  /** Call the running rest off, bell and all. */
  onStop: () => void;
  /** Start the running rest over from its full length. */
  onReset: () => void;
  /** Hold the running rest where it is; no bell while held. */
  onPause?: () => void;
  /** Carry a held rest on from where it stopped. */
  onResume?: () => void;
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
  onStop,
  onReset,
  onPause,
  onResume,
  held = null,
  grain,
}: Props) {
  const running = remaining !== null;
  const holding = !running && held !== null;
  const left = running ? remaining : holding ? held : null;

  return (
    <View>
      {left !== null && length > 0 && (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              holding && styles.fillHeld,
              { width: `${Math.min(100, (left / length) * 100)}%` },
            ]}
          />
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          {holding ? '멈춤' : '휴식'}
          {exerciseName ? ` · ${exerciseName}` : ''}
        </Text>
        <Text style={[styles.clock, running && styles.clockOn, holding && styles.clockHeld]}>
          {clock(left ?? length)}
        </Text>

        <View style={styles.actions}>
          {/* Held, there is nothing to add ten seconds to: go on, or call it off. */}
          {!holding && (
            <Pressable style={styles.button} onPress={() => onAdjust(-grain)}>
              <Text style={styles.buttonText}>−{grain}</Text>
            </Pressable>
          )}
          {!holding && (
            <Pressable style={styles.button} onPress={() => onAdjust(grain)}>
              <Text style={styles.buttonText}>+{grain}</Text>
            </Pressable>
          )}
          {/*
            Stopping was left out once, on the thought that starting the next
            set is already the way out of a rest. It is not: the bell is booked
            with the phone and rings anyway, in the middle of the set.
          */}
          {running && (
            <Pressable style={styles.button} onPress={onReset} accessibilityLabel="처음부터">
              <Ionicons name="refresh" size={15} color={colors.accent} />
            </Pressable>
          )}
          {/*
            Five buttons do not fit a phone, so while it runs the last one holds
            the rest rather than ending it. Holding calls the bell off too, which
            is what 정지 was for; ending it for good is one more press, on 끄기.
            「정지」 used to end the rest and read as a pause.
          */}
          {running && (
            <Pressable style={[styles.button, styles.primary]} onPress={onPause ?? onStop}>
              <Text style={[styles.buttonText, styles.primaryText]}>{onPause ? '멈춤' : '끄기'}</Text>
            </Pressable>
          )}
          {holding && (
            <Pressable style={styles.button} onPress={onStop}>
              <Text style={styles.buttonText}>끄기</Text>
            </Pressable>
          )}
          {holding && (
            <Pressable style={[styles.button, styles.primary]} onPress={onResume}>
              <Text style={[styles.buttonText, styles.primaryText]}>이어서</Text>
            </Pressable>
          )}
          {!running && !holding && (
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
  fillHeld: { backgroundColor: colors.textDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Gives way first: four buttons while running leave little room on a phone.
  label: { color: colors.textDim, fontSize: 15, maxWidth: 120, flexShrink: 1 },
  clock: { color: colors.text, fontSize: 22, fontWeight: '800', minWidth: 62 },
  clockOn: { color: colors.accent },
  clockHeld: { color: colors.textDim },
  actions: { flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto' },
  button: {
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  primary: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1 },
  primaryText: { fontWeight: '800' },
});
