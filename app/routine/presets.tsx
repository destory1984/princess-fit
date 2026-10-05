import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { explain } from '@/lib/dbError';
import { notify } from '@/lib/confirm';
import { createRoutineFromPreset } from '@/lib/db';
import { ROUTINE_PRESETS, type RoutinePreset } from '@/lib/routinePresets';
import { colors, radius, spacing } from '@/lib/theme';
import { withParticle } from '@/lib/korean';

/**
 * Ready-made routines, for the moment a blank routine screen asks a beginner
 * the one question they cannot answer: what should I do?
 *
 * Each card shows the whole routine rather than a name and a promise — five
 * movements you can read before committing is the difference between choosing
 * and guessing.
 */
export default function RoutinePresetsScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function use(preset: RoutinePreset) {
    if (busy) return;
    setBusy(preset.id);
    try {
      const { routine, missing } = await createRoutineFromPreset(preset);
      if (missing.length) {
        notify(
          `${preset.name} 루틴을 만들었어요`,
          `${withParticle(missing.join(', '), '은는')} 종목에 없어서 빠졌어요.`
        );
      }
      router.replace(`/routine/${routine.id}`);
    } catch (e: any) {
      notify('만들지 못했어요', explain(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        골라서 그대로 쓰고, 나중에 종목을 빼거나 더하면 돼요.
      </Text>

      {ROUTINE_PRESETS.map((preset) => (
        <View key={preset.id} style={styles.card}>
          <Text style={styles.name}>{preset.name}</Text>
          <Text style={styles.detail}>{preset.detail}</Text>
          <Text style={styles.meta}>
            {preset.days} · 약 {preset.minutes}분 · 종목 {preset.exercises.length}개
          </Text>

          <View style={styles.list}>
            {preset.exercises.map((e) => (
              <View key={e.name} style={styles.line}>
                <Text style={styles.lineName}>{e.name}</Text>
                <Text style={styles.lineSets}>
                  {e.reps > 0 ? `${e.sets}세트 × ${e.reps}회` : `${e.sets}세트`}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.use, busy === preset.id && styles.useOff]}
            disabled={busy === preset.id}
            onPress={() => use(preset)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.useText}>
              {busy === preset.id ? '만드는 중…' : '이 루틴 쓰기'}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  detail: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
  meta: { color: colors.gold, fontSize: 14, fontWeight: '700', marginTop: 2 },
  list: { marginTop: spacing.sm, gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineName: { color: colors.text, fontSize: 15, flex: 1 },
  lineSets: { color: colors.textDim, fontSize: 14 },
  use: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  useOff: { opacity: 0.6 },
  useText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
