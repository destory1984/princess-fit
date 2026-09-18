import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ExercisePicker } from '@/components/ExercisePicker';
import { LineChart } from '@/components/LineChart';
import { notify } from '@/lib/confirm';
import { getExerciseHistory, listExercises, type ExerciseHistoryPoint } from '@/lib/db';
import { formatDate as formatDateStyled } from '@/lib/format';
import type { Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

const formatDate = (iso: string) => formatDateStyled(iso, 'short');

export default function StatsScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [metric, setMetric] = useState<'max_weight' | 'volume'>('max_weight');
  const [picking, setPicking] = useState(false);

  const loadExercises = useCallback(() => {
    listExercises()
      .then((list) => {
        setExercises(list);
        setSelected((cur) => cur ?? list[0] ?? null);
      })
      .catch((e) => notify('불러오기 실패', e.message));
  }, []);

  useFocusEffect(loadExercises);

  useEffect(() => {
    if (!selected) return;
    getExerciseHistory(selected.id)
      .then(setHistory)
      .catch((e) => notify('불러오기 실패', e.message));
  }, [selected]);

  const points = history.map((h) => ({ label: formatDate(h.date), value: h[metric] }));
  const best = history.reduce((m, h) => Math.max(m, h.max_weight), 0);
  const unit = 'kg';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.picker} onPress={() => setPicking(true)}>
          <Text style={styles.pickerLabel}>종목</Text>
          <Text style={styles.pickerValue}>{selected?.name ?? '종목을 선택하세요'}</Text>
        </Pressable>

        {selected && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {best}
                  <Text style={styles.statUnit}> kg</Text>
                </Text>
                <Text style={styles.statLabel}>최고 무게</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{history.length}</Text>
                <Text style={styles.statLabel}>완료한 세션</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggle, metric === 'max_weight' && styles.toggleActive]}
                  onPress={() => setMetric('max_weight')}>
                  <Text style={[styles.toggleText, metric === 'max_weight' && styles.toggleTextActive]}>
                    최고 무게
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.toggle, metric === 'volume' && styles.toggleActive]}
                  onPress={() => setMetric('volume')}>
                  <Text style={[styles.toggleText, metric === 'volume' && styles.toggleTextActive]}>
                    볼륨
                  </Text>
                </Pressable>
              </View>
              <LineChart points={points} unit={unit} />
              {points.length > 0 && <Text style={styles.hint}>점을 누르면 값을 볼 수 있어요.</Text>}
            </View>

            {history.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>세션 기록</Text>
                {[...history].reverse().map((h) => (
                  <View key={h.workout_id} style={styles.tableRow}>
                    <Text style={styles.tableDate}>{formatDate(h.date)}</Text>
                    <Text style={styles.tableSets} numberOfLines={1}>
                      {h.sets.map((s) => `${s.weight_kg}×${s.reps}`).join('  ')}
                    </Text>
                    <Text style={styles.tableValue}>
                      {metric === 'max_weight' ? `${h.max_weight}kg` : `${h.volume.toLocaleString()}kg`}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  picker: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerLabel: { color: colors.textDim },
  pickerValue: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  statRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '800' },
  statUnit: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  statLabel: { color: colors.textDim, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  toggleActive: { backgroundColor: colors.accentSoft },
  toggleText: { color: colors.textDim, fontWeight: '600' },
  toggleTextActive: { color: colors.accent },
  hint: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tableDate: { color: colors.textDim, width: 40 },
  tableSets: { color: colors.text, flex: 1 },
  tableValue: { color: colors.text, fontWeight: '700' },
});
