import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { ScreenState } from '@/components/ScreenState';
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
import {
  getGoal,
  getPlace,
  getWeeklyGoal,
  setGoal,
  setPlace,
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

  const load = useCallback(() => {
    let alive = true;
    Promise.all([getWeeklyGoal(), getGoal(), getPlace()]).then(([days, g, p]) => {
      if (!alive) return;
      setPerWeek(days);
      setChosenGoal(g);
      setChosenPlace(p);
    });
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
      notify('저장 실패', e.message);
      setPerWeek(previous);
    }
  }

  async function changeGoal(next: Goal) {
    const previous = goal;
    setChosenGoal(next);
    try {
      await setGoal(next);
    } catch (e: any) {
      notify('저장 실패', e.message);
      setChosenGoal(previous);
    }
  }

  async function changePlace(next: Place) {
    const previous = place;
    setChosenPlace(next);
    try {
      await setPlace(next);
    } catch (e: any) {
      notify('저장 실패', e.message);
      setChosenPlace(previous);
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
  summaryText: { color: colors.text, fontSize: 13, lineHeight: 20, flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
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
  choiceLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  choiceLabelOn: { color: colors.accent },
  choiceDetail: { color: colors.textDim, fontSize: 11, lineHeight: 16 },
  note: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  effect: { color: colors.gold, fontSize: 11, lineHeight: 17 },
});
