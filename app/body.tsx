import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { BodyAdviceCard } from '@/components/BodyAdviceCard';
import { LineChart } from '@/components/LineChart';
import { ScreenState } from '@/components/ScreenState';
import {
  BODY_METRIC_ORDER,
  BODY_METRICS,
  bmi,
  change,
  latest,
  parseMeasurements,
  series,
  type BodyLog,
  type BodyMetric,
} from '@/lib/body';
import { explain } from '@/lib/dbError';
import { confirmAction, notify } from '@/lib/confirm';
import { deleteBodyLog, listBodyLogs, saveBodyLog } from '@/lib/db';
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
  const [drafts, setDrafts] = useState<Record<BodyMetric, string>>({
    weight_kg: '',
    body_fat_pct: '',
    muscle_kg: '',
    height_cm: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    listBodyLogs()
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  async function record() {
    const parsed = parseMeasurements(drafts);
    if ('bad' in parsed) {
      notify(`${BODY_METRICS[parsed.bad].name} 칸에 숫자를 넣어주세요`);
      return;
    }
    if ('empty' in parsed) {
      // The scale can read the same as last time, and that is a reading worth
      // keeping. Show what would be written and let them say so. Height is
      // left out: it is written down only when it changes.
      const same: Partial<Record<BodyMetric, number>> = {};
      for (const key of BODY_METRIC_ORDER) {
        const before = key === 'height_cm' || !logs ? null : latest(logs, key);
        if (before !== null) same[key] = before;
      }
      const keys = Object.keys(same) as BodyMetric[];
      if (!keys.length) {
        notify('잰 값을 하나라도 넣어주세요');
        return;
      }
      confirmAction(
        '지난번과 같게 적을까요?',
        keys.map((k) => `${BODY_METRICS[k].name} ${same[k]}${BODY_METRICS[k].unit}`).join('\n'),
        () => write(same)
      );
      return;
    }
    await write(parsed.values);
  }

  async function write(values: Partial<Record<BodyMetric, number>>) {
    setSaving(true);
    try {
      await saveBodyLog(values);
      setDrafts({ weight_kg: '', body_fat_pct: '', muscle_kg: '', height_cm: '' });
      load();
    } catch (e: any) {
      notify('저장 실패', explain(e));
    } finally {
      setSaving(false);
    }
  }

  function removeLog(log: BodyLog) {
    confirmAction(
      '기록 삭제',
      `${log.measured_on} 기록을 지울까요?

되돌릴 수 없어요.`,
      async () => {
        try {
          await deleteBodyLog(log.id);
          load();
        } catch (e: any) {
          notify('삭제 실패', explain(e));
        }
      }
    );
  }

  if (!logs) return <ScreenState error={error} onRetry={load} />;

  const meta = BODY_METRICS[metric];
  const moved = change(logs, metric);
  const points = series(logs, metric);
  const height = latest(logs, 'height_cm');
  const index = bmi(latest(logs, 'weight_kg'), height);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {/*
        The form comes first and asks for all three at once. It used to sit
        under the chart and take one number, for whichever tile happened to be
        picked — so writing down one weigh-in meant tapping a tile, scrolling
        past a graph and saving three times. Most scales show all three
        together; they are written down together.
      */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 잰 것</Text>
        {BODY_METRIC_ORDER.map((key) => {
          const before = latest(logs, key);
          return (
            <View key={key} style={styles.field}>
              <Text style={styles.fieldLabel}>{BODY_METRICS[key].name}</Text>
              <TextInput
                style={styles.input}
                placeholder={before === null ? '' : `지난번 ${before}`}
                placeholderTextColor={colors.textDim}
                keyboardType="decimal-pad"
                value={drafts[key]}
                onChangeText={(text) => setDrafts((d) => ({ ...d, [key]: text }))}
                returnKeyType="done"
              />
              <Text style={styles.unit}>{BODY_METRICS[key].unit}</Text>
            </View>
          );
        })}
        <Pressable
          style={[styles.save, saving && styles.saveOff]}
          disabled={saving}
          onPress={record}>
          <Text style={styles.saveText}>{saving ? '저장 중…' : '저장'}</Text>
        </Pressable>
        <Text style={styles.note}>
          잰 것만 적으면 돼요. 키는 달라졌을 때만 적으세요.{'\n'}같은 날 다시 적으면 적은 칸만 바뀌어요.
        </Text>
      </View>

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

      {/*
        Worked out from the latest height, which is written down only when it
        changes — often for a grown-up, every few months for a child.
      */}
      {index !== null && (
        <Text style={styles.bmi}>
          BMI {index} · 키 {height}cm 기준
        </Text>
      )}

      <BodyAdviceCard logs={logs} />

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
              {/* A mistyped 179 would otherwise be permanent. */}
              <Pressable hitSlop={8} onPress={() => removeLog(log)}>
                <Ionicons name="trash-outline" size={16} color={colors.textDim} />
              </Pressable>
            </View>
          ))}
          <Text style={styles.note}>잘못 적었으면 휴지통으로 지우고 다시 적으세요.</Text>
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
  tileUnit: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  bmi: { color: colors.textDim, fontSize: 14, textAlign: 'center' },
  tileLabel: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  change: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  changeQuiet: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldLabel: { color: colors.text, fontSize: 16, fontWeight: '600', width: 76 },
  input: {
    flex: 1,
    backgroundColor: paper.bgAlt,
    borderRadius: radius.sm,
    color: colors.text,
    padding: spacing.md,
    fontSize: 17,
  },
  unit: { color: colors.textDim, fontSize: 15, width: 22 },
  save: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveOff: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '800' },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  rowDay: { color: colors.textDim, fontSize: 14, width: 44 },
  rowValues: { color: colors.text, fontSize: 15, flex: 1 },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { color: colors.textDim, fontSize: 15, textAlign: 'center', lineHeight: 23 },
});
