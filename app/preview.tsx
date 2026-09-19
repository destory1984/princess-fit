import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Advisor } from '@/components/Advisor';
import { BigStepper } from '@/components/BigStepper';
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
import { BASE_GIRL } from '@/lib/outfitArt';
import { GIRL_NAME } from '@/lib/girl';
import { colors, spacing } from '@/lib/theme';

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
export default function PreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;

  const stats = { strength: 62, stamina: 40, vitality: 55, balance: 30, discipline: 48 };
  const house = { gold: 1_240, satiety: 74, attire: 22, settledOn: '2026-09-20' };
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
      <Advisor name={GIRL_NAME} portrait={BASE_GIRL.source}>
        오늘은 오시려나 했어요.
      </Advisor>

      <Text style={styles.heading}>지갑</Text>
      <Purse house={house} opensShop />

      <Text style={styles.heading}>쉬는 시간 막대</Text>
      <RestBar
        exerciseName="바벨 스쿼트"
        length={120}
        remaining={47}
        grain={10}
        onAdjust={() => {}}
        onSkip={() => {}}
      />
      <RestBar
        exerciseName="덤벨 컬"
        length={60}
        remaining={null}
        grain={10}
        onAdjust={() => {}}
        onSkip={() => {}}
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
        }}
        busy={null}
        onSpend={() => {}}
      />

      <Text style={styles.heading}>옷 한 벌씩</Text>
      <View style={styles.dolls}>
        {[[], ['blouse'], ['blouse', 'skirt_orange'], ['sleeves_blue', 'blouse', 'skirt_blue'], ['gown', 'bouquet']].map(
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
  greeting: { height: 520 },
  dolls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dollCell: { alignItems: 'center', gap: 4, width: 100 },
  doll: { width: 100 },
  dollLabel: { color: colors.textDim, fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
