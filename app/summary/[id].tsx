import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { AdviceCard } from '@/components/AdviceCard';
import { BragCard } from '@/components/BragCard';
import { ScreenState } from '@/components/ScreenState';
import { notify } from '@/lib/confirm';
import {
  getActiveWorkout,
  getWorkoutDetail,
  listWorkoutFacts,
  repeatWorkout,
  type WorkoutDetailExercise,
} from '@/lib/db';
import { formatDate } from '@/lib/format';
import { computeStats } from '@/lib/character';
import { summarise, type WorkoutFact } from '@/lib/gamification';
import type { Workout } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const card = useRef<View>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [items, setItems] = useState<WorkoutDetailExercise[]>([]);
  const [fact, setFact] = useState<WorkoutFact | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof summarise> | null>(null);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    Promise.all([getWorkoutDetail(id), listWorkoutFacts()])
      .then(([detail, facts]) => {
        setWorkout(detail.workout);
        setItems(detail.items);
        setFact(facts.find((f) => f.id === id) ?? null);
        setFacts(facts);
        setSummary(summarise(facts));
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useFocusEffect(load);

  // Must be stable: AdviceCard refetches whenever this object's identity changes.
  const adviceContext = useMemo(
    () =>
      fact && summary
        ? { today: fact, history: facts, stats: computeStats(facts), streak: summary.streak }
        : null,
    [fact, facts, summary]
  );

  async function repeat() {
    if (!id) return;
    try {
      const active = await getActiveWorkout();
      if (active) {
        notify('진행 중인 운동이 있어요', '먼저 마무리해 주세요.');
        router.push({ pathname: '/workout/[id]', params: { id: active.id } });
        return;
      }
      const created = await repeatWorkout(id);
      router.replace({ pathname: '/workout/[id]', params: { id: created.id } });
    } catch (e: any) {
      notify('다시 하기 실패', e.message);
    }
  }

  async function share() {
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1 });
      if (Platform.OS === 'web') {
        // Sharing is unavailable in the browser, so hand over a download.
        const link = document.createElement('a');
        link.href = uri;
        link.download = `refit-${formatDate(workout!.started_at).replace(/\./g, '')}.png`;
        link.click();
        return;
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else notify('공유를 쓸 수 없어요', '이미지는 저장되었어요.');
    } catch (e: any) {
      notify('저장 실패', e.message);
    }
  }

  if (!workout || !fact || !summary) return <ScreenState error={error} onRetry={load} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BragCard ref={card} workout={workout} items={items} fact={fact} summary={summary} />

      {adviceContext && <AdviceCard context={adviceContext} />}

      <Pressable style={styles.repeat} onPress={repeat}>
        <Ionicons name="repeat" size={18} color={colors.accent} />
        <Text style={styles.repeatText}>이 운동 그대로 다시 하기</Text>
      </Pressable>

      <Pressable style={styles.share} onPress={share}>
        <Ionicons name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={18} color="#fff" />
        <Text style={styles.shareText}>
          {Platform.OS === 'web' ? '이미지로 저장하기' : '이미지로 자랑하기'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        <Text style={styles.secondaryText}>닫기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.textDim, textAlign: 'center' },
  repeat: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  repeatText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  share: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  shareText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryText: { color: colors.textDim, fontWeight: '600' },
});
