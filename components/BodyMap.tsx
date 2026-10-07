import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Body, { type Slug } from 'react-native-body-highlighter';
import { slugsOf, workedParts, type WorkedExercise } from '@/lib/muscles';
import { colors, intensityRamp, spacing } from '@/lib/theme';
import { getSex, onSexChange } from '@/lib/prefs';
import type { Sex } from '@/lib/profile';

// Re-exported so callers that draw a body and work out what to draw keep one
// import. The logic itself lives in lib, where node can run it.
export { slugsOf, workedParts, type WorkedExercise };

const SKIN = '#C9B89A';

// Read once and kept: a list draws forty thumbnails, and forty readings of the
// same answer would have each of them start as one body and turn into the other.
let known: Sex | null | undefined;

/**
 * Whose body the muscles are drawn on: the one they said was theirs. Someone
 * who did not say gets the body the app always drew.
 */
export function useBodyGender(): 'male' | 'female' {
  const [sex, setSex] = useState<Sex | null>(known ?? null);
  useEffect(() => {
    let live = true;
    if (known === undefined) {
      getSex().then((s) => {
        known = s;
        if (live) setSex(s);
      });
    }
    const stop = onSexChange((s) => {
      known = s;
      if (live) setSex(s);
    });
    return () => {
      live = false;
      stop();
    };
  }, []);
  return sex === 'female' ? 'female' : 'male';
}

type Props = {
  // Plain strings in, cast at the one place the library is actually called:
  // the slug vocabulary lives in the drawing library, and `lib` computes these
  // without importing it. An unknown slug is drawn as nothing, which is the
  // same thing the typed version would do with a muscle the body has not got.
  data: { slug: string; intensity: number }[];
  onPartPress?: (slug: Slug) => void;
  scale?: number;
  labels?: boolean;
  /** Colour of untrained muscles, for surfaces the default would vanish against. */
  fill?: string;
};

export function BodyMap({ data, onPartPress, scale = 0.75, labels = true, fill }: Props) {
  const gender = useBodyGender();
  // Passing a handler makes the library attach onPress to every SVG path, which
  // react-native-web cannot map — so only pass one when a caller wants taps.
  const press = onPartPress
    ? (part: { slug?: Slug }) => part.slug && onPartPress(part.slug)
    : undefined;

  const common = {
    data: data as { slug: Slug; intensity: number }[],
    gender,
    scale,
    colors: intensityRamp,
    defaultFill: fill ?? SKIN,
    border: 'none',
    onBodyPartPress: press,
  } as const;

  return (
    <View>
      <View style={styles.row}>
        <Body {...common} side="front" />
        <Body {...common} side="back" />
      </View>
      {labels && (
        <View style={styles.row}>
          <Text style={styles.label}>앞</Text>
          <Text style={styles.label}>뒤</Text>
        </View>
      )}
      {labels && data.length > 0 && (
        <View style={styles.legend}>
          <Text style={styles.label}>적게</Text>
          {intensityRamp.map((c) => (
            <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
          ))}
          <Text style={styles.label}>많이 씀</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' },
  label: { color: colors.textDim, fontSize: 14, marginTop: spacing.xs },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  swatch: { width: 16, height: 8, borderRadius: 2, marginTop: spacing.xs },
});
