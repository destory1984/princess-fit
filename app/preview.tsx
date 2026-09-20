import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Advisor } from '@/components/Advisor';
import { BigStepper } from '@/components/BigStepper';
import { BragCard } from '@/components/BragCard';
import { Cheer } from '@/components/Cheer';
import { ConditionPicker } from '@/components/ConditionPicker';
import { WalkCard } from '@/components/WalkCard';
import { ExercisePicker } from '@/components/ExercisePicker';
import { TimeField } from '@/components/TimeField';
import { DEFAULT_EXERCISES } from '@/lib/exerciseCatalog';
import { Insights } from '@/components/Insights';
import { MonthCalendar } from '@/components/MonthCalendar';
import GirlScreen from '@/app/settings/girl';
import OneRmScreen from '@/app/onerm';
import RoutinePresetsScreen from '@/app/routine/presets';
import OnboardingScreen from '@/app/onboarding';
import PhotosScreen from '@/app/photos';
import PlanScreen from '@/app/settings/plan';
import RecoveryScreen from '@/app/recovery';
import SleepScreen from '@/app/sleep';
import { OneRmChart } from '@/components/OneRmChart';
import { NudgeSetting } from '@/components/NudgeSetting';
import { nextWeight } from '@/lib/weight';
import { Greeting } from '@/components/Greeting';
import { PaperDoll } from '@/components/PaperDoll';
import { RestBar } from '@/components/RestBar';
import { SetCard } from '@/components/SetCard';
import { ShopShelves } from '@/components/ShopShelves';
import { Purse } from '@/components/Purse';
import { TrainingHall } from '@/components/TrainingHall';
import { FURNITURE } from '@/lib/room';
import { GARMENTS } from '@/lib/outfit';
import { summarise } from '@/lib/gamification';
import { colors, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';

/**
 * A development-only bench for the pieces that are hard to judge from code.
 *
 * The room and the doll have both shipped broken in ways that only showed on
 * screen — a portrait five times life size, garments over a girl's face. Those
 * screens sit behind a login, so checking them meant asking someone else to
 * look. This one needs no account and no data.
 *
 * It is not part of the app: in a release build it redirects home.
 */
/** A month of chest-only training: enough for the reading to have opinions. */
const benchFacts = [0, 2, 4, 7, 9, 12, 15, 18].map((daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `p${daysAgo}`,
    started_at: `${d.toISOString().slice(0, 10)}T10:00:00`,
    groups: daysAgo % 4 === 0 ? ['가슴', '팔'] : daysAgo % 3 === 0 ? ['등'] : ['하체'],
    doneSets: 12,
    volume: 3000,
    durationSec: 0,
    distanceKm: 0,
  };
});

// Spread across the catalogue rather than the first ten, which were all
// chest and back — searching the bench for a squat found nothing and looked
// like a broken search rather than a narrow fixture.
const benchExercises = DEFAULT_EXERCISES.filter((_, i) => i % 6 === 0).map((e, i) => ({
  ...e,
  id: `x${i}`,
  user_id: 'u',
  rest_sec: 60,
  favourite: i % 4 === 0,
  created_at: '2026-09-01T00:00:00',
}));

const benchUsage = new Map([
  ['x1', { count: 9, lastOn: '2026-09-19' }],
  ['x3', { count: 2, lastOn: '2026-09-12' }],
]);

