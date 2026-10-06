import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { ScreenState } from '@/components/ScreenState';
import { explain } from '@/lib/dbError';
import { notify } from '@/lib/confirm';
import {
  GOALS,
  MAX_PER_WEEK,
  MIN_PER_WEEK,
  PLACES,
  perWeekWord,
  planWord,
  type Goal,
  type Place,
} from '@/lib/onboarding';
import { watchingWord } from '@/lib/plan';
import { DEFAULT_LEVEL, LEVELS, SEXES, type Level, type Sex } from '@/lib/profile';
import {
  getGoal,
  getLevel,
  getPlace,
  getSex,
  getWeeklyGoal,
  setGoal,
  setLevel,
  setPlace,
  setSex,
  setWeeklyGoal,
} from '@/lib/prefs';
import { colors, paper, radius, spacing } from '@/lib/theme';

/**
 * The three answers from the greeting, afterwards.
 *
 * She told them 언제든 바꿀 수 있어요 while asking, and then there was nowhere
 * to. A promise you have to reinstall the app to keep is not one.
 *
 * Each row says what that answer is doing, because none of them is decoration:
 * the days set what this week is measured against, the place orders the
 * exercise picker, and the goal decides which finding gets read out first.
 */
export default function PlanScreen() {
  const [perWeek, setPerWeek] = useState<number | null>(null);
  const [goal, setChosenGoal] = useState<Goal | null>(null);
  const [place, setChosenPlace] = useState<Place | null>(null);
  const [sex, setChosenSex] = useState<Sex | null>(null);
  const [level, setChosenLevel] = useState<Level>(DEFAULT_LEVEL);

  const load = useCallback(() => {
    let alive = true;
    Promise.all([getWeeklyGoal(), getGoal(), getPlace(), getSex(), getLevel()]).then(
      ([days, g, p, s, l]) => {
        if (!alive) return;
        setPerWeek(days);
        setChosenGoal(g);
        setChosenPlace(p);
        setChosenSex(s);
        setChosenLevel(l);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(load);

  async function changeDays(next: number) {
    const clamped = Math.max(MIN_PER_WEEK, Math.min(MAX_PER_WEEK, next));
    const previous = perWeek;
    setPerWeek(clamped);
    try {
      await setWeeklyGoal(clamped);
    } catch (e: any) {
      notify('저장 실패', explain(e));
      setPerWeek(previous);
    }
  }

  async function changeGoal(next: Goal) {
    const previous = goal;
    setChosenGoal(next);
    try {
      await setGoal(next);
    } catch (e: any) {
      notify('저장 실패', explain(e));
      setChosenGoal(previous);
    }
  }

  async function changePlace(next: Place) {
    const previous = place;
    setChosenPlace(next);
    try {
      await setPlace(next);
    } catch (e: any) {
      notify('저장 실패', explain(e));
      setChosenPlace(previous);
    }
  }

  async function changeSex(next: Sex | null) {
    const previous = sex;
    setChosenSex(next);
    try {
      await setSex(next);
    } catch (e: any) {
      notify('저장 실패', explain(e));
      setChosenSex(previous);
    }
  }

  async function changeLevel(next: Level) {
    const previous = level;
    setChosenLevel(next);
    try {
      await setLevel(next);
    } catch (e: any) {
      notify('저장 실패', explain(e));
      setChosenLevel(previous);
    }
  }

  if (perWeek === null) return <ScreenState error={null} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {goal && place && (
        <View style={styles.summary}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.gold} />
          <Text style={styles.summaryText}>{planWord(goal, place, perWeek)}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>일주일에 몇 번</Text>
        <View style={styles.counter}>
          <Pressable
            style={[styles.round, perWeek <= MIN_PER_WEEK && styles.roundOff]}
            disabled={perWeek <= MIN_PER_WEEK}
            onPress={() => changeDays(perWeek - 1)}>
            <Ionicons name="remove" size={22} color={colors.accent} />
          </Pressable>
          <Text style={styles.counterValue}>{perWeek}번</Text>
          <Pressable
            style={[styles.round, perWeek >= MAX_PER_WEEK && styles.roundOff]}
            disabled={perWeek >= MAX_PER_WEEK}
            onPress={() => changeDays(perWeek + 1)}>
            <Ionicons name="add" size={22} color={colors.accent} />
          </Pressable>
        </View>
        <Text style={styles.note}>{perWeekWord(perWeek)}</Text>
        <Text style={styles.effect}>홈의 「이번 주 N/{perWeek}회」가 여기에 맞춰져요.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>어디서 운동하세요</Text>
        {PLACES.map((p) => (
          <Choice
            key={p.id}
            on={place === p.id}
            label={p.label}
            detail={p.detail}
            onPress={() => changePlace(p.id)}
          />
        ))}
        <Text style={styles.effect}>
          {place === 'home'
            ? '종목 고를 때 기구 없이 할 수 있는 것부터 보여요. 기구 종목이 사라지진 않아요.'
            : '종목은 자주 쓰신 순서대로 보여요.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>무엇을 바라고 오셨나요</Text>
        {GOALS.map((g) => (
          <Choice
            key={g.id}
            on={goal === g.id}
            label={g.label}
            detail={g.detail}
            onPress={() => changeGoal(g.id)}
          />
        ))}
        <Text style={styles.effect}>
          {watchingWord(goal) ??
            '고르시면, 기록에서 짚어드릴 것 중 무엇을 먼저 말할지가 달라져요.'}
        </Text>
        <Text style={styles.note}>
          짚어드리는 내용 자체는 그대로예요. 순서만 달라져요.
        </Text>
      </View>

      {/*
        Who is training (lib/profile.ts). Asked in the first conversation since
        2026-10-06; this is where an account from before that is asked, and
        where anyone changes their answer.
      */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>운동하시는 분은</Text>
        <View style={styles.chips}>
          {SEXES.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.chip, sex === s.id && styles.chipOn]}
              onPress={() => changeSex(s.id)}>
              <Text style={[styles.chipText, sex === s.id && styles.chipTextOn]}>{s.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, sex === null && styles.chipOn]}
            onPress={() => changeSex(null)}>
            <Text style={[styles.chipText, sex === null && styles.chipTextOn]}>말하지 않을래요</Text>
          </Pressable>
        </View>
        {LEVELS.map((l) => (
          <Choice
            key={l.id}
            on={level === l.id}
            label={l.label}
            detail={l.detail}
            onPress={() => changeLevel(l.id)}
          />
        ))}
        <Text style={styles.effect}>
          짜여 있는 루틴에서 무엇을 먼저 권할지, 처음 하는 종목을 몇 kg에서 시작할지가 달라져요.
        </Text>
        <Text style={styles.note}>
          시작 무게는 몸무게도 알아야 권해 드려요. 몸무게는 기록 탭의 「신체 기록」에 적어요.
        </Text>
      </View>
    </ScrollView>
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
      {on && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  summaryText: { color: colors.text, fontSize: 15, lineHeight: 23, flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  // The app's one chip: 39 tall (NOTES, 「간격과 단추 크기의 법」).
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
  chipTextOn: { color: colors.accent, fontWeight: '800' },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xs,
  },
  counterValue: { color: colors.text, fontSize: 28, fontWeight: '800', minWidth: 72, textAlign: 'center' },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOff: { opacity: 0.4 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.md,
  },
  choiceOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  choiceBody: { flex: 1, gap: 2 },
  choiceLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  choiceLabelOn: { color: colors.accent },
  choiceDetail: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  note: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  effect: { color: colors.gold, fontSize: 13, lineHeight: 20 },
});
