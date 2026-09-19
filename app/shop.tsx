import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { Purse } from '@/components/Purse';
import { ScreenState } from '@/components/ScreenState';
import { notify } from '@/lib/confirm';
import { buyItem, getLedger, type Ledger } from '@/lib/db';
import {
  CLOTHES,
  FOOD,
  REFUSAL_TEXT,
  refusalFor,
  wardrobeProgress,
  type Item,
} from '@/lib/shop';
import { colors, paper, radius, spacing } from '@/lib/theme';

export default function ShopScreen() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getLedger()
      .then(setLedger)
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  async function purchase(item: Item) {
    if (!ledger || busy) return;
    const refusal = refusalFor(item, ledger.house, ledger.wardrobe);
    if (refusal) {
      notify(REFUSAL_TEXT[refusal]);
      return;
    }
    setBusy(item.id);
    try {
      setLedger(await buyItem(item));
      notify(`${item.name} · −${item.price} G`);
    } catch (e: any) {
      notify('사지 못했어요', e.message);
    } finally {
      setBusy(null);
    }
  }

  if (!ledger) return <ScreenState error={error} onRetry={load} />;

  const progress = wardrobeProgress(ledger.wardrobe);

  function Row({ item }: { item: Item }) {
    const refusal = refusalFor(item, ledger!.house, ledger!.wardrobe);
    const owned = refusal === 'owned';
    return (
      <Pressable
        style={[styles.row, (refusal || busy === item.id) && styles.rowOff]}
        disabled={!!refusal || busy === item.id}
        onPress={() => purchase(item)}>
        <View style={styles.icon}>
          <Ionicons
            name={owned ? 'checkmark' : (item.icon as any)}
            size={20}
            color={owned ? colors.gold : colors.accent}
          />
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.detail}>
            {item.detail}
            {item.restores ? ` · 포만감 +${item.restores}` : ''}
          </Text>
        </View>
        <Text style={[styles.price, refusal && styles.priceOff]}>
          {owned ? '가짐' : `${item.price.toLocaleString()} G`}
        </Text>
      </Pressable>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Purse house={ledger.house} />

      <Text style={styles.section}>부엌</Text>
      {FOOD.map((item) => (
        <Row key={item.id} item={item} />
      ))}

      <View style={styles.sectionRow}>
        <Text style={styles.section}>옷장</Text>
        <Text style={styles.progress}>
          {progress.count}/{progress.total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress.ratio * 100}%` }]} />
      </View>
      <Text style={styles.hint}>
        {progress.complete
          ? '옷장이 가득 찼어요. 일 년을 걸어온 값이에요.'
          : '새 옷을 입으면 차림새가 다시 단정해져요.'}
      </Text>
      {CLOTHES.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { color: colors.gold, fontSize: 13, fontWeight: '800', marginTop: spacing.md },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: paper.bg,
    borderColor: colors.faint,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.gold },
  hint: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowOff: { opacity: 0.5 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  detail: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  price: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  priceOff: { color: colors.textDim },
});
