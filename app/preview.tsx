import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { PaperDoll } from '@/components/PaperDoll';
import { Purse } from '@/components/Purse';
import { TrainingHall } from '@/components/TrainingHall';
import { FURNITURE } from '@/lib/room';
import { GARMENTS } from '@/lib/outfit';
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

      <Text style={styles.heading}>지갑</Text>
      <Purse house={house} opensShop />

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
  dolls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dollCell: { alignItems: 'center', gap: 4, width: 100 },
  doll: { width: 100 },
  dollLabel: { color: colors.textDim, fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