export default function PreviewScreen() {
  const [picking, setPicking] = useState(false);
  const [asking, setAsking] = useState(false);
  const girl = useGirl();
  if (!__DEV__) return <Redirect href="/" />;

  const stats = { strength: 62, stamina: 40, vitality: 55, balance: 30, discipline: 48 };
  const house = { gold: 1_240, satiety: 74, attire: 22, settledOn: '2026-09-20' };
  // The other half of the shop: enough gold for a meal she does not need, and
  // not enough for anything else. Refusal has a precedence — being broke is
  // checked before being full — so this is the household that shows both
  // reasons at once, which is the only half worth a bench.
  const fullUp = { gold: 200, satiety: 100, attire: 100, settledOn: '2026-09-20' };
  const allFurniture = FURNITURE.map((f) => f.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>빈 방</Text>
      <TrainingHall
        today={new Date()}
        rank="기사"
        level={4}
        archetype="괴력의 전사"
        condition="어쨌든 튼튼하게"
        stats={stats}
        streak={3}
        caption="침대 하나뿐인 방이에요."
      />

      <Text style={styles.heading}>가구를 다 들인 방 · 드레스 차림</Text>
      <TrainingHall
        today={new Date()}
        rank="공작"
        level={11}
        archetype="원탁의 재목"
        condition="기세가 올랐어요"
        stats={stats}
        streak={12}
        furniture={allFurniture}
        worn={['gown', 'bouquet']}
        penalty="돌봄이 부족해 능력이 12% 낮게 나와요"
        caption="더 들일 것이 없는 방이 되었어요."
      />

      <Text style={styles.heading}>말풍선</Text>
      <Advisor name={girl.name} portrait={girl.base}>
        오늘은 오시려나 했어요.
      </Advisor>

      <Text style={styles.heading}>지갑</Text>
      <Purse house={house} opensShop />

      <Text style={styles.heading}>운동을 마친 카드</Text>
      <BragCard
        workout={{
          id: 'w',
          user_id: 'u',
          routine_id: null,
    condition: 'normal' as const,
          title: '월요일 상체',
          memo: null,
          started_at: '2026-09-20T18:00:00',
          ended_at: '2026-09-20T19:07:00',
        }}
        items={[]}
        fact={{
          id: 'w',
          started_at: '2026-09-20T18:00:00',
          groups: ['가슴', '팔'],
          doneSets: 14,
          volume: 4_120,
          durationSec: 0,
          distanceKm: 0,
        }}
        summary={summarise([])}
      />

      {/*
        Whole screens, so the ones that need an account can still be looked at.
        They mount against no data, which is also the state a new user sees.
      */}
      <Text style={styles.heading}>1RM 계산기 (화면 전체)</Text>
      <View style={styles.framed}>
        <OneRmScreen />
      </View>

      <Text style={styles.heading}>짜여 있는 루틴 (화면 전체)</Text>
      <View style={styles.framedTall}>
        <RoutinePresetsScreen />
      </View>

      <Text style={styles.heading}>함께 지낼 아이 (화면 전체)</Text>
      <View style={styles.framedTall}>
        <GirlScreen />
      </View>

      <Text style={styles.heading}>첫 인사 (화면 전체)</Text>
      <View style={styles.framedTall}>
        <OnboardingScreen />
      </View>

      <Text style={styles.heading}>내 운동 계획 (화면 전체)</Text>
      <View style={styles.framedTall}>
        <PlanScreen />
      </View>

      <Text style={styles.heading}>회복 (화면 전체)</Text>
      <View style={styles.framedTall}>
        <RecoveryScreen />
      </View>

      <Text style={styles.heading}>오늘 걸음 · 펼친 것과 홈에 놓이는 한 줄</Text>
      <WalkCard onFed={() => {}} />
      <WalkCard onFed={() => {}} dense />

      <Text style={styles.heading}>오늘 몸 상태</Text>
      <Pressable style={styles.openPicker} onPress={() => setAsking(true)}>
        <Text style={styles.openPickerText}>물어보는 창 열기</Text>
      </Pressable>
      <ConditionPicker
        visible={asking}
        onPick={() => setAsking(false)}
        onClose={() => setAsking(false)}
      />

      <Text style={styles.heading}>사진 기록 (화면 전체)</Text>
      <View style={styles.framed}>
        <PhotosScreen />
      </View>

      <Text style={styles.heading}>수면 기록 (화면 전체)</Text>
      <View style={styles.framedTall}>
        <SleepScreen />
      </View>

      <Text style={styles.heading}>잠든 · 일어난 시각</Text>
      <View style={styles.steppers}>
        <TimeField label="잠든 시각" value={23 * 60 + 30} onChange={() => {}} />
        <TimeField label="일어난 시각" value={6 * 60 + 40} onChange={() => {}} />
      </View>

      <Text style={styles.heading}>종목 고르기</Text>
      <Pressable style={styles.openPicker} onPress={() => setPicking(true)}>
        <Text style={styles.openPickerText}>고르기 창 열기</Text>
      </Pressable>
      <ExercisePicker
        visible={picking}
        exercises={benchExercises}
        usage={benchUsage}
        onSelect={() => setPicking(false)}
        onClose={() => setPicking(false)}
      />

      <Text style={styles.heading}>달력</Text>
      <MonthCalendar
        month={new Date()}
        markedDays={new Set(benchFacts.map((f) => f.started_at.slice(0, 10)))}
        dayGroups={
          new Map(benchFacts.map((f) => [f.started_at.slice(0, 10), f.groups]))
        }
        selected={null}
        onSelect={() => {}}
        onShiftMonth={() => {}}
      />

      <Text style={styles.heading}>1RM 그래프</Text>
      <OneRmChart weight={60} />

      <Text style={styles.heading}>통계가 짚어주는 것</Text>
      <Insights workouts={benchFacts} />

      <Text style={styles.heading}>기록이 적을 때</Text>
      <Insights workouts={benchFacts.slice(0, 2)} />

      <Text style={styles.heading}>알림 설정</Text>
      <NudgeSetting />

      <Text style={styles.heading}>리나의 응원</Text>
      <Cheer
        doneSets={0}
        totalSets={0}
        suggestion={{ id: 'x', name: '랫 풀다운', why: '광배근을 4일째 안 하셨어요.' }}
        onAccept={() => {}}
        onInvite={() => {}}
      />
      <Cheer doneSets={0} totalSets={0} onInvite={() => {}} />
      <Cheer doneSets={0} totalSets={12} />
      <Cheer doneSets={7} totalSets={12} />
      <Cheer doneSets={11} totalSets={12} />
      <Cheer doneSets={12} totalSets={12} />

      <Text style={styles.heading}>쉬는 시간 막대</Text>
      <RestBar
        exerciseName="바벨 스쿼트"
        length={120}
        remaining={47}
        grain={10}
        onAdjust={() => {}}
        onStart={() => {}}
      />
      <RestBar
        exerciseName="덤벨 컬"
        length={60}
        remaining={null}
        grain={10}
        onAdjust={() => {}}
        onStart={() => {}}
      />

      <Text style={styles.heading}>세트 카드</Text>
      {(
        [
          ['weight_reps', { weight_kg: 62.5, reps: 8 }, 3, 4],
          ['weight_reps', { weight_kg: 0, reps: 10 }, 1, 3],
          ['cardio', { duration_sec: 1_800, distance_km: 5.2 }, 1, 1],
        ] as const
      ).map(([track, patch, index, total], i) => (
        <SetCard
          key={i}
          track={track}
          index={index}
          total={total}
          tint={colors.accent}
          set={{
            id: `preview-${i}`,
            workout_id: 'w',
            exercise_id: 'e',
            position: 0,
            set_no: index,
            weight_kg: 0,
            reps: 0,
            duration_sec: 0,
            distance_km: 0,
            done: false,
            ...patch,
          }}
          onChange={() => {}}
          onComplete={() => {}}
          onRemove={() => {}}
        />
      ))}

      <Text style={styles.heading}>세트 입력</Text>
      <View style={styles.steppers}>
        <BigStepper value={12} unit="kg" step={1} nextAt={nextWeight} bigStep={10} onChange={() => {}} />
        <BigStepper value={20} unit="kg" step={1} nextAt={nextWeight} bigStep={10} onChange={() => {}} />
      </View>
      <View style={styles.steppers}>
        <BigStepper value={62.5} unit="kg" step={1} nextAt={nextWeight} bigStep={10} decimals={1} onChange={() => {}} />
        <BigStepper value={10} unit="회" step={1} bigStep={5} onChange={() => {}} />
      </View>

      <Text style={styles.heading}>알림을 눌렀을 때</Text>
      <View style={styles.greeting}>
        <Greeting
          worn={['blouse', 'skirt_orange']}
          line="다녀왔어요. 무용, 생각보다 재미있었어요."
          onDone={() => {}}
        />
      </View>

      <Text style={styles.heading}>상점</Text>
      <ShopShelves
        ledger={{
          house,
          wardrobe: ['blouse', 'skirt_orange', 'ribbon'],
          worn: ['blouse', 'skirt_orange'],
          furniture: ['bed', 'curtain'],
          culture: { grace: 24, learning: 41, charm: 12 },
          lesson: null,
        }}
        busy={null}
        onSpend={() => {}}
      />

      <Text style={styles.heading}>상점 · 배부를 때와 골드가 모자랄 때</Text>
      <ShopShelves
        ledger={{
          house: fullUp,
          wardrobe: ['blouse'],
          worn: ['blouse'],
          furniture: ['bed'],
          culture: { grace: 100, learning: 100, charm: 100 },
          // Part-way through a course: the other half of this shelf.
          lesson: { lessonId: 'dance', startedOn: '2026-09-19', endsOn: '2026-09-22' },
        }}
        busy={null}
        onSpend={() => {}}
      />

      <Text style={styles.heading}>옷 한 벌씩</Text>
      <View style={styles.dolls}>
        {[
          [],
          ['ribbon', 'necklace'],
          ['blouse', 'trousers_orange', 'ribbon'],
          ['trousers_blue', 'blouse'],
          ['gown', 'bouquet', 'ribbon', 'necklace'],
        ].map(
          (worn, i) => (
            <View key={i} style={styles.dollCell}>
              <PaperDoll worn={worn} style={styles.doll} />
              <Text style={styles.dollLabel}>
                {worn.length
                  ? worn.map((id) => GARMENTS.find((g) => g.id === id)?.name).join(' + ')
                  : '체육복'}
              </Text>
            </View>
          )
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  heading: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.md },
  steppers: { flexDirection: 'row', gap: spacing.md },
  openPicker: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  openPickerText: { color: colors.accent, fontWeight: '700' },
  framed: { height: 640, borderWidth: 1, borderColor: colors.faint, borderRadius: 8 },
  framedTall: { height: 720, borderWidth: 1, borderColor: colors.faint, borderRadius: 8 },
  greeting: { height: 520 },
  dolls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dollCell: { alignItems: 'center', gap: 4, width: 100 },
  doll: { width: 100 },
  dollLabel: { color: colors.textDim, fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
