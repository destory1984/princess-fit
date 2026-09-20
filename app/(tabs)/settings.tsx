import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { NudgeSetting } from '@/components/NudgeSetting';
import { Portrait } from '@/components/Portrait';
import { notify } from '@/lib/confirm';
import { listExercises } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { GOALS, PLACES, type Goal, type Place } from '@/lib/onboarding';
import { getGoal, getPlace, getWeeklyGoal } from '@/lib/prefs';
import { colors, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';

const goalLabel = (goal: Goal) => GOALS.find((g) => g.id === goal)!.label;
const placeLabel = (place: Place) => PLACES.find((p) => p.id === place)!.label;

export default function SettingsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  // Anyone who was using the app before the greeting existed never answered
  // these, and nothing on screen said so — the picker quietly went unordered
  // and the findings quietly went unranked. The row says which it is.
  const [plan, setPlan] = useState<{
    days: number;
    goal: Goal | null;
    place: Place | null;
  } | null>(null);

  const girl = useGirl();

  useFocusEffect(
    useCallback(() => {
      listExercises()
        .then((list) => setCount(list.length))
        .catch((e) => notify('불러오기 실패', e.message));
      Promise.all([getWeeklyGoal(), getGoal(), getPlace()]).then(([days, goal, place]) =>
        setPlan({ days, goal, place })
      );
    }, [])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.row} onPress={() => router.push('/settings/girl')}>
        <Portrait source={girl.base} size={48} />
        <View style={styles.body}>
          <Text style={styles.title}>함께 지낼 아이</Text>
          <Text style={styles.sub}>{girl.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </Pressable>

      <Pressable style={styles.row} onPress={() => router.push('/settings/plan')}>
        <View style={styles.icon}>
          <Ionicons name="flag-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>내 계획</Text>
          <Text style={styles.sub}>
            {plan === null
              ? '불러오는 중…'
              : plan.goal && plan.place
                ? `주 ${plan.days}회 · ${placeLabel(plan.place)} · ${goalLabel(plan.goal)}`
                : `주 ${plan.days}회 · 운동하는 곳과 목표는 아직이에요`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </Pressable>

      <Pressable style={styles.row} onPress={() => router.push('/settings/exercises')}>
        <View style={styles.icon}>
          <Ionicons name="barbell-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>운동 종목</Text>
          <Text style={styles.sub}>
            {count === null ? '세는 중…' : `${count}개 · 추가하고 지우기`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </Pressable>

      <NudgeSetting />

      <Pressable style={styles.row} onPress={() => router.push('/achievements')}>
        <View style={styles.icon}>
          <Ionicons name="trophy-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>연대기</Text>
          <Text style={styles.sub}>성장 기록과 업적 보기</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.account}>{session?.user.email}</Text>
        <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  sub: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  footer: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  account: { color: colors.textDim },
  logout: { padding: spacing.md },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
