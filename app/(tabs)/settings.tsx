import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View, Text as PlainText } from 'react-native';
import { Slider } from '@/components/Slider';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { NudgeSetting } from '@/components/NudgeSetting';
import { Portrait } from '@/components/Portrait';
import { hasDirectServer } from '@/lib/advice';
import { ringBell, wakeBell } from '@/lib/bell';
import { BELLS, DEFAULT_BELL, type BellKind } from '@/lib/bellKind';
import { explain } from '@/lib/dbError';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmAction, notify } from '@/lib/confirm';
import { deleteMyAccount, getLedger, listExercises, saveHousehold } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { GOALS, PLACES, type Goal, type Place } from '@/lib/onboarding';
import {
  getAdviceByModel,
  getAskRoutine,
  getBell,
  setBell,
  getGoal,
  getPlace,
  getWeeklyGoal,
  setAdviceByModel,
  setAskRoutine,
} from '@/lib/prefs';
import { colors, radius, spacing } from '@/lib/theme';
import {
  MAX_TEXT_SCALE,
  MIN_TEXT_SCALE,
  scaledSize,
  TEXT_SCALE_MARKS,
  TEXT_SCALE_STEP,
} from '@/lib/textScale';
import { changeTextScale, useTextScale } from '@/lib/textScaleStore';
import { APP_VERSION } from '@/lib/version';
import { CHANGELOG } from '@/lib/changelog';
import { useGirl } from '@/lib/girl';

const goalLabel = (goal: Goal) => GOALS.find((g) => g.id === goal)!.label;
const placeLabel = (place: Place) => PLACES.find((p) => p.id === place)!.label;

const TABS = [
  { id: '운동' },
  { id: '아이' },
  { id: '앱' },
] as const;

