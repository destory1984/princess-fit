import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { Purse } from '@/components/Purse';
import { ScreenState } from '@/components/ScreenState';
import { notify } from '@/lib/confirm';
import { buyFurniture, buyItem, getLedger, takeLesson, type Ledger } from '@/lib/db';
import { CULTURE_META, CULTURE_ORDER, LESSONS, previewOf, type Lesson } from '@/lib/lessons';
import { FURNITURE, replaces, roomProgress, SLOT_NAME, type Furniture } from '@/lib/room';
import {
  ACCESSORIES,
  CLOTHES,
  FOOD,
  REFUSAL_TEXT,
  refusalFor,
  SPECIALS,
  wardrobeProgress,
  type Item,
} from '@/lib/shop';
import { colors, paper, radius, spacing } from '@/lib/theme';

const SHELVES = ['부엌', '옷장', '장신구', '수업', '방', '특별'] as const;
type Shelf = (typeof SHELVES)[number];

export default function ShopScreen() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shelf, setShelf] = useState<Shelf>('부엌');

  const load = useCallback(() => {
    setError(null);
    getLedger()
      .then(setLedger)
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  /** One path for every kind of purchase, so the busy state cannot be forgotten. */
  async function spend(id: string, label: string, price: number, run: () => Promise<Ledger>) {
    if (busy) return;
    setBusy(id);
    try {
      setLedger(await run());
      notify(`${label} · −${price.toLocaleString()} G`);
    } catch (e: any) {
      notify('사지 못했어요', e.message);
    } finally {
      setBusy(null);
    }
  }

  if (!ledger) return <ScreenState error={error} onRetry={load} />;

  const { house, wardrobe, furniture, culture } = ledger;

  function Row({
    id,
    icon,
    name,
    detail,
    price,
    note,
    disabled,
    owned,
    onPress,
  }: {
    id: string;
    icon: string;
    name: string;
    detail: string;
    price: number;
    note?: string;
    disabled?: boolean;
    owned?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        style={[styles.row, (disabled || busy === id) && styles.rowOff]}
        disabled={disabled || busy === id}
        onPress={onPress}>
        <View style={styles.icon}>
          <Ionicons
            name={(owned ? 'checkmark' : icon) as any}
            size={20}
            color={owned ? colors.gold : colors.accent}
          />
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.detail}>{detail}</Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
        <Text style={[styles.price, disabled && styles.priceOff]}>
          {owned ? '가짐' : `${price.toLocaleString()} G`}
        </Text>
      </Pressable>
    );
  }

  function ItemRow({ item }: { item: Item }) {
    const refusal = refusalFor(item, house, wardrobe);
    return (
      <Row
        id={item.id}
        icon={item.icon}
        name={item.name}
        detail={item.detail}
        price={item.price}
        note={
          item.restores
            ? `포만감 +${item.restores}`
            : item.charm
              ? `매력 +${item.charm}`
              : refusal === 'locked'
                ? REFUSAL_TEXT.locked
                : undefined
        }
        disabled={!!refusal}
        owned={refusal === 'owned'}
        onPress={() => spend(item.id, item.name, item.price, () => buyItem(item))}
      />
    );
  }

  function LessonRow({ lesson }: { lesson: Lesson }) {
    const preview = previewOf(lesson, culture);
    const note = preview.length
      ? preview.map((p) => `${p.name} +${p.gain}`).join(' · ')
      : '더 배울 것이 없어요';
    return (
      <Row
        id={lesson.id}
        icon={lesson.icon}
        name={lesson.name}
        detail={lesson.detail}
        price={lesson.price}
        note={note}
        disabled={house.gold < lesson.price || preview.length === 0}
        onPress={() => spend(lesson.id, lesson.name, lesson.price, () => takeLesson(lesson))}
      />
    );
  }

  function FurnitureRow({ piece }: { piece: Furniture }) {
    const owned = furniture.includes(piece.id);
    const swaps = owned ? null : replaces(piece, furniture);
    return (
      <Row
        id={piece.id}
        icon={piece.icon}
        name={piece.name}
        detail={piece.detail}
        price={piece.price}
        note={swaps ? `${swaps.name} 대신 들어와요` : SLOT_NAME[piece.slot]}
        disabled={owned || house.gold < piece.price}
        owned={owned}
        onPress={() => spend(piece.id, piece.name, piece.price, () => buyFurniture(piece))}
      />
    );
  }

  function Bar({ ratio, label }: { ratio: number; label: string }) {
    return (
      <View style={styles.barWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(1, ratio) * 100}%` }]} />
        </View>
        <Text style={styles.barLabel}>{label}</Text>
      </View>
    );
  }

  const clothes = wardrobeProgress(wardrobe);
  const room = roomProgress(furniture);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Purse house={house} />

      <View style={styles.tabs}>
        {SHELVES.map((s) => (
          <Pressable
            key={s}
            style={[styles.tab, shelf === s && styles.tabOn]}
            onPress={() => setShelf(s)}>
            <Text style={[styles.tabText, shelf === s && styles.tabTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {shelf === '부엌' && FOOD.map((item) => <ItemRow key={item.id} item={item} />)}

      {shelf === '옷장' && (
        <>
          <Bar ratio={clothes.ratio} label={`${clothes.count}/${clothes.total}벌`} />
          <Text style={styles.hint}>
            {clothes.complete
              ? '옷장이 가득 찼어요. 일 년을 걸어온 값이에요.'
              : '새 옷을 입으면 차림새가 다시 단정해져요.'}
          </Text>
          {CLOTHES.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </>
      )}

      {shelf === '장신구' && (
        <>
          <Text style={styles.hint}>옷만큼 비싸지 않고, 매력이 조금씩 붙어요.</Text>
          {ACCESSORIES.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </>
      )}

      {shelf === '수업' && (
        <>
          <View style={styles.culture}>
            {CULTURE_ORDER.map((k) => (
              <View key={k} style={styles.cultureRow}>
                <Ionicons name={CULTURE_META[k].icon as any} size={14} color={colors.gold} />
                <Text style={styles.cultureName}>{CULTURE_META[k].name}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${culture[k]}%` }]} />
                </View>
                <Text style={styles.cultureValue}>{culture[k]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>운동으로는 오르지 않는 것들이에요.</Text>
          {LESSONS.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </>
      )}

      {shelf === '방' && (
        <>
          <Bar ratio={room.ratio} label={`${room.count}/${room.total}개`} />
          <Text style={styles.hint}>한 자리에 하나씩. 좋은 걸 사면 있던 게 빠져요.</Text>
          {FURNITURE.map((piece) => (
            <FurnitureRow key={piece.id} piece={piece} />
          ))}
        </>
      )}

      {shelf === '특별' && (
        <>
          <View style={styles.gems}>
            <Ionicons name="diamond-outline" size={18} color={colors.accent} />
            <Text style={styles.gemCount}>보석 0개</Text>
          </View>
          <Text style={styles.hint}>
            보석은 아직 구할 수 없어요. 준비가 되면 여기서 살 수 있게 될 거예요.
          </Text>
          {SPECIALS.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  tab: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tabOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tabText: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  tabTextOn: { color: colors.accent, fontWeight: '800' },
  barWrap: { gap: 4, marginTop: spacing.sm },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: paper.bg,
    borderColor: colors.faint,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.gold },
  barLabel: { color: colors.gold, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  hint: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginBottom: spacing.xs },
  culture: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cultureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cultureName: { color: colors.textDim, fontSize: 12, width: 32 },
  cultureValue: { color: colors.textDim, fontSize: 11, width: 24, textAlign: 'right' },
  gems: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  gemCount: { color: colors.text, fontSize: 15, fontWeight: '700' },
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
  note: { color: colors.gold, fontSize: 11, lineHeight: 16 },
  price: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  priceOff: { color: colors.textDim },
});
