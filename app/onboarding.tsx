import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Advisor } from '@/components/Advisor';
import { seedDefaultExercises } from '@/lib/catalog';
import { notify } from '@/lib/confirm';
import { createRoutineFromPreset, listRoutines } from '@/lib/db';
import { ensureNotificationPermission } from '@/lib/notify';
import {
  GOALS,
  MAX_PER_WEEK,
  MIN_PER_WEEK,
  PLACES,
  perWeekWord,
  planWord,
  previousStep,
  progressOf,
  recommendPresets,
  nextStep,
  type Goal,
  type Place,
  type Step,
} from '@/lib/onboarding';
import {
  DEFAULT_NUDGE_HOUR,
  DEFAULT_WEEKLY_GOAL,
  markOnboarded,
  setGoal,
  setNudgeHour,
  setPlace,
  setWeeklyGoal,
} from '@/lib/prefs';
import type { RoutinePreset } from '@/lib/routinePresets';
import { colors, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';
import { withParticle } from '@/lib/korean';

/** Hours worth offering, matching the ones the settings screen uses. */
const HOURS = [8, 12, 18, 20, 22];

/**
 * The first conversation.
 *
 * Everything asked here the app needs anyway and used to guess at. Asking is
 * not the interesting part — who asks is. These are her questions, answered to
 * her face, and by the end she has a routine waiting and knows when to expect
 * you. A settings form could collect the same six values and would be worth
 * nothing, because nobody makes a promise to a form.
 *
 * Nothing is written down until the last step. Backing out halfway leaves the
 * account exactly as it was, rather than half-configured by someone who
 * changed their mind.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const girl = useGirl();
  const [step, setStep] = useState<Step>('meet');
  const [perWeek, setPerWeek] = useState(DEFAULT_WEEKLY_GOAL);
  const [goal, setChosenGoal] = useState<Goal>('habit');
  const [place, setChosenPlace] = useState<Place>('gym');
  const [preset, setPreset] = useState<RoutinePreset | null>(null);
  const [hour, setHour] = useState<number | null>(DEFAULT_NUDGE_HOUR);
  const [busy, setBusy] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // An account that already has routines has been through this once, on
  // another device or before the flow existed. Greeting them as a stranger and
  // offering to build a routine they already wrote would be worse than useless.
  useEffect(() => {
    let alive = true;
    listRoutines()
      .then(async (routines) => {
        if (!alive) return;
        if (routines.length > 0) {
          await markOnboarded();
          router.replace('/');
          return;
        }
        setChecking(false);
      })
      .catch(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [router]);

  const offered = recommendPresets(place, perWeek);

  const back = useCallback(() => {
    const previous = previousStep(step);
    if (previous) setStep(previous);
  }, [step]);

  function forward() {
    const next = nextStep(step);
    if (next) setStep(next);
    else void finish();
  }

  /**
   * Everything at once, at the end. The catalogue has to exist before a preset
   * can name exercises in it, so these are ordered rather than raced.
   */
  async function finish() {
    if (busy) return;
    try {
      setBusy('약속을 적어 두는 중이에요');
      await Promise.all([setWeeklyGoal(perWeek), setGoal(goal), setPlace(place)]);

      if (preset) {
        setBusy('운동 종목을 불러오는 중이에요');
        await seedDefaultExercises();
        setBusy(`${preset.name} 루틴을 만드는 중이에요`);
        const { missing } = await createRoutineFromPreset(preset);
        if (missing.length) {
          notify(
            '루틴을 만들었어요',
            `${withParticle(missing.join(', '), '은는')} 종목에 없어서 빠졌어요. 나중에 더하실 수 있어요.`
          );
        }
      }

      setBusy('마무리하는 중이에요');
      await setNudgeHour(hour);
      // The permission sheet is the last thing, and only when it was asked for.
      if (hour !== null && Platform.OS !== 'web') {
        await ensureNotificationPermission().catch(() => {
          // Refusing notifications is an answer, not a failure.
        });
      }
      await markOnboarded();
      router.replace('/');
    } catch (e: any) {
      setBusy(null);
      notify('준비하지 못했어요', e.message);
    }
  }

  async function skip() {
    await markOnboarded();
    router.replace('/');
  }

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (busy) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.busyText}>{busy}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${progressOf(step) * 100}%` }]} />
      </View>

      <View style={styles.top}>
        {previousStep(step) ? (
          <Pressable hitSlop={10} onPress={back}>
            <Ionicons name="chevron-back" size={24} color={colors.textDim} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
        <Pressable hitSlop={10} onPress={skip}>
          <Text style={styles.skip}>건너뛰기</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Advisor name={girl.name} portrait={girl.base}>
          {said(step, girl.name, { perWeek, goal, place, preset, hour })}
        </Advisor>

        {step === 'meet' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>이렇게 지내게 돼요</Text>
            <Beat icon="barbell-outline" text="운동을 마치면 골드가 들어와요." />
            <Beat icon="restaurant-outline" text="골드로 끼니와 옷, 배움을 챙겨 줘요." />
            <Beat icon="home-outline" text="방에 둘 물건도 골드로 사요." />
            <Beat
              icon="time-outline"
              text="오래 안 오시면 배가 고파지고 옷도 해져요. 서두르실 건 없어요."
            />
          </View>
        )}

        {step === 'often' && (
          <>
            <Text style={styles.question}>일주일에 몇 번 오실 건가요?</Text>
            <View style={styles.counter}>
              <Pressable
                style={[styles.round, perWeek <= MIN_PER_WEEK && styles.roundOff]}
                disabled={perWeek <= MIN_PER_WEEK}
                onPress={() => setPerWeek(perWeek - 1)}>
                <Ionicons name="remove" size={24} color={colors.accent} />
              </Pressable>
              <View style={styles.counterBody}>
                <Text style={styles.counterValue}>{perWeek}번</Text>
                <Text style={styles.counterSub}>언제든 바꿀 수 있어요</Text>
              </View>
              <Pressable
                style={[styles.round, perWeek >= MAX_PER_WEEK && styles.roundOff]}
                disabled={perWeek >= MAX_PER_WEEK}
                onPress={() => setPerWeek(perWeek + 1)}>
                <Ionicons name="add" size={24} color={colors.accent} />
              </Pressable>
            </View>
          </>
        )}

        {step === 'goal' && (
          <>
            <Text style={styles.question}>무엇을 바라고 오셨나요?</Text>
            {GOALS.map((g) => (
              <Choice
                key={g.id}
                on={goal === g.id}
                label={g.label}
                detail={g.detail}
                onPress={() => setChosenGoal(g.id)}
              />
            ))}
          </>
        )}

        {step === 'place' && (
          <>
            <Text style={styles.question}>어디서 운동하세요?</Text>
            {PLACES.map((p) => (
              <Choice
                key={p.id}
                on={place === p.id}
                label={p.label}
                detail={p.detail}
                onPress={() => {
                  setChosenPlace(p.id);
                  // The recommendations change with the place, so a routine
                  // picked for the other one must not survive the switch.
                  setPreset(null);
                }}
              />
            ))}
          </>
        )}

        {step === 'routine' && (
          <>
            <Text style={styles.question}>이걸로 시작해 보실래요?</Text>
            {offered.map((p) => (
              <Choice
                key={p.id}
                on={preset?.id === p.id}
                label={p.name}
                detail={`${p.detail}\n${p.days} · 약 ${p.minutes}분 · 종목 ${p.exercises.length}개`}
                onPress={() => setPreset(preset?.id === p.id ? null : p)}
              />
            ))}
            <Text style={styles.note}>
              고르지 않아도 괜찮아요. 나중에 루틴 탭에서 언제든 만들 수 있어요.
            </Text>
          </>
        )}

        {step === 'nudge' && (
          <>
            <Text style={styles.question}>하루 한 번 안부를 보내도 될까요?</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, hour !== null && styles.chipOn]}
                onPress={() => setHour(DEFAULT_NUDGE_HOUR)}>
                <Text style={[styles.chipText, hour !== null && styles.chipTextOn]}>
                  보내 주세요
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, hour === null && styles.chipOn]}
                onPress={() => setHour(null)}>
                <Text style={[styles.chipText, hour === null && styles.chipTextOn]}>
                  안 받을래요
                </Text>
              </Pressable>
            </View>

            {hour !== null && (
              <>
                <Text style={styles.subQuestion}>몇 시가 좋으세요?</Text>
                <View style={styles.row}>
                  {HOURS.map((h) => (
                    <Pressable
                      key={h}
                      style={[styles.chip, hour === h && styles.chipOn]}
                      onPress={() => setHour(h)}>
                      <Text style={[styles.chipText, hour === h && styles.chipTextOn]}>
                        {h}시
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.note}>
                  잠든 시간에 오지 않게 막아 두는 건 설정에서 정할 수 있어요.
                  {Platform.OS === 'web' ? ' 알림은 폰에서만 와요.' : ''}
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>

      <Pressable style={styles.next} onPress={forward}>
        <Text style={styles.nextText}>
          {step === 'meet' ? '반가워요' : nextStep(step) ? '다음' : '시작할게요'}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Her line for the step. Written as one function rather than per-screen text so
 * the whole conversation can be read in one place — and so it is obvious when
 * she has stopped sounding like one person.
 */
function said(
  step: Step,
  name: string,
  answers: {
    perWeek: number;
    goal: Goal;
    place: Place;
    preset: RoutinePreset | null;
    hour: number | null;
  }
): string {
  switch (step) {
    case 'meet':
      return `저는 ${name}예요. 여기서 기다리고 있을게요. 몇 가지만 여쭤봐도 될까요?`;
    case 'often':
      return perWeekWord(answers.perWeek);
    case 'goal':
      return '뭘 바라고 오셨는지 알면, 제가 드릴 말씀도 달라져요.';
    case 'place':
      return answers.place === 'home'
        ? '집이라면 기구 없이 할 수 있는 걸로 드릴게요.'
        : '기구가 있으면 고를 수 있는 게 많아져요.';
    case 'routine':
      return planWord(answers.goal, answers.place, answers.perWeek);
    case 'nudge':
      return answers.hour === null
        ? '알겠어요. 조용히 기다릴게요.'
        : `그럼 ${answers.hour}시쯤에 한 마디 보낼게요. 하루에 한 번만요.`;
  }
}

function Beat({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.beat}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <Text style={styles.beatText}>{text}</Text>
    </View>
  );
}

function Choice({
  on,
  label,
  detail,
  onPress,
}: {
  on: boolean;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.choice, on && styles.choiceOn]} onPress={onPress}>
      <View style={styles.choiceBody}>
        <Text style={[styles.choiceLabel, on && styles.choiceLabelOn]}>{label}</Text>
        <Text style={styles.choiceDetail}>{detail}</Text>
      </View>
      {on && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xl },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  busyText: { color: colors.textDim, fontSize: 13 },
  bar: { height: 3, backgroundColor: colors.surfaceAlt, marginHorizontal: spacing.lg },
  barFill: { height: 3, backgroundColor: colors.accent },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  spacer: { width: 24 },
  skip: { color: colors.textDim, fontSize: 13 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  question: { color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 31 },
  subQuestion: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  note: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  beat: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  beatText: { color: colors.text, fontSize: 14, lineHeight: 21, flex: 1 },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  counterBody: { flex: 1, alignItems: 'center' },
  counterValue: { color: colors.text, fontSize: 34, fontWeight: '800' },
  counterSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOff: { opacity: 0.4 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.lg,
  },
  choiceOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  choiceBody: { flex: 1, gap: 2 },
  choiceLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  choiceLabelOn: { color: colors.accent },
  choiceDetail: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textDim },
  chipTextOn: { color: colors.accent, fontWeight: '700' },
  next: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    margin: spacing.lg,
  },
  nextText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
