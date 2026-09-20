import { intensityRamp } from './theme.ts';

/**
 * Which muscles an exercise works, as body-map slugs.
 *
 * Kept here rather than beside the body map because `lib` should not have to
 * import a component to answer a question about data — and because the tests
 * run under plain node, where pulling in the drawing library would be fatal.
 * The slugs are the ones `react-native-body-highlighter` knows, as strings, so
 * this file stays free of it.
 */

export type Slug = string;

/** Fallback when an exercise has no explicit slugs stored. */
export const GROUP_SLUGS: Record<string, Slug[]> = {
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
    .filter(Boolean);
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