export default function SettingsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  // Anyone who was using the app before the greeting existed never answered
  // these, and nothing on screen said so — the picker quietly went unordered
  // and the findings quietly went unranked. The row says which it is.
  const [granting, setGranting] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('운동');
  const textScale = useTextScale();
  // Where the thumb is while it is being dragged. The app itself changes size only
  // when the finger lifts: growing the screen under a moving finger moves the track.
  const [draft, setDraft] = useState<number | null>(null);
  const shownScale = draft ?? textScale;
  const [leaving, setLeaving] = useState(false);

  /**
   * Leaving for good. Asked twice, and the first time it points at the export:
   * the records are the one thing here that cannot be made again.
   *
   * What the phone kept goes too — the chosen girl, the unsent writes, the
   * cached advice. Left behind, the next account on this phone would open
   * into someone else's leftovers.
   */
  function leave() {
    confirmAction(
      '계정 지우기',
      '운동 기록, 아이와의 기억, 친구까지 모두 지워져요. 남겨 두고 싶으면 먼저 「기록 백업」에서 내보내 두세요.',
      () =>
        confirmAction('정말 지울까요?', '되돌릴 수 없어요.', async () => {
          setLeaving(true);
          try {
            await deleteMyAccount();
            await supabase.auth.signOut().catch(() => {});
            await AsyncStorage.clear().catch(() => {});
          } catch (e: any) {
            notify('지우지 못했어요', explain(e));
          } finally {
            setLeaving(false);
          }
        }),
    );
  }
  const [askRoutine, setAskRoutineState] = useState(true);
  const [bell, setBellState] = useState<BellKind>(DEFAULT_BELL);
  const [byModel, setByModelState] = useState(true);
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
        .catch((e) => notify('불러오기 실패', explain(e)));
      Promise.all([getWeeklyGoal(), getGoal(), getPlace()]).then(([days, goal, place]) =>
        setPlan({ days, goal, place })
      );
      getAskRoutine().then(setAskRoutineState).catch(() => {});
      getBell().then(setBellState).catch(() => {});
      getAdviceByModel().then(setByModelState).catch(() => {});
    }, [])
  );

  /** Dev-only: top the purse up so the shop can be exercised. */
  async function grant() {
    setGranting('넣는 중…');
    try {
      const { house } = await getLedger();
      await saveHousehold({ ...house, gold: house.gold + 1000 });
      setGranting(`${(house.gold + 1000).toLocaleString()} G`);
    } catch (e: any) {
      setGranting(null);
      notify('넣지 못했어요', explain(e));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/*
        Three shelves instead of one long list. Every row added made the scroll
        longer, and the things at the bottom (backup, the way out) were the ones
        people come here looking for. The shape (version on top, tabs of one
        width, only the chosen shelf below) follows a screen the owner showed.
      */}
      <Text style={styles.version}>
        버전 {APP_VERSION} · {CHANGELOG[0].day}
      </Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabOn]}
            onPress={() => setTab(t.id)}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.id}</Text>
          </Pressable>
        ))}
      </View>

      {tab === '아이' && (
        <>
        <Pressable style={styles.row} onPress={() => router.push('/settings/girl')}>
          <Portrait source={girl.base} size={48} />
          <View style={styles.body}>
            <Text style={styles.title}>함께 지낼 아이</Text>
            <Text style={styles.sub}>{girl.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/friends')}>
          <View style={styles.icon}>
            <Ionicons name="people-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>친구</Text>
            <Text style={styles.sub}>방 구경 · 선물 · 같은 날 운동하면 둘 다 보너스</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/memories')}>
          <View style={styles.icon}>
            <Ionicons name="heart-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>함께한 날들</Text>
            <Text style={styles.sub}>{girl.name}의 기억</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/achievements')}>
          <View style={styles.icon}>
            <Ionicons name="trophy-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>품계와 업적</Text>
            <Text style={styles.sub}>지금까지 오른 품계와 얻은 업적</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>
        </>
      )}

      {tab === '운동' && (
        <>
        <Pressable style={styles.row} onPress={() => router.push('/settings/plan')}>
          <View style={styles.icon}>
            <Ionicons name="flag-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>내 운동 계획</Text>
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

        {/*
          The switch exists because the question exists. From a review of the app
          this borrows from: 「알림 때문에 바꾸고 싶지 않던 기존 플랜 변경 버튼이
          눌립니다」. Someone with a plan they are happy with, who occasionally
          trains something else, is asked something they never want — and one day
          mis-taps it. A question asked often enough becomes a trap, so 「그만
          물어봐」 has to be one of the answers.
        */}
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="help-circle-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>루틴에도 넣을지 묻기</Text>
            <Text style={styles.sub}>
              루틴 운동 중에 종목을 더하면 물어봐요. 끄면 오늘만 하고 말아요.
            </Text>
          </View>
          <Switch
            value={askRoutine}
            onValueChange={(next) => {
              setAskRoutineState(next);
              setAskRoutine(next).catch(() => setAskRoutineState(!next));
            }}
            trackColor={{ true: colors.accent }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="sparkles-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>AI 모델에게 조언 묻기</Text>
            <Text style={styles.sub}>
              끄면 기록만 보고 짧게 말해요.
              {/* Only a build that goes straight to a server can be kept waiting by one. */}
              {hasDirectServer(__DEV__) ? ' 모델 서버가 없으면 꺼 두는 게 빨라요.' : ''}
            </Text>
          </View>
          <Switch
            value={byModel}
            onValueChange={(next) => {
              setByModelState(next);
              setAdviceByModel(next).catch(() => setByModelState(!next));
            }}
            trackColor={{ true: colors.accent }}
          />
        </View>

        {/*
          Web only: on a phone the end of a rest is a notification, and its sound
          is the system's. The three are laid out as three buttons, and pressing
          one rings it, so the choice is made by ear.

          It was one row that stepped to the next bell when pressed, and looked
          like every row beside it that only tells you something: 「눌러서 바꿀 수
          있는 옵션이라는 생각이 안 들음」 (2026-10-06).
        */}
        {Platform.OS === 'web' && (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.icon}>
                <Ionicons name="notifications-outline" size={22} color={colors.accent} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>쉬는 시간 종소리</Text>
                <Text style={styles.sub}>{BELLS.find((b) => b.id === bell)?.detail}</Text>
              </View>
            </View>
            <View style={styles.choices}>
              {BELLS.map((b) => (
                <Pressable
                  key={b.id}
                  style={[styles.choice, bell === b.id && styles.choiceOn]}
                  onPress={() => {
                    setBellState(b.id);
                    setBell(b.id).catch(() => {});
                    wakeBell();
                    ringBell(b.id);
                  }}>
                  <Text style={[styles.choiceText, bell === b.id && styles.choiceTextOn]}>
                    {b.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        </>
      )}

      {tab === '앱' && (
        <>
        {/*
          An amount, so a slider: the shape the owner showed (label, track with
          its numbers, the value at the end). The line under it is drawn at the
          size the thumb is on, so the choice is seen before it is made.
        */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.icon}>
              <Ionicons name="text-outline" size={22} color={colors.accent} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>글자 크기</Text>
              <PlainText
                style={[
                  styles.sample,
                  { fontSize: scaledSize(15, shownScale), lineHeight: scaledSize(22, shownScale) },
                ]}>
                오늘도 한 세트, 가볍게 시작해요.
              </PlainText>
            </View>
            <Text style={styles.amount}>{shownScale}%</Text>
          </View>
          <Slider
            label="글자 크기"
            value={shownScale}
            min={MIN_TEXT_SCALE}
            max={MAX_TEXT_SCALE}
            step={TEXT_SCALE_STEP}
            marks={TEXT_SCALE_MARKS}
            onChange={setDraft}
            onDone={(value) => {
              changeTextScale(value);
              setDraft(null);
            }}
          />
        </View>

        <NudgeSetting />

        {/*
          A copy that survives this app. Placed with the ordinary settings and
          not hidden under anything: the people who need it most are the ones
          who have not yet had the bad day that teaches them to look.
        */}
        <Pressable style={styles.row} onPress={() => router.push('/settings/backup')}>
          <View style={styles.icon}>
            <Ionicons name="save-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>기록 백업</Text>
            <Text style={styles.sub}>받아 두고, 필요하면 다시 넣어요</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/settings/about')}>
          <View style={styles.icon}>
            <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>앱 정보</Text>
            <Text style={styles.sub}>
              버전 {APP_VERSION} · {CHANGELOG[0].day} · 바뀐 것들
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>

        {/*
          Development only. Testing the shop means having spent nothing and
          owning nothing, over and over, and the honest way to that state is a
          button rather than hand-edited rows in someone's database. `__DEV__`
          is false in a release build, so this cannot ship by accident.
        */}
        {__DEV__ && (
          <Pressable style={styles.row} disabled={!!granting} onPress={grant}>
            <View style={styles.icon}>
              <Ionicons name="flask-outline" size={22} color={colors.textDim} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>골드 1,000 넣기</Text>
              <Text style={styles.sub}>
                {granting ?? '개발 중에만 보여요. 시험용이에요.'}
              </Text>
            </View>
          </Pressable>
        )}

        <View style={styles.footer}>
          <Text style={styles.account}>{session?.user.email}</Text>
          <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
          {/*
            Small and last, under the way out that is not final. It has to be
            findable by someone looking for it and missable by everyone else.
          */}
          <Pressable style={styles.leave} disabled={leaving} onPress={leave}>
            <Text style={styles.leaveText}>{leaving ? '지우는 중이에요…' : '계정 지우기'}</Text>
          </Pressable>
        </View>
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  version: { color: colors.textDim, fontSize: 14, textAlign: 'right' },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  tabOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tabText: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
  tabTextOn: { color: colors.accent, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  // A setting with its choices laid out under it, rather than a row to press.
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  choices: { flexDirection: 'row', gap: spacing.sm },
  sample: { color: colors.textDim },
  amount: { color: colors.text, fontSize: 17, fontWeight: '800', minWidth: 56, textAlign: 'right' },
  choice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  choiceOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  choiceText: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
  choiceTextOn: { color: colors.accent, fontWeight: '800' },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 25 },
  sub: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  footer: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  account: { color: colors.textDim },
  logout: { padding: spacing.md },
  logoutText: { color: colors.danger, fontWeight: '700' },
  leave: { padding: spacing.sm },
  leaveText: { color: colors.textDim, fontSize: 14, textDecorationLine: 'underline' },
});
