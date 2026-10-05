import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MuscleTag } from '@/components/MuscleTag';
import { NewExerciseSheet } from '@/components/NewExerciseSheet';
import { ScreenState } from '@/components/ScreenState';
import { seedDefaultExercises } from '@/lib/catalog';
import { DEFAULT_EXERCISES } from '@/lib/exerciseCatalog';
import { explain } from '@/lib/dbError';
import { confirmAction, notify } from '@/lib/confirm';
import {
  countExerciseSets,
  createExercise,
  deleteExercise,
  listExercises,
  setAllExercisesHidden,
  setExerciseHidden,
} from '@/lib/db';
import { EQUIPMENT, MUSCLE_GROUPS, type Exercise, type TrackType } from '@/lib/types';
import { aliasesOf } from '@/lib/aliases';
import { matchesAny } from '@/lib/hangul';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

export default function ExercisesScreen() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [gear, setGear] = useState<string | null>(null);
  // null = both. Worth having because the list is where someone goes to find
  // what they put away, and 「꺼진 것만」 is the fastest way back to it.
  const [showing, setShowing] = useState<'on' | 'off' | null>(null);

  const load = useCallback(() => {
    setError(null);
    listExercises()
      .then(setExercises)
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  /*
    What the list is showing right now.

    The same search the picker uses, so 「랫풀」 and 「ㅅㅋㅌ」 and 「bench」 all
    work here too — a catalogue of seventy-odd is past the point where
    scrolling is a way to find anything.
  */
  const visible = (exercises ?? []).filter(
    (e) =>
      (group === null || e.muscle_group === group) &&
      (gear === null || e.equipment === gear) &&
      (showing === null || (showing === 'off' ? !!e.hidden : !e.hidden)) &&
      matchesAny(
        [e.name, ...aliasesOf(e.name), e.muscle_detail, e.muscle_group, e.equipment],
        query
      )
  );
  const filtered =
    query.trim() !== '' || group !== null || gear !== null || showing !== null;

  /**
   * Thrown rather than swallowed, so the sheet can keep what was typed when
   * the save fails and close only when it did not.
   */
  async function add(name: string, group: string, gear: string, track: TrackType) {
    try {
      await createExercise(name, group, gear, track);
      load();
    } catch (e: any) {
      notify('추가 실패', explain(e));
      throw e;
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const { added, updated } = await seedDefaultExercises();
      const parts = [
        added ? `${added}개 추가` : '',
        updated ? `${updated}개 정보 갱신` : '',
      ].filter(Boolean);
      notify(parts.length ? parts.join(' · ') : '이미 최신 상태예요.');
      load();
    } catch (e: any) {
      notify('채우지 못했어요', explain(e));
    } finally {
      setSeeding(false);
    }
  }

  /**
   * Every switch at once.
   *
   * Useful in both directions and for opposite reasons: someone training at
   * home turns the lot off and puts back the six they can actually do, and
   * someone who over-pruned puts it all back rather than hunting for what
   * they lost.
   *
   * It sweeps what is on screen, not the catalogue. With a filter up 「전부」
   * means these eight cable movements, which is both what it looks like and
   * the more useful of the two.
   */
  async function sweep(hidden: boolean) {
    const ids = new Set(visible.map((e) => e.id));
    if (ids.size === 0) return;
    setSweeping(true);
    setExercises((prev) =>
      prev
        ? prev.map((e) =>
            ids.has(e.id) ? { ...e, hidden, favourite: hidden ? false : e.favourite } : e
          )
        : prev
    );
    try {
      await setAllExercisesHidden(hidden, filtered ? [...ids] : undefined);
    } catch (e: any) {
      notify('저장 실패', explain(e));
      load();
    } finally {
      setSweeping(false);
    }
  }

  /**
   * Flip a movement in or out of the pickers.
   *
   * The row moves first and the write follows: a switch that waits on the
   * network before it moves reads as one that did not take the tap, and this
   * is a list people flip several of in a row.
   */
  function toggleHidden(exercise: Exercise, hidden: boolean) {
    setExercises((prev) =>
      prev
        ? prev.map((e) =>
            e.id === exercise.id
              ? { ...e, hidden, favourite: hidden ? false : e.favourite }
              : e
          )
        : prev
    );
    setExerciseHidden(exercise.id, hidden).catch((e: any) => {
      notify('저장 실패', explain(e));
      load();
    });
  }

  async function confirmDelete(exercise: Exercise) {
    let setCount = 0;
    try {
      setCount = await countExerciseSets(exercise.id);
    } catch (e: any) {
      notify('확인 실패', explain(e));
      return;
    }
    const warning = setCount
      ? `\n\n되돌릴 수 없어요. 이 종목으로 기록한 ${setCount}개 세트도 함께 지워져요.`
      : '\n\n되돌릴 수 없어요.';
    confirmAction('종목 삭제', `"${exercise.name}"을 삭제할까요?${warning}`, async () => {
      try {
        await deleteExercise(exercise.id);
        load();
      } catch (e: any) {
        notify('삭제 실패', explain(e));
      }
    });
  }

  // An empty list is also what this screen holds before it has asked, and
  // after a failed ask — and here that reads as "you have no exercises",
  // one tap away from a button offering to seed them all again.
  if (!exercises) return <ScreenState error={error} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {/*
              Its own sheet, not a block above the list.

              The list is what people come to this screen for; making a
              movement by hand is the rare thing, and it was taking the top of
              the screen every time. Three rows of unlabelled chips above the
              thing you actually came for earns 「이건 뭐야?」, which is what
              they got.
            */}
            <Pressable style={styles.newButton} onPress={() => setMaking(true)}>
              <Text style={styles.newButtonText}>＋ 새 종목 직접 만들기</Text>
            </Pressable>

            {/*
              The other half of a missing movement. Making one by hand solves
              it for one person; asking is how the catalogue gets it for
              everybody, and this is the screen where somebody has just found
              out theirs is not here.
            */}
            <Pressable
              style={styles.newButton}
              onPress={() => router.push('/settings/requests')}>
              <Text style={styles.newButtonText}>없는 운동 넣어달라고 하기</Text>
            </Pressable>

            {/*
              The label alone got asked 「이건 뭐야」, and then 「서버에서
              불러온다는 얘기지?」 — which it is not. The seventy-one movements
              ship inside the app; the button copies the missing ones into this
              account's own rows and fetches nothing. 「불러오기」 says download
              to anyone who reads it, so it says 채우기 instead.
            */}
            <Pressable
              style={[styles.seedButton, seeding && styles.disabled]}
              disabled={seeding}
              onPress={seed}>
              <Text style={styles.seedButtonText}>
                {seeding ? '채우는 중…' : '기본 종목 채우기'}
              </Text>
              {!seeding && (
                <Text style={styles.seedButtonSub}>
                  앱에 들어 있는 기본 {DEFAULT_EXERCISES.length}종목 중 빠진 것만 채워요.{'\n'}
                  직접 만드신 종목과 지금 설정은 그대로예요.
                </Text>
              )}
            </Pressable>
            {/*
              The pair sits together on purpose. 「전부 끄기」 sweeps seventy
              switches, and the only thing that makes that safe to press is
              seeing its undo in the same breath — so neither one asks 정말요.
            */}
            <View style={styles.bulkRow}>
              <Pressable
                style={[styles.bulk, sweeping && styles.disabled]}
                disabled={sweeping}
                onPress={() => sweep(true)}>
                <Text style={styles.bulkText}>{filtered ? '보이는 것 전부 끄기' : '전부 끄기'}</Text>
              </Pressable>
              <Pressable
                style={[styles.bulk, sweeping && styles.disabled]}
                disabled={sweeping}
                onPress={() => sweep(false)}>
                <Text style={styles.bulkText}>{filtered ? '보이는 것 전부 켜기' : '전부 켜기'}</Text>
              </Pressable>
            </View>
            {/*
              Search and filters, above the list and below the buttons that
              change it. Seventy-odd movements is well past the point where
              scrolling finds anything, and this is the screen where someone
              is hunting for one particular row to flip.
            */}
            <TextInput
              style={styles.search}
              placeholder="이름 · 부위 · 기구 · 초성(ㅂㅊ) · 줄임말(랫풀)"
              placeholderTextColor={colors.textDim}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />

            <View style={styles.chipRow}>
              {MUSCLE_GROUPS.map((g) => (
                <Pressable
                  key={g}
                  style={[
                    styles.chip,
                    group === g && {
                      backgroundColor: `${muscleColor(g)}26`,
                      borderColor: muscleColor(g),
                    },
                  ]}
                  onPress={() => setGroup(group === g ? null : g)}>
                  <Text
                    style={[
                      styles.chipText,
                      group === g && { color: muscleColor(g), fontWeight: '700' },
                    ]}>
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.chipRow}>
              {EQUIPMENT.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.chip, gear === g && styles.chipOn]}
                  onPress={() => setGear(gear === g ? null : g)}>
                  <Text style={[styles.chipText, gear === g && styles.chipTextOn]}>{g}</Text>
                </Pressable>
              ))}
              {/* The fastest way back to something put away. */}
              <Pressable
                style={[styles.chip, showing === 'off' && styles.chipOn]}
                onPress={() => setShowing(showing === 'off' ? null : 'off')}>
                <Text style={[styles.chipText, showing === 'off' && styles.chipTextOn]}>
                  꺼진 것만
                </Text>
              </Pressable>
              {filtered && (
                <Pressable
                  style={styles.chip}
                  onPress={() => {
                    setQuery('');
                    setGroup(null);
                    setGear(null);
                    setShowing(null);
                  }}>
                  <Text style={styles.chipText}>조건 지우기</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.hint}>
              종목을 누르면 하는 법과 내 기록을 볼 수 있어요.{'\n'}
              스위치를 끄면 고를 때 안 보여요. 기록은 그대로 남아요.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          /*
            The row is a plain View and only its left half is pressable.

            It used to be one Pressable wrapping everything, switch included,
            so a tap meant for the switch travelled on to the row underneath
            and opened 걷기's how-to instead. Nesting one pressable inside
            another does not reliably stop that on the web, where a click
            bubbles; separating them does, on every platform.
          */
          <View style={styles.row}>
            <Pressable
              style={styles.rowTap}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } })}
              onLongPress={() => confirmDelete(item)}>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, item.hidden && styles.putAway]}>{item.name}</Text>
                <Text style={styles.rowSub}>
                  {/*
                    This list is the whole catalogue, hidden ones included —
                    it is where someone comes to find what they put away and
                    take it back out. The picker is where they stay out of sight.
                  */}
                  {item.muscle_detail ? `${item.muscle_detail} · ` : ''}
                  {item.equipment}
                </Text>
              </View>
              <MuscleTag group={item.muscle_group} />
            </Pressable>
            {/*
              On or off, here, where the whole catalogue is in front of you.
              Putting a movement away was buried at the bottom of its own
              detail screen, three taps from the place someone actually decides
              they never want to see a cable movement again.

              The bin used to sit here too and does not any more. Turning a
              movement off is what this list is for; deleting takes every set
              ever logged with it, which is a different and much rarer
              intention. It is still reachable by holding the row, and stated
              plainly on the movement's own screen.
            */}
            <Switch
              value={!item.hidden}
              onValueChange={(on) => toggleHidden(item, !on)}
              trackColor={{ true: colors.accent }}
            />
          </View>
        )}
      />

      <NewExerciseSheet
        visible={making}
        onCreate={add}
        onClose={() => setMaking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.textDim },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipTextOn: { color: colors.accent, fontWeight: '700' },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
  fieldLabel: { color: colors.textDim, fontSize: 14, marginTop: spacing.sm },
  // Quiet, like the one under it. Neither of these is the thing this screen
  // is for, and a red button says press me before anyone has read it.
  newButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  newButtonText: { color: colors.text, fontWeight: '600' },
  seedButtonSub: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 2,
  },
  seedButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  seedButtonText: { color: colors.text, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  bulkRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  bulk: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  bulkText: { color: colors.textDim, fontSize: 15, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 14 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  putAway: { color: colors.textDim },
  rowSub: { color: colors.textDim, fontSize: 14, marginTop: 2 },
});
