import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ExerciseThumb } from '@/components/ExerciseThumb';
import { MuscleTag } from '@/components/MuscleTag';
import { NewExerciseSheet } from '@/components/NewExerciseSheet';
import { seedDefaultExercises } from '@/lib/catalog';
import { explain } from '@/lib/dbError';
import { notify } from '@/lib/confirm';
import { createExercise, setExerciseFavourite } from '@/lib/db';
import { sortByUsage, SORT_NAME, type Sort, type UsageMap } from '@/lib/exerciseUsage';
import { matchesAny } from '@/lib/hangul';
import { aliasesOf } from '@/lib/aliases';
import type { Place } from '@/lib/onboarding';
import { byPlace } from '@/lib/plan';
import { getPlace } from '@/lib/prefs';
import { EQUIPMENT, MUSCLE_GROUPS, type Exercise } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

type Props = {
  visible: boolean;
  exercises: Exercise[];
  /** How often and how recently each has been used, for the 최근/자주 tabs. */
  usage?: UsageMap;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  onSeeded?: () => void;
  /**
   * Offer to make the movement that was searched for and not found.
   *
   * Off where the picker only chooses among what has a history (the stats
   * screen): a movement made there would have nothing to show.
   */
  creatable?: boolean;
};

export function ExercisePicker({
  visible,
  exercises,
  usage,
  onSelect,
  onClose,
  onSeeded,
  creatable = false,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('all');
  // Stars changed in this sheet, before the parent reloads its exercises.
  const [starred, setStarred] = useState<Map<string, boolean>>(new Map());
  const [group, setGroup] = useState<string | null>(null);
  const [gear, setGear] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  // Where they said they train. Null until storage answers, and null means the
  // list is left exactly as it was — no guess, no flicker into a new order.
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    let alive = true;
    getPlace().then((stored) => alive && stored && setPlace(stored));
    return () => {
      alive = false;
    };
  }, []);

  const withStars = useMemo(
    () =>
      exercises.map((e) =>
        starred.has(e.id) ? { ...e, favourite: starred.get(e.id)! } : e
      ),
    [exercises, starred]
  );

  const filtered = useMemo(
    () =>
      withStars.filter(
        (e) =>
          // Put away stays put away, unless it is what you searched for. A
          // hidden movement that cannot be found by name is a deleted one
          // wearing a different word, and nobody agreed to that.
          (!e.hidden || query.trim() !== '') &&
          (group === null || e.muscle_group === group) &&
          (gear === null || e.equipment === gear) &&
          // ㅂㅂㅂㅊㅍㄹㅅ finds 바벨 벤치 프레스. Nobody types sixty-seven
          // Korean names out in full on a phone, and a box that refuses the
          // initials reads as broken rather than as strict.
          // The other names people call it by are searched too, but never
          // shown: 「랫풀」 and 「lat pulldown」 both find 랫 풀다운, and the card
          // still reads 랫 풀다운 so nobody has to learn a second vocabulary
          // to read their own history back.
          matchesAny(
            [
              e.name,
              ...aliasesOf(e.name),
              e.muscle_detail,
              e.muscle_group,
              e.secondary_group,
              e.equipment,
            ],
            query
          )
      ),
    [withStars, query, group, gear]
  );

  // Sixty-seven movements sorted by name asks you to remember what yours are
  // called. Most sessions reuse a handful; put those within reach — and then,
  // for someone who said 집, put what a room without a rack can do above what
  // it cannot. Reordered rather than filtered: a picker that has quietly
  // forgotten the squat rack is one you stop trusting the first time you
  // visit a gym.
  const shown = useMemo(
    () => byPlace(sortByUsage(filtered, usage ?? new Map(), sort), place),
    [filtered, usage, sort, place]
  );

  /**
   * Star an exercise. Updated on screen first: the list is the only feedback
   * that the tap landed, and waiting on the server makes a heart feel broken.
   */
  function toggleFavourite(exercise: Exercise) {
    const next = !exercise.favourite;
    setStarred((prev) => new Map(prev).set(exercise.id, next));
    setExerciseFavourite(exercise.id, next).catch((e: any) => {
      notify('저장 실패', explain(e));
      setStarred((prev) => {
        const back = new Map(prev);
        back.delete(exercise.id);
        return back;
      });
    });
  }

  function close() {
    setQuery('');
    setSort('all');
    setGroup(null);
    setGear(null);
    onClose();
  }

  /**
   * Make it and put it on the board in one go.
   *
   * Someone who typed a name, found nothing and made it wants to do it now —
   * sending them back to search for what they just wrote is a second errand.
   * The parent is told to reload first, so the new movement has a name on the
   * card it is about to appear on.
   */
  async function create(name: string, muscle: string, equipment: string, track: Exercise['track_type']) {
    try {
      const made = await createExercise(name, muscle, equipment, track);
      onSeeded?.();
      close();
      onSelect(made);
    } catch (e: any) {
      notify('추가 실패', explain(e));
      // Thrown on, so the sheet keeps what was typed.
      throw e;
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      await seedDefaultExercises();
      onSeeded?.();
    } catch (e: any) {
      notify('불러오기 실패', explain(e));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>어떤 운동을 하시겠어요?</Text>

          {exercises.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>아직 종목이 없어요</Text>
              <Text style={styles.emptyText}>
                벤치프레스, 스쿼트 같은 기본 종목을{'\n'}한 번에 불러올 수 있어요.
              </Text>
              <Pressable
                style={[styles.seedButton, seeding && styles.disabled]}
                disabled={seeding}
                onPress={seed}>
                {seeding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.seedButtonText}>기본 종목 불러오기</Text>

                )}
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.search}
                placeholder="이름 · 부위 · 기구 · 초성 · 랫풀/bench"
                placeholderTextColor={colors.textDim}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              <View style={styles.chipRow}>
                {(['all', 'favourite', 'recent', 'often'] as Sort[]).map((s) => (
                  <Chip
                    key={s}
                    label={SORT_NAME[s]}
                    active={sort === s}
                    onPress={() => setSort(s)}
                  />
                ))}
              </View>
              <Text style={styles.filterLabel}>부위</Text>
              <View style={styles.chipRow}>
                <Chip label="전체" active={group === null} onPress={() => setGroup(null)} />
                {MUSCLE_GROUPS.map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    color={muscleColor(g)}
                    active={group === g}
                    onPress={() => setGroup(g)}
                  />
                ))}
              </View>
              <Text style={styles.filterLabel}>기구</Text>
              <View style={styles.chipRow}>
                <Chip label="전체" active={gear === null} onPress={() => setGear(null)} />
                {EQUIPMENT.map((g) => (
                  <Chip key={g} label={g} active={gear === g} onPress={() => setGear(g)} />
                ))}
              </View>
              <FlatList
                style={styles.results}
                data={shown}
                keyExtractor={(e) => e.id}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={8}
                windowSize={5}
                // Under whatever was found, not only when nothing was: 「한발
                // 데드」 finds 데드리프트, which is a result and still not the
                // movement that was typed.
                ListFooterComponent={
                  creatable && query.trim() !== '' ? (
                    <Pressable style={styles.create} onPress={() => setCreating(true)}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                      <Text style={styles.createText}>「{query.trim()}」 직접 만들기</Text>
                    </Pressable>
                  ) : null
                }
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {sort === 'all'
                      ? '검색 결과가 없어요.'
                      : sort === 'favourite'
                        ? '♥를 눌러 자주 쓰는 종목을 모아두세요.'
                        : `${SORT_NAME[sort]}에 넣을 기록이 아직 없어요. 한 번 해보면 여기 쌓여요.`}
                  </Text>
                }
                renderItem={({ item: e }) => (
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      close();
                      onSelect(e);
                    }}>
                    <View
                      style={[styles.stripe, { backgroundColor: muscleColor(e.muscle_group) }]}
                    />
                    <ExerciseThumb exercise={e} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowText}>{e.name}</Text>
                      {!!e.muscle_detail && (
                        <Text style={styles.rowSub}>
                          {e.muscle_detail} · {e.equipment}
                        </Text>
                      )}
                    </View>
                    <MuscleTag group={e.muscle_group} />
                    <Pressable hitSlop={8} onPress={() => toggleFavourite(e)}>
                      <Ionicons
                        name={e.favourite ? 'heart' : 'heart-outline'}
                        size={18}
                        color={e.favourite ? colors.accent : colors.faint}
                      />
                    </Pressable>
                  </Pressable>
                )}
              />
            </>
          )}
        </Pressable>
      </Pressable>
      {/* Mounted only while open, so it starts from what is in the search box now. */}
      {creating && (
        <NewExerciseSheet
          visible
          initialName={query.trim()}
          onCreate={create}
          onClose={() => setCreating(false)}
        />
      )}
    </Modal>
  );
}

function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  const tint = color ?? colors.accent;
  return (
    <Pressable
      style={[styles.chip, active && { backgroundColor: `${tint}26`, borderColor: tint }]}
      onPress={onPress}>
      <Text style={[styles.chipText, active && { color: tint, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  createText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: '#000B', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    // Fixed, not max: a shrinking result list must not move the search box.
    height: '82%',
  },
  results: { flex: 1 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  search: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  stripe: { width: 4, height: 44, borderRadius: 2 },
  rowBody: { flex: 1 },
  rowText: { color: colors.text, fontSize: 16 },
  rowSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  filterLabel: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.textDim, textAlign: 'center', lineHeight: 20 },
  seedButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  seedButtonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
