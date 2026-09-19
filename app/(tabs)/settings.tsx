import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Portrait } from '@/components/Portrait';
import { notify } from '@/lib/confirm';
import { listExercises } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAdvisor } from '@/lib/useAdvisor';
import { portraitOf } from '@/lib/portraits';
import { colors, radius, spacing } from '@/lib/theme';

export default function SettingsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const advisor = useAdvisor();
  const [count, setCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      listExercises()
        .then((list) => setCount(list.length))
        .catch((e) => notify('불러오기 실패', e.message));
    }, [])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.row} onPress={() => router.push('/settings/advisor')}>
        <Portrait source={portraitOf(advisor.id)} size={48} />
        <View style={styles.body}>
          <Text style={styles.title}>함께할 사람</Text>
          <Text style={styles.sub}>
            {advisor.name} · {advisor.title}
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

      <Pressable style={styles.row} onPress={() => router.push('/achievements')}>
        <View style={styles.icon}>
          <Ionicons name="trophy-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>수련부</Text>
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
