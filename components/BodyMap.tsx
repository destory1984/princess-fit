import { StyleSheet, Text, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';
import { colors, intensityRamp, spacing } from '@/lib/theme';

const SKIN = '#C9B89A';

/** Fallback when an exercise has no explicit slugs stored. */
const GROUP_SLUGS: Record<string, Slug[]> = {
  가슴: ['chest'],
  등: ['upper-back', 'lower-back', 'trapezius'],
  어깨: ['deltoids'],
  하체: ['quadriceps', 'hamstring', 'gluteal', 'calves'],
  팔: ['biceps', 'triceps', 'forearm'],
  복근: ['abs', 'obliques'],
  유산소: ['quadriceps', 'calves'],
};

export type WorkedExercise = {
  muscle_group: string;
  secondary_group: string | null;
  body_parts?: string;
};

/** Slugs worked by an exercise: explicit list if stored, else derived from its groups. */
export function slugsOf(exercise: WorkedExercise): Slug[] {
  const explicit = (exercise.body_parts ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as Slug[];
  if (explicit.length) return explicit;
  return [
    ...(GROUP_SLUGS[exercise.muscle_group] ?? []),
    ...(exercise.secondary_group ? GROUP_SLUGS[exercise.secondary_group] ?? [] : []),
  ];
}

/** Counts how often each slug is worked; more exercises hitting it read stronger. */
export function workedParts(exercises: WorkedExercise[]) {
  const counts = new Map<Slug, number>();
  for (const e of exercises) {
    for (const slug of slugsOf(e)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()].map(([slug, n]) => ({
    slug,
    intensity: Math.min(n, intensityRamp.length),
  }));
}

type Props = {
  data: { slug: Slug; intensity: number }[];
  onPartPress?: (slug: Slug) => void;
  scale?: number;
  labels?: boolean;
  /** Colour of untrained muscles, for surfaces the default would vanish against. */
  fill?: string;
};

export function BodyMap({ data, onPartPress, scale = 0.75, labels = true, fill }: Props) {
  // Passing a handler makes the library attach onPress to every SVG path, which
  // react-native-web cannot map — so only pass one when a caller wants taps.
  const press = onPartPress
    ? (part: { slug?: Slug }) => part.slug && onPartPress(part.slug)
    : undefined;

  const common = {
    data,
    gender: 'male',
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
  label: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  swatch: { width: 16, height: 8, borderRadius: 2, marginTop: spacing.xs },
});
