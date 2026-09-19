import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ExercisePicker } from '@/components/ExercisePicker';
import { GroupBreakdown } from '@/components/GroupBreakdown';
import { Insights } from '@/components/Insights';
import { LineChart } from '@/components/LineChart';
import { OrnateFrame } from '@/components/OrnateFrame';
import { notify } from '@/lib/confirm';
import {
  getExerciseHistory,
  getGroupTotals,
  listExercises,
  listWorkoutFacts,
  type ExerciseHistoryPoint,
  type GroupTotal,
} from '@/lib/db';
import { formatDate, formatDuration } from '@/lib/format';
import type { WorkoutFact } from '@/lib/gamification';
import type { Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function StatsScreen() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [totals, setTotals] = useState<GroupTotal[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [metric, setMetric] = useState<'max_weight' | 'volume'>('max_weight');
  const [picking, setPicking] = useState(false);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);

  const load = useCallback(() => {
    listWorkoutFacts()
      .then(setFacts)
      .catch(() => {
        // The charts below still work; only the reading is lost.
      });
    Promise.all([listExercises(), getGroupTotals()])
      .then(([list, groups]) => {
        setExercises(list);
        setTotals(groups);
        setSelected((cur) => cur ?? list[0] ?? null);
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(load);

  useEffect(() => {
    if (!selected) return;
    getExerciseHistory(selected.id)
      .then(setHistory)
      .catch((e) => notify('불러오기 실패', e.message));
  }, [selected]);

  const isCardio = selected?.track_type !== 'weight_reps';
  const points = history.map((h) => ({
    label: formatDate(h.date, 'short'),
    value: isCardio ? Math.round(h.durationSec / 60) : h[metric],
  }));
  const best = history.reduce((m, h) => Math.max(m, h.max_weight), 0);
  const totalMinutes = Math.round(history.reduce((s, h) => s + h.durationSec, 0) / 60);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>이번 달, 이렇게 하고 계세요</Text>
        <Insights workouts={facts} />

        <OrnateFrame>
          <Text style={styles.cardTitle}>부위별 비중</Text>
          <GroupBreakdown totals={totals} />
        </OrnateFrame>

        <Pressable style={styles.tool} onPress={() => router.push('/onerm')}>
          <Ionicons name="calculator-outline" size={18} color={colors.accent} />
          <View style={styles.toolBody}>
            <Text style={styles.toolTitle}>1RM 계산기</Text>
            <Text style={styles.toolSub}>해본 세트로 한 번에 들 무게를 가늠해요</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </Pressable>

        <Pressable style={styles.picker} onPress={() => setPicking(true)}>
          <Text style={styles.pickerLabel}>종목</Text>
          <Text style={styles.pickerValue}>{selected?.name ?? '종목을 선택하세요'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.accent} />
        </Pressable>

        {selected && (
          <>
            <View style={styles.statRow}>
              {isCardio ? (
                <>
                  <Stat value={formatDuration(totalMinutes * 60)} label="누적 시간" />
                  <Stat value={String(history.length)} label="수행 횟수" />
                </>
              ) : (
                <>
                  <Stat value={`${best}kg`} label="최고 무게" />
                  <Stat value={String(history.length)} label="수행 횟수" />
                </>
              )}
            </View>

            <View style={styles.card}>
              {!isCardio && (
                <View style={styles.toggleRow}>
                  <Toggle
                    label="최고 무게"
                    on={metric === 'max_weight'}
                    onPress={() => setMetric('max_weight')}
                  />
                  <Toggle
                    label="볼륨"
                    on={metric === 'volume'}
                    onPress={() => setMetric('volume')}
                  />
                </View>
              )}
              <LineChart points={points} unit={isCardio ? '분' : 'kg'} />
              {points.length > 0 && <Text style={styles.hint}>점을 누르면 값을 볼 수 있어요.</Text>}
            </View>

            {history.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>세션 기록</Text>
                {[...history].reverse().map((h) => (
                  <View key={h.workout_id} style={styles.tableRow}>
                    <Text style={styles.tableDate}>{formatDate(h.date, 'short')}</Text>
                    <Text style={styles.tableSets} numberOfLines={1}>
                      {isCardio
                        ? formatDuration(h.durationSec)
                        : h.sets.map((s) => `${s.weight_kg}×${s.reps}`).join('  ')}
                    </Text>
                    <Text style={styles.tableValue}>
                      {isCardio
                        ? h.distanceKm > 0
                          ? `${h.distanceKm}km`
                          : ''
                        : metric === 'max_weight'
                          ? `${h.max_weight}kg`
                          : `${h.volume.toLocaleString()}kg`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ExercisePicker
        visible={picking}
        exercises={exercises}
        onSelect={setSelected}
        onClose={() => setPicking(false)}
        onSeeded={load}
      />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, on && styles.toggleOn]} onPress={onPress}>
      <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  toolBody: { flex: 1 },
  toolTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  toolSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  picker: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerLabel: { color: colors.textDim, flex: 1 },
  pickerValue: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  statRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textDim, marginTop: spacing.xs, fontSize: 12 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  toggleOn: { backgroundColor: colors.accentSoft },
  toggleText: { color: colors.textDim, fontWeight: '600' },
  toggleTextOn: { color: colors.accent },
  hint: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tableDate: { color: colors.textDim, width: 44, fontSize: 13 },
  tableSets: { color: colors.text, flex: 1, fontSize: 13 },
  tableValue: { color: colors.text, fontWeight: '700', fontSize: 13 },
});
