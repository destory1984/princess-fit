import { StyleSheet, Text, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';
import { colors, spacing } from '@/lib/theme';

const SKIN = '#D9D4CC';

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

/** Counts how often each slug is worked, so heavier-used muscles shade darker. */
export function workedParts(exercises: WorkedExercise[]) {
  const counts = new Map<Slug, number>();
  for (const e of exercises) {
    for (const slug of slugsOf(e)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  return [...counts.entries()].map(([slug, n]) => ({
    slug,
    intensity: n >= max && max > 1 ? 2 : 1,
  }));
}

type Props = {
  data: { slug: Slug; intensity: number }[];
  onPartPress?: (slug: Slug) => void;
  scale?: number;
  labels?: boolean;
};

export function BodyMap({ data, onPartPress, scale = 0.75, labels = true }: Props) {
  return (
    <View>
      <View style={styles.row}>
        <Body
          data={data}
          side="front"
          gender="male"
          scale={scale}
          colors={[colors.accent, '#E0476A']}
          defaultFill={SKIN}
          border="none"
          onBodyPartPress={(part) => part.slug && onPartPress?.(part.slug)}
        />
        <Body
          data={data}
          side="back"
          gender="male"
          scale={scale}
          colors={[colors.accent, '#E0476A']}
          defaultFill={SKIN}
          border="none"
          onBodyPartPress={(part) => part.slug && onPartPress?.(part.slug)}
        />
      </View>
      {labels && (
        <View style={styles.row}>
          <Text style={styles.label}>앞</Text>
          <Text style={styles.label}>뒤</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' },
  label: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs },
});
