import { StyleSheet, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';
import { slugsOf, type WorkedExercise } from '@/components/BodyMap';
import { colors, radius } from '@/lib/theme';

const SKIN = '#C9B89A';
const POSTERIOR: Slug[] = [
  'upper-back',
  'lower-back',
  'trapezius',
  'gluteal',
  'hamstring',
  'triceps',
  'calves',
];

/** Show whichever side the exercise actually works. */
function sideFor(slugs: Slug[]) {
  const back = slugs.filter((s) => POSTERIOR.includes(s)).length;
  return back > slugs.length - back ? 'back' : 'front';
}

export function ExerciseThumb({ exercise }: { exercise: WorkedExercise }) {
  const slugs = slugsOf(exercise);
  return (
    <View style={styles.wrap}>
      <Body
        data={slugs.map((slug) => ({ slug, intensity: 1 }))}
        side={sideFor(slugs)}
        gender="male"
        scale={0.13}
        colors={[colors.accent]}
        defaultFill={SKIN}
        border="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 34,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
});
