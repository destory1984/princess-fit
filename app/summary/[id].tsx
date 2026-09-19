import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { AdviceCard } from '@/components/AdviceCard';
import { BodyMap, workedParts } from '@/components/BodyMap';
import { OrnateFrame } from '@/components/OrnateFrame';
import { notify } from '@/lib/confirm';
import {
  getActiveWorkout,
  getWorkoutDetail,
  listWorkoutFacts,
  repeatWorkout,
  type WorkoutDetailExercise,
} from '@/lib/db';
import { formatDate, formatDuration } from '@/lib/format';
import { computeStats } from '@/lib/character';
import { summarise, workoutXp, type WorkoutFact } from '@/lib/gamification';
import type { Workout } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

const CHEERS = ['오늘도 해냈다', '어제의 나를 이겼다', '기록은 거짓말을 안 한다', '한 칸 더 올라감'];

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const card = useRef<View>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [items, setItems] = useState<WorkoutDetailExercise[]>([]);
  const [fact, setFact] = useState<WorkoutFact | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof summarise> | null>(null);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([getWorkoutDetail(id), listWorkoutFacts()])
      .then(([detail, facts]) => {
        setWorkout(detail.workout);
        setItems(detail.items);
        setFact(facts.find((f) => f.id === id) ?? null);
        setFacts(facts);
        setSummary(summarise(facts));
      })
      .catch((e) => notify('불러오기 실패', e.message));
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

  if (!workout || !fact || !summary) return <View style={styles.screen} />;

  const worked = workedParts(items.flatMap((i) => i.exercise ?? []));
  const doneSets = items.reduce((sum, i) => sum + i.sets.filter((s) => s.done).length, 0);
  const minutes = workout.ended_at
    ? Math.max(1, Math.round((+new Date(workout.ended_at) - +new Date(workout.started_at)) / 60000))
    : 0;
  const cheer = CHEERS[new Date(workout.started_at).getDate() % CHEERS.length];
  const best = items
    .filter((i) => i.topWeight > 0)
    .sort((a, b) => b.estimatedOneRm - a.estimatedOneRm)[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View ref={card} collapsable={false}>
        <OrnateFrame style={styles.card}>
        <Text style={styles.date}>{formatDate(workout.started_at)}</Text>
        <Text style={styles.cheer}>💪 {cheer}</Text>
        <Text style={styles.title}>{workout.title}</Text>

        <View style={styles.statRow}>
          <Stat value={fact.volume.toLocaleString()} unit="kg" label="총 무게" />
          <Stat value={String(doneSets)} unit="세트" label="완료" />
          <Stat value={String(minutes)} unit="분" label="걸린 시간" />
        </View>

        {worked.length > 0 && (
          <View style={styles.body}>
            <BodyMap data={worked} scale={0.62} labels={false} />
          </View>
        )}

        <View style={styles.badgeRow}>
          <Pill icon="flash" text={`+${workoutXp(fact)} XP`} tint={colors.accent} />
          <Pill icon="ribbon" text={`Lv.${summary.level} ${summary.title}`} tint={colors.success} />
          {summary.streak > 1 && (
            <Pill icon="flame" text={`${summary.streak}일 연속`} tint={colors.danger} />
          )}
        </View>

        {best && (
          <Text style={styles.highlight}>
            오늘의 한 방 · {best.exercise?.name} {best.topWeight}kg (예상 1RM{' '}
            {best.estimatedOneRm}kg)
          </Text>
        )}
        {fact.durationSec > 0 && (
          <Text style={styles.highlight}>
            유산소 {formatDuration(fact.durationSec)}
            {fact.distanceKm > 0 && ` · ${fact.distanceKm}km`}
          </Text>
        )}

          <Text style={styles.brand}>Refit</Text>
        </OrnateFrame>
      </View>

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

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Pill({ icon, text, tint }: { icon: string; text: string; tint: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${tint}26`, borderColor: `${tint}66` }]}>
      <Ionicons name={icon as any} size={13} color={tint} />
      <Text style={[styles.pillText, { color: tint }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  card: { gap: spacing.sm },
  date: { color: colors.textDim, fontSize: 13 },
  cheer: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '800' },
  statUnit: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  body: { marginVertical: spacing.md },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  pillText: { fontWeight: '700', fontSize: 12 },
  highlight: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs },
  brand: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'right',
    marginTop: spacing.md,
  },
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
