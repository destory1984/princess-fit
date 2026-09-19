import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BODY_REGIONS, type BodyRegion } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

const IDLE = '#2A303A';

const SHAPES = {
  어깨: ['M62 60 q10 -11 22 -7 l0 20 q-14 4 -22 -3 z', 'M138 60 q-10 -11 -22 -7 l0 20 q14 4 22 -3 z'],
  팔: [
    'M58 74 q-9 26 -5 56 q2 15 8 21 l12 -4 q-6 -21 -4 -39 q2 -18 6 -30 z',
    'M142 74 q9 26 5 56 q-2 15 -8 21 l-12 -4 q6 -21 4 -39 q-2 -18 -6 -30 z',
  ],
  하체: [
    'M80 162 q-5 40 -3 70 q2 28 4 50 l18 0 q2 -58 2 -120 z',
    'M120 162 q5 40 3 70 q-2 28 -4 50 l-18 0 q-2 -58 -2 -120 z',
  ],
  가슴: ['M75 56 q25 -6 50 0 l0 38 q-25 6 -50 0 z'],
  복근: ['M79 96 q21 -5 42 0 l-3 62 q-18 5 -36 0 z'],
  등: ['M75 56 q25 -6 50 0 l-2 58 q-23 5 -46 0 z'],
  둔근: ['M79 116 q21 -5 42 0 l-2 42 q-19 5 -38 0 z'],
} as const;

const FRONT: BodyRegion[] = ['어깨', '팔', '하체', '가슴', '복근'];
const BACK: BodyRegion[] = ['어깨', '팔', '하체', '등'];

type Props = {
  /** Regions to shade strongly. */
  primary?: Iterable<string>;
  /** Regions to shade faintly. */
  secondary?: Iterable<string>;
  /** Omit to render a read-only diagram. */
  onPress?: (region: BodyRegion) => void;
  height?: number;
  showToggle?: boolean;
};

export function BodyMap({
  primary,
  secondary,
  onPress,
  height = 260,
  showToggle = true,
}: Props) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const strong = new Set(primary ?? []);
  const faint = new Set(secondary ?? []);

  const regions = view === 'front' ? FRONT : BACK;

  function fillFor(region: BodyRegion) {
    if (strong.has(region)) return { fill: muscleColor(region), opacity: 1 };
    if (faint.has(region)) return { fill: muscleColor(region), opacity: 0.4 };
    return { fill: IDLE, opacity: 1 };
  }

  return (
    <View style={styles.wrap}>
      <Svg viewBox="0 0 200 320" width="100%" height={height}>
        <Circle cx={100} cy={26} r={16} fill={IDLE} />
        <Rect x={93} y={40} width={14} height={10} fill={IDLE} />
        {regions.map((region) => {
          const { fill, opacity } = fillFor(region);
          return SHAPES[region].map((d, i) => (
            <Path
              key={`${region}-${i}`}
              d={d}
              fill={fill}
              fillOpacity={opacity}
              stroke={colors.surface}
              strokeWidth={2}
              onPress={onPress ? () => onPress(region) : undefined}
            />
          ));
        })}
        {view === 'back' &&
          SHAPES.둔근.map((d, i) => {
            const { fill, opacity } = fillFor('하체');
            return (
              <Path
                key={`glute-${i}`}
                d={d}
                fill={fill}
                fillOpacity={opacity}
                stroke={colors.surface}
                strokeWidth={2}
                onPress={onPress ? () => onPress('하체') : undefined}
              />
            );
          })}
      </Svg>

      {showToggle && (
        <Pressable
          style={styles.toggle}
          onPress={() => setView((v) => (v === 'front' ? 'back' : 'front'))}>
          <Text style={styles.toggleText}>
            {view === 'front' ? '뒷모습 보기' : '앞모습 보기'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function regionsOf(exercises: { muscle_group: string; secondary_group: string | null }[]) {
  const primary = new Set<string>();
  const secondary = new Set<string>();
  for (const e of exercises) {
    if ((BODY_REGIONS as readonly string[]).includes(e.muscle_group)) primary.add(e.muscle_group);
    if (e.secondary_group && (BODY_REGIONS as readonly string[]).includes(e.secondary_group))
      secondary.add(e.secondary_group);
  }
  for (const p of primary) secondary.delete(p);
  return { primary, secondary };
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  toggle: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  toggleText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
});
