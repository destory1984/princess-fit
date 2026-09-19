import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BigStepper } from '@/components/BigStepper';
import { successFeedback, tapFeedback } from '@/lib/feedback';
import type { TrackType, WorkoutSet } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  set: WorkoutSet;
  track: TrackType;
  index: number;
  total: number;
  tint: string;
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
  onChange,
  onComplete,
  onRemove,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(0.96);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [set.id, scale]);

  function change(patch: Partial<WorkoutSet>) {
    tapFeedback();
    onChange(patch);
  }

  function complete() {
    successFeedback();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.04, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    onComplete();
  }

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <View style={styles.head}>
        <Text style={styles.label}>
          {track === 'weight_reps' ? `${index}번째 세트` : '이번 기록'}
          {total > 1 && track === 'weight_reps' ? ` · 총 ${total}세트` : ''}
        </Text>
        <Pressable hitSlop={8} onPress={onRemove}>
          <Ionicons name="close" size={18} color={colors.textDim} />
        </Pressable>
      </View>

      <View style={styles.steppers}>
        {track === 'weight_reps' ? (
          <>
            <BigStepper
              value={set.weight_kg}
              unit="kg"
              step={1}
              bigStep={5}
              decimals={set.weight_kg % 1 === 0 ? 0 : 1}
              onChange={(v) => change({ weight_kg: v })}
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
            <BigStepper
              value={Math.round(set.duration_sec / 60)}
              unit="분"
              step={1}
              bigStep={5}
              onChange={(v) => change({ duration_sec: v * 60 })}
            />
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

      <Pressable style={[styles.done, { backgroundColor: tint }]} onPress={complete}>
        <Ionicons name="checkmark" size={20} color="#0E1116" />
        <Text style={styles.doneText}>
          {track === 'weight_reps' ? '세트 완료' : '기록 완료'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  steppers: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 52, backgroundColor: colors.border },
  done: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  doneText: { color: '#0E1116', fontWeight: '800', fontSize: 15 },
});
