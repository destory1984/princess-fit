import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { LineChart } from '@/components/LineChart';
import { ScreenState } from '@/components/ScreenState';
import {
  BODY_METRIC_ORDER,
  BODY_METRICS,
  change,
  latest,
  series,
  type BodyLog,
  type BodyMetric,
} from '@/lib/body';
import { notify } from '@/lib/confirm';
import { listBodyLogs, saveBodyLog } from '@/lib/db';
import { colors, paper, radius, spacing } from '@/lib/theme';

/**
 * Weight, body fat and muscle over time.
 *
 * The number people actually want is not today's weight but whether it is
 * going anywhere, so the change over a month sits beside each reading — and
 * says nothing at all when there are too few readings to mean it.
 */
export default function BodyScreen() {
  const [logs, setLogs] = useState<BodyLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<BodyMetric>('weight_kg');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    listBodyLogs()
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  async function record() {
    const value = Number(draft.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      notify('숫자를 넣어주세요');
      return;
    }
    setSaving(true);
    try {
      await saveBodyLog({ [metric]: value });
      setDraft('');
      load();
    } catch (e: any) {
      notify('저장 실패', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!logs) return <ScreenState error={error} onRetry={load} />;

  const meta = BODY_METRICS[metric];
  const moved = change(logs, metric);
  const points = series(logs, metric);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.tiles}>
        {BODY_METRIC_ORDER.map((key) => {
          const value = latest(logs, key);
          const on = key === metric;
          return (
            <Pressable
              key={key}
              style={[styles.tile, on && styles.tileOn]}
              onPress={() => setMetric(key)}>
              <Text style={[styles.tileValue, on && styles.tileValueOn]}>
                {value === null ? '—' : value}
                <Text style={styles.tileUnit}> {BODY_METRICS[key].unit}</Text>
              </Text>
              <Text style={styles.tileLabel}>{BODY_METRICS[key].name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{meta.name}</Text>
        {moved ? (
          <Text style={styles.change}>
            최근 한 달 {moved.delta > 0 ? '+' : ''}
            {moved.delta}
            {meta.unit} · {moved.from.slice(5)} → {moved.to.slice(5)}
          </Text>
        ) : (
          <Text style={styles.changeQuiet}>
            한 달 안에 두 번은 재야 변화를 말할 수 있어요.
          </Text>
        )}
        <LineChart points={points} unit={meta.unit} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 {meta.name} 기록</Text>
        <View style={styles.entry}>
          <TextInput
            style={styles.input}
            placeholder={`예: ${metric === 'body_fat_pct' ? '23.4' : '79.4'}`}
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={record}
            returnKeyType="done"
          />
          <Text style={styles.unit}>{meta.unit}</Text>
          <Pressable
            style={[styles.save, saving && styles.saveOff]}
            disabled={saving}
            onPress={record}>
            <Text style={styles.saveText}>{saving ? '저장 중…' : '기록'}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>
          하루에 하나만 남아요. 같은 날 다시 재면 새 값으로 바뀌어요.
        </Text>
      </View>

      {logs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>지난 기록</Text>
          {logs.slice(0, 12).map((log) => (
            <View key={log.id} style={styles.row}>
              <Text style={styles.rowDay}>{log.measured_on.slice(5)}</Text>
              <Text style={styles.rowValues}>
                {BODY_METRIC_ORDER.filter((k) => log[k] !== null)
                  .map((k) => `${BODY_METRICS[k].name} ${log[k]}${BODY_METRICS[k].unit}`)
                  .join(' · ') || '—'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {logs.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={26} color={colors.textDim} />
          <Text style={styles.emptyText}>
            아직 잰 기록이 없어요.{'\n'}같은 시간에 재야 흐름이 보여요.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.md,
  },
  tileOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  tileValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  tileValueOn: { color: colors.accent },
  tileUnit: { color: colors.textDim, fontSize: 11, fontWeight: '600' },
  tileLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  change: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  changeQuiet: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: paper.bgAlt,
    borderRadius: radius.sm,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
  },
  unit: { color: colors.textDim, fontSize: 13 },
  save: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  saveOff: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '800' },
  note: { color: colors.textDim, fontSize: 11, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  rowDay: { color: colors.textDim, fontSize: 12, width: 44 },
  rowValues: { color: colors.text, fontSize: 13, flex: 1 },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { color: colors.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
