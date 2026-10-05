import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { LineChart } from '@/components/LineChart';
import { ScreenState } from '@/components/ScreenState';
import { TimeField } from '@/components/TimeField';
import { explain } from '@/lib/dbError';
import { confirmAction, notify } from '@/lib/confirm';
import {
  deleteSleepLog,
  listSleepLogs,
  listWorkoutFacts,
  saveSleepLog,
} from '@/lib/db';
import type { WorkoutFact } from '@/lib/gamification';
import {
  averageMinutes,
  DEFAULT_BED,
  DEFAULT_WAKE,
  formatDuration,
  formatMinuteOfDay,
  MIN_NIGHTS,
  series,
  sleepMinutes,
  trainedVersusRested,
  type SleepLog,
} from '@/lib/sleep';
import { colors, paper, radius, spacing } from '@/lib/theme';

/**
 * Sleep, written down by hand.
 *
 * No REM, no deep sleep, no score out of a hundred — those come from a band
 * on your wrist, and inventing them would be lying in a graph. When you went
 * to bed and when you got up is what can be recorded honestly, and it answers
 * the only question worth asking here: does training change how you sleep?
 */
export default function SleepScreen() {
  const [logs, setLogs] = useState<SleepLog[] | null>(null);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bed, setBed] = useState(DEFAULT_BED);
  const [wake, setWake] = useState(DEFAULT_WAKE);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    listSleepLogs()
      .then(setLogs)
      .catch((e) => setError(e.message));
    listWorkoutFacts()
      .then(setFacts)
      .catch(() => {
        // Only the training comparison is lost.
      });
  }, []);

  useFocusEffect(load);

  async function record() {
    setSaving(true);
    try {
      await saveSleepLog(bed, wake);
      load();
    } catch (e: any) {
      notify('저장 실패', explain(e));
    } finally {
      setSaving(false);
    }
  }

  function removeLog(log: SleepLog) {
    confirmAction(
      '기록 삭제',
      `${log.slept_on} 밤 기록을 지울까요?\n\n되돌릴 수 없어요.`,
      async () => {
        try {
          await deleteSleepLog(log.id);
          load();
        } catch (e: any) {
          notify('삭제 실패', explain(e));
        }
      }
    );
  }

  if (!logs) return <ScreenState error={error} onRetry={load} />;

  const average = averageMinutes(logs);
  const compared = trainedVersusRested(logs, facts);
  const tonight = sleepMinutes(bed, wake);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>어젯밤</Text>
        <View style={styles.fields}>
          <TimeField label="잠든 시각" value={bed} onChange={setBed} />
          <View style={styles.divider} />
          <TimeField label="일어난 시각" value={wake} onChange={setWake} />
        </View>
        <Text style={styles.tonight}>{formatDuration(tonight)} 잤어요</Text>
        <Pressable
          style={[styles.save, saving && styles.saveOff]}
          disabled={saving}
          onPress={record}>
          <Text style={styles.saveText}>{saving ? '저장 중…' : '기록'}</Text>
        </Pressable>
        <Text style={styles.note}>
          하룻밤에 하나만 남아요. 같은 날 다시 적으면 새 값으로 바뀌어요.
        </Text>
      </View>

      {compared ? (
        <View style={styles.compare}>
          <Text style={styles.compareTitle}>운동한 날과 쉰 날</Text>
          <Row
            label="운동한 날"
            value={formatDuration(compared.trained)}
            nights={compared.trainedNights}
            strong={compared.trained >= compared.rested}
          />
          <Row
            label="쉰 날"
            value={formatDuration(compared.rested)}
            nights={compared.restedNights}
            strong={compared.rested > compared.trained}
          />
          <Text style={styles.compareNote}>
            {Math.abs(compared.trained - compared.rested) < 20
              ? '운동한 날과 쉰 날이 크게 다르지 않아요.'
              : compared.trained > compared.rested
                ? '운동한 날 더 잘 주무셨어요.'
                : '운동한 날 덜 주무셨어요. 늦은 시간 운동은 아닌지 살펴보세요.'}
          </Text>
        </View>
      ) : (
        <View style={styles.quiet}>
          <Text style={styles.quietText}>
            운동한 날과 쉰 날 각각 {MIN_NIGHTS}밤씩 쌓이면, 운동이 잠을 바꾸는지
            견주어 드려요.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          잔 시간{average !== null ? ` · 평균 ${formatDuration(average)}` : ''}
        </Text>
        <LineChart points={series(logs)} unit="시간" />
      </View>

      {logs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>지난 기록</Text>
          {logs.slice(0, 12).map((log) => (
            <View key={log.id} style={styles.row}>
              <Text style={styles.rowDay}>{log.slept_on.slice(5)}</Text>
              <Text style={styles.rowValues}>
                {formatMinuteOfDay(log.bed_minute)} → {formatMinuteOfDay(log.wake_minute)} ·{' '}
                {formatDuration(sleepMinutes(log.bed_minute, log.wake_minute))}
              </Text>
              <Pressable hitSlop={8} onPress={() => removeLog(log)}>
                <Ionicons name="close" size={16} color={colors.textDim} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.caution}>
        깊은 잠이나 REM은 손목에 차는 기기라야 알 수 있어요. 여기서는 지어내지 않아요.
      </Text>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  nights,
  strong,
}: {
  label: string;
  value: string;
  nights: number;
  strong: boolean;
}) {
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareValue, strong && styles.compareValueOn]}>{value}</Text>
      <Text style={styles.compareNights}>{nights}밤</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  fields: { flexDirection: 'row', alignItems: 'flex-start' },
  divider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  tonight: { color: colors.accent, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  save: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  saveOff: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
  compare: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  compareTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compareLabel: { color: colors.textDim, fontSize: 15, width: 72 },
  compareValue: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 },
  compareValueOn: { color: colors.accent },
  compareNights: { color: colors.textDim, fontSize: 13 },
  compareNote: { color: colors.textDim, fontSize: 14, lineHeight: 21, marginTop: 4 },
  quiet: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.faint,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  quietText: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  rowDay: { color: colors.textDim, fontSize: 14, width: 44 },
  rowValues: { color: colors.text, fontSize: 15, flex: 1 },
  caution: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
});
