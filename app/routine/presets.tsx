import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Advisor } from '@/components/Advisor';
import { explain } from '@/lib/dbError';
import { notify } from '@/lib/confirm';
import { createRoutineFromPreset, listWorkoutFacts } from '@/lib/db';
import { isEmptyWorkout } from '@/lib/gamification';
import { useGirlChoice } from '@/lib/girl';
import { levelUpWord, recommendPresets, type Goal, type Place } from '@/lib/onboarding';
import { DEFAULT_WEEKLY_GOAL, getGoal, getLevel, getPlace, getSex, getWeeklyGoal, setLevel } from '@/lib/prefs';
import { DEFAULT_LEVEL, levelUpDue, type Level, type Sex } from '@/lib/profile';
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
  const { girl } = useGirlChoice();
  // What they said about themselves, so the ones that fit come first. Until it
  // is read the shelf is in its plain order, which is also the order for
  // someone who said nothing.
  const [plan, setPlan] = useState<{
    place: Place | null;
    perWeek: number;
    goal: Goal | null;
    sex: Sex | null;
    level: Level;
  }>({ place: null, perWeek: DEFAULT_WEEKLY_GOAL, goal: null, sex: null, level: DEFAULT_LEVEL });
  const [due, setDue] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getPlace(), getWeeklyGoal(), getGoal(), getSex(), getLevel()])
        .then(async ([place, perWeek, goal, sex, level]) => {
          if (!alive) return;
          setPlan({ place, perWeek, goal, sex, level });
          if (level !== 'beginner') return setDue(false);
          // Only real sessions count toward having outgrown the first routines.
          const facts = await listWorkoutFacts().catch(() => []);
          if (alive) setDue(levelUpDue(level, facts.filter((f) => !isEmptyWorkout(f))));
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const fitting = plan.place
    ? recommendPresets(plan.place, plan.perWeek, plan.goal, { sex: plan.sex, level: plan.level })
    : [];
  const fits = new Set(fitting.map((p) => p.id));
  const shelf = [...fitting, ...ROUTINE_PRESETS.filter((p) => !fits.has(p.id))];

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

      {due && (
        <>
          <Advisor name={girl.name} portrait={girl.base}>
            {levelUpWord(girl.id)}
          </Advisor>
          <Pressable
            style={styles.levelUp}
            onPress={() => {
              setLevel('intermediate').catch(() => {});
              setPlan({ ...plan, level: 'intermediate' });
              setDue(false);
            }}>
            <Text style={styles.levelUpText}>바벨 루틴부터 보여 주세요</Text>
          </Pressable>
        </>
      )}

      {shelf.map((preset) => (
        <View key={preset.id} style={[styles.card, fits.has(preset.id) && styles.cardFits]}>
          {fits.has(preset.id) && <Text style={styles.fits}>말씀하신 것에 맞춰 권해요</Text>}
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
  cardFits: { borderColor: colors.gold, borderWidth: 1 },
  fits: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  levelUp: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelUpText: { color: colors.accent, fontWeight: '800', fontSize: 16 },
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
    minHeight: 48,
  },
  useOff: { opacity: 0.6 },
  useText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
