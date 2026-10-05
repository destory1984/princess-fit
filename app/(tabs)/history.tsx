import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Insights } from '@/components/Insights';
import { ScreenState } from '@/components/ScreenState';
import { MonthCalendar } from '@/components/MonthCalendar';
import { explain } from '@/lib/dbError';
import { confirmAction, notify } from '@/lib/confirm';
import {
  closeAbandonedWorkouts,
  deleteWorkout,
  startWorkoutOn,
  listWorkoutDays,
  listWorkoutFacts,
  listWorkouts,
  listWorkoutsOn,
  writeDiaries,
  WORKOUT_PAGE,
  type WorkoutSummary,
} from '@/lib/db';
import { formatDate, localDayKey } from '@/lib/format';
import type { WorkoutFact } from '@/lib/gamification';
import type { Workout } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';
import { girlOf, useGirl } from '@/lib/girl';

function duration(workout: Workout) {
  if (!workout.ended_at) return '진행 중';
  const ms = new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime();
  // A session written down after the fact has no length — rounding that up to
  // a minute would be inventing the one number nobody recorded.
  if (ms < 60000) return '시간 미기록';
  return `${Math.round(ms / 60000)}분`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const girl = useGirl();
  const [workouts, setWorkouts] = useState<WorkoutSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<Set<string>>(new Set());
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  // The chosen day's sessions, asked for on their own: the pages read so far
  // may not reach back that far.
  const [dayList, setDayList] = useState<{ day: string; list: WorkoutSummary[] } | null>(null);
  // Whether an older page may exist, and whether one is on its way.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // How many are showing, so coming back to the tab keeps the place rather
  // than folding a long scroll back to the first page.
  const shownCount = useRef(WORKOUT_PAGE);
  const [facts, setFacts] = useState<WorkoutFact[]>([]);

  // Which parts were trained each day, so the calendar reads as a pattern.
  const dayGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const fact of facts) {
      const key = localDayKey(new Date(fact.started_at));
      map.set(key, [...new Set([...(map.get(key) ?? []), ...fact.groups])]);
    }
    return map;
  }, [facts]);

  const load = useCallback(() => {
    setError(null);
    listWorkoutFacts()
      .then(setFacts)
      .catch(() => {
        // The list below still works; only the reading is lost.
      });
    // Closed first, so a session forgotten last night is listed with the
    // length it actually had rather than as still running.
    closeAbandonedWorkouts()
      .catch(() => {})
      .then(() => Promise.all([listWorkouts(shownCount.current), listWorkoutDays()]))
      .then(([list, marked]) => {
        setWorkouts(list);
        setHasMore(list.length === shownCount.current);
        // Sessions from before the diary, or paid while it could not be
        // written, get their entry now — and the list is read again to show it.
        if (list.some((w) => w.ended_at && !w.diary && w.setCount > 0)) {
          void writeDiaries(girl.id).then((n) => {
            if (n > 0) listWorkouts(shownCount.current).then(setWorkouts).catch(() => {});
          });
        }
        setDays(new Set(marked.map((m) => m.day)));
      })
      .catch((e) => setError(e.message));
  }, [girl.id]);

  useFocusEffect(load);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    // On failure it falls back to what is loaded, right for any recent day.
    listWorkoutsOn(selected)
      .then((list) => alive && setDayList({ day: selected, list }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [selected, workouts]);

  const loadMore = useCallback(() => {
    if (!workouts || !hasMore || loadingMore) return;
    setLoadingMore(true);
    listWorkouts(WORKOUT_PAGE, workouts.length)
      .then((older) => {
        // By id, in case something was added at the top in between and
        // shifted a row across the page boundary.
        const seen = new Set(workouts.map((w) => w.id));
        const next = [...workouts, ...older.filter((w) => !seen.has(w.id))];
        shownCount.current = next.length;
        setWorkouts(next);
        setHasMore(older.length === WORKOUT_PAGE);
      })
      .catch((e) => notify('더 불러오지 못했어요', explain(e)))
      .finally(() => setLoadingMore(false));
  }, [workouts, hasMore, loadingMore]);

  function onScroll({ nativeEvent: e }: NativeSyntheticEvent<NativeScrollEvent>) {
    // A screen's height from the end, so the next page is there by the time
    // the thumb gets to the bottom.
    if (!selected && e.contentOffset.y + e.layoutMeasurement.height * 2 >= e.contentSize.height) {
      loadMore();
    }
  }

  const shown = useMemo(
    () =>
      selected
        ? dayList?.day === selected
          ? dayList.list
          : (workouts ?? []).filter((w) => localDayKey(new Date(w.started_at)) === selected)
        : (workouts ?? []),
    [workouts, selected, dayList]
  );

  /**
   * Write down a session that happened but was never logged.
   *
   * Offered only for a day already chosen on the calendar, and never for a day
   * that has not happened: a record of next Tuesday is not a missing record.
   */
  async function addPast(day: string) {
    try {
      const w = await startWorkoutOn(day, '기록하지 못한 운동');
      router.push(`/workout/${w.id}`);
    } catch (e: any) {
      notify('만들지 못했어요', explain(e));
    }
  }

  function confirmDelete(workout: Workout) {
    confirmAction(
      '기록 삭제',
      `${formatDate(workout.started_at)} "${workout.title}" 기록을 삭제할까요?`,
      async () => {
        try {
          await deleteWorkout(workout.id);
          load();
        } catch (e: any) {
          notify('삭제 실패', explain(e));
        }
      }
    );
  }

  // An empty calendar and "아직 기록이 없어요" are also what this screen holds
  // before it has asked, which is one flash per visit to the tab.
  if (!workouts) return <ScreenState error={error} onRetry={load} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      onScroll={onScroll}
      scrollEventThrottle={200}>
      <MonthCalendar
        month={month}
        markedDays={days}
        dayGroups={dayGroups}
        selected={selected}
        onSelect={(day) => setSelected((cur) => (cur === day ? null : day))}
        onShiftMonth={(delta) =>
          setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
        }
      />

      {/* Colour needs a key: six dots are never told apart by hue alone.
          Directly under the calendar it explains — below 신체 기록 it read as
          a stray label between two unrelated cards. */}
      <View style={styles.legend}>
        {[...new Set([...dayGroups.values()].flat())].slice(0, 6).map((group) => (
          <View key={group} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: muscleColor(group) }]} />
            <Text style={styles.legendText}>{group}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.tool} onPress={() => router.push('/body')}>
        <Ionicons name="body-outline" size={18} color={colors.accent} />
        <View style={styles.toolBody}>
          <Text style={styles.toolTitle}>신체 기록</Text>
          <Text style={styles.toolSub}>몸무게 · 체지방 · 골격근량</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      </Pressable>

      <Pressable style={styles.tool} onPress={() => router.push('/photos')}>
        <Ionicons name="camera-outline" size={18} color={colors.accent} />
        <View style={styles.toolBody}>
          <Text style={styles.toolTitle}>사진 기록</Text>
          <Text style={styles.toolSub}>이 폰에만 저장돼요</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      </Pressable>

      {/*
        Sleep is not offered until the phone can supply it.

        Typing last night's hours in by hand is a chore nobody keeps up for a
        week, and a chart built from three entered nights says nothing true
        about whether rest and training line up — which is the only question
        the screen exists to answer. The screen and its table stay; it is
        reachable at /sleep and from the bench, so the work is waiting rather
        than deleted, and what is already recorded is untouched.

        The door opens when Apple 건강 does.
      */}

      <Insights workouts={facts} limit={2} />

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {selected ? `${formatDate(`${selected}T00:00:00`)} 기록` : '전체 기록'}
        </Text>
        {selected && (
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.clear}>전체 보기</Text>
          </Pressable>
        )}
      </View>

      {selected && selected <= localDayKey(new Date()) && (
        <Pressable style={styles.addPast} onPress={() => addPast(selected)}>
          <Ionicons name="add" size={16} color={colors.accent} />
          <Text style={styles.addPastText}>이 날 운동 적기</Text>
        </Pressable>
      )}

      {shown.length === 0 ? (
        <Text style={styles.empty}>
          {selected ? '이 날은 기록이 없어요.' : '아직 기록이 없어요.'}
        </Text>
      ) : (
        shown.map((item) => (
          <Pressable
            key={item.id}
            style={styles.row}
            onPress={() =>
              router.push(
                item.ended_at
                  ? { pathname: '/summary/[id]', params: { id: item.id } }
                  : { pathname: '/workout/[id]', params: { id: item.id } }
              )
            }
            onLongPress={() => confirmDelete(item)}>
            <View style={styles.rowMain}>
              {/* Hers, in her hand — whoever was here when it was written. */}
              {item.diary && (
                <Text style={styles.diary}>
                  {item.diary}
                  <Text style={styles.diaryBy}> — {girlOf(item.diary_by ?? '').name}</Text>
                </Text>
              )}
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>
                {formatDate(item.started_at)}
                {item.setCount > 0 &&
                  ` · ${item.exerciseCount}종목 · ${item.setCount}세트 · ${item.volume.toLocaleString()}kg`}
              </Text>
            </View>
            <View style={styles.rowEnd}>
              <Text style={[styles.badge, !item.ended_at && styles.badgeActive]}>
                {duration(item)}
              </Text>
              <Pressable hitSlop={8} onPress={() => confirmDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={colors.textDim} />
              </Pressable>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </View>
          </Pressable>
        ))
      )}

      {!selected && loadingMore && <ActivityIndicator color={colors.accent} />}
      {!selected && !hasMore && (workouts?.length ?? 0) > WORKOUT_PAGE && (
        <Text style={styles.empty}>첫 기록까지 모두 보셨어요.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  diary: { color: colors.text, fontSize: 15, lineHeight: 22, fontStyle: 'italic', marginBottom: 4 },
  diaryBy: { color: colors.textDim, fontSize: 13, fontStyle: 'normal' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textDim, fontSize: 13 },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  toolBody: { flex: 1 },
  toolTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  toolSub: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  addPast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderColor: colors.accent,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  addPastText: { color: colors.accent, fontWeight: '700' },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  listTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  clear: { color: colors.accent, fontWeight: '600' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMain: { flex: 1, marginRight: spacing.md },
  rowTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  rowSub: { color: colors.textDim, marginTop: spacing.xs, fontSize: 14 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { color: colors.textDim, fontSize: 14 },
  badgeActive: { color: colors.success, fontWeight: '700' },
});
