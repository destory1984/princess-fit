import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PaperDoll } from "@/components/PaperDoll";
import { shelfArt } from "@/lib/outfitArt";
import { Purse } from "@/components/Purse";
// The purchase itself is handed to `onSpend`, which decides whether to run it.
// On the bench it never runs, so these are only ever built, never called.
import {
  buyFurniture,
  buyGarment,
  buyItem,
  setWorn,
  takeLesson,
  type Ledger,
} from "@/lib/db";
import type { GiftKind } from "@/lib/economy";
import {
  CULTURE_META,
  CULTURE_ORDER,
  daysLeft,
  enrolmentWord,
  lengthWord,
  LESSONS,
  previewOf,
  type Enrolment,
  type Lesson,
} from "@/lib/lessons";
import {
  GARMENTS,
  layersOf,
  OUTFIT_SLOT_NAME,
  takingOff,
  wearing,
  type Garment,
} from "@/lib/outfit";
import {
  FURNITURE,
  replaces,
  SLOT_NAME,
  type Furniture,
} from "@/lib/room";
import {
  ACCESSORIES,
  adorned,
  effectiveCulture,
  FOOD,
  givenToday,
  refusalFor,
  REFUSAL_TEXT,
  type Item,
} from "@/lib/shop";
import { colors, paper, radius, spacing } from "@/lib/theme";
import { withParticle } from "@/lib/korean";

const SHELVES = ["부엌", "옷장", "장신구", "수업", "방"] as const;
type Shelf = (typeof SHELVES)[number];

/** What a purchase needs: which thing, what it costs, and how to carry it out. */
export type Spend = (
  id: string,
  label: string,
  price: number,
  kind: GiftKind,
  run: () => Promise<Ledger>,
) => void;

type Props = {
  ledger: Ledger;
  /** Id of the row waiting on the server, or null. */
  busy: string | null;
  onSpend: Spend;
  /** Id of something the visitor was sent here to give: its shelf opens first. */
  gift?: string;
};

function shelfOf(gift: string | undefined): Shelf {
  if (GARMENTS.some((g) => g.id === gift)) return "옷장";
  if (ACCESSORIES.some((a) => a.id === gift)) return "장신구";
  if (FURNITURE.some((f) => f.id === gift)) return "방";
  return "부엌";
}

/**
 * Everything a row needs to draw itself and to spend: the ledger it reads and
 * the callback that carries a purchase out.
 *
 * These live at module scope rather than inside ShopShelves because a
 * component defined during render is a different component on every render —
 * React tears the old one down and builds a new one, which for a list of rows
 * means rebuilding the whole shelf on every keystroke.
 */
type Shop = Props & { spend: Spend };

/** What a garment's row shows when there is nothing to say about it. */
const PLAIN_GARMENT = "shirt-outline";

function Row({
  id,
  icon,
  picture,
  name,
  detail,
  price,
  note,
  disabled,
  owned,
  busy,
  onPress,
}: {
  id: string;
  icon: string;
  /**
   * The thing itself, where there is a drawing of it. The icon then shrinks to a
   * badge on its corner and is shown only when it says something (worn, trying on).
   */
  picture?: number;
  name: string;
  detail: string;
  price: number;
  note?: string;
  disabled?: boolean;
  owned?: boolean;
  busy: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.row, (disabled || busy === id) && styles.rowOff]}
      disabled={disabled || busy === id}
      onPress={onPress}
    >
      {picture ? (
        <View style={styles.picture}>
          <Image source={picture} resizeMode="contain" style={styles.pictureArt} />
          {icon !== PLAIN_GARMENT && (
            <View style={styles.badge}>
              <Ionicons name={icon as any} size={11} color={colors.accent} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.icon}>
          <Ionicons
            name={(owned ? "checkmark" : icon) as any}
            size={20}
            color={owned ? colors.gold : colors.accent}
          />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.detail}>{detail}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      <Text style={[styles.price, disabled && styles.priceOff]}>
        {owned ? "가짐" : `${price.toLocaleString()} G`}
      </Text>
    </Pressable>
  );
}

function ItemRow({ item, shop }: { item: Item; shop: Shop }) {
  const { house, wardrobe } = shop.ledger;
  const refusal = refusalFor(item, house, wardrobe, shop.ledger.giftedOn);
  return (
    <Row
      id={item.id}
      busy={shop.busy}
      // An accessory has a drawing, so the row shows the thing itself, and the
      // badge on its corner says only that she already has it.
      picture={shelfArt(item.id)}
      icon={shelfArt(item.id) ? (refusal === "owned" ? "checkmark" : PLAIN_GARMENT) : item.icon}
      name={item.name}
      detail={item.detail}
      price={item.price}
      /*
        The reason comes first when there is one. This row used to print
        「포만감 +20」 whatever was true, so a full girl left every dish greyed
        out with nothing saying why — and 「왜 먹을건 아직 못 사는거야」 is the
        only thing anyone can conclude from that. A row you cannot press is a
        row that has to say why not.
      */
      note={
        refusal
          ? REFUSAL_TEXT[refusal]
          : item.restores
            ? `포만감 +${item.restores}`
            : item.charm
              ? `매력 +${item.charm}`
              : undefined
      }
      disabled={!!refusal}
      owned={refusal === "owned"}
      onPress={() =>
        shop.spend(
          item.id,
          item.name,
          item.price,
          item.kind === "food" ? "food" : "accessory",
          () => buyItem(item),
        )
      }
    />
  );
}

function LessonRow({
  lesson,
  shop,
  enrolled,
}: {
  lesson: Lesson;
  shop: Shop;
  enrolled: Enrolment | null;
}) {
  const { house, culture } = shop.ledger;
  const preview = previewOf(lesson, culture);
  const short = house.gold < lesson.price;
  const busyWithThis = enrolled?.lessonId === lesson.id;
  const busyWithOther = !!enrolled && !busyWithThis;

  // Same rule as the kitchen: the reason a row is dead outranks what it would
  // have done. Listing the lessons she would gain beside a row that cannot be
  // pressed says nothing about why not — and a row that is merely greyed out
  // says least of all.
  const note = busyWithThis
    ? `지금 듣는 중 · ${daysLeft(enrolled!)}일 남았어요`
    : busyWithOther
      ? '지금 수업 중이라서 다른 수업은 못 들어요'
      : short
        ? REFUSAL_TEXT.poor
        : preview.length
          ? `${lengthWord(lesson)} · ${preview.map((p) => `${p.name} +${p.gain}`).join(" · ")}`
          : "더 배울 것이 없어요";
  return (
    <Row
      id={lesson.id}
      busy={shop.busy}
      // With a drawing, the badge speaks only while she is taking this course.
      picture={shelfArt(lesson.id)}
      icon={busyWithThis ? "school-outline" : shelfArt(lesson.id) ? PLAIN_GARMENT : lesson.icon}
      name={lesson.name}
      detail={busyWithThis || busyWithOther ? lesson.detail : `${lengthWord(lesson)} 과정`}
      price={lesson.price}
      note={note}
      owned={busyWithThis}
      disabled={!!enrolled || short || preview.length === 0}
      onPress={() =>
        shop.spend(lesson.id, lesson.name, lesson.price, "lesson", () =>
          takeLesson(lesson),
        )
      }
    />
  );
}

function GarmentRow({
  garment,
  shop,
  tryingOn,
  onTryOn,
}: {
  garment: Garment;
  shop: Shop;
  tryingOn: boolean;
  onTryOn: () => void;
}) {
  const { wardrobe, worn } = shop.ledger;
  const owned = wardrobe.includes(garment.id);
  const on = layersOf(worn).some((g) => g.id === garment.id);
  const covered = owned && worn.includes(garment.id) && !on;
  return (
    <Row
      id={garment.id}
      busy={shop.busy}
      icon={on ? "checkmark" : tryingOn ? "eye-outline" : PLAIN_GARMENT}
      picture={shelfArt(garment.id)}
      name={garment.name}
      detail={garment.detail}
      price={garment.price}
      note={
        covered
          ? "드레스에 가려져 있어요"
          : owned
            ? `${OUTFIT_SLOT_NAME[garment.slot]} · ${on ? "입는 중" : "눌러서 입기"}`
            : `${OUTFIT_SLOT_NAME[garment.slot]} · 매력 +${garment.charm} · ${
                tryingOn ? "입혀보는 중" : "눌러서 입혀보기"
              }`
      }
      // Never disabled for want of gold: looking is free, and a row you
      // cannot even press is a row that cannot tell you why.
      disabled={false}
      owned={owned}
      onPress={() =>
        owned
          ? shop.spend(garment.id, garment.name, 0, "clothes", () =>
              setWorn(on ? takingOff(worn, garment.id) : wearing(worn, garment)),
            )
          : onTryOn()
      }
    />
  );
}

function FurnitureRow({ piece, shop }: { piece: Furniture; shop: Shop }) {
  const { house, furniture, giftedOn } = shop.ledger;
  const owned = furniture.includes(piece.id);
  const given = givenToday(giftedOn);
  const swaps = owned ? null : replaces(piece, furniture);
  return (
    <Row
      id={piece.id}
      busy={shop.busy}
      icon={piece.icon}
      name={piece.name}
      detail={piece.detail}
      price={piece.price}
      note={
        owned
          ? REFUSAL_TEXT.owned
          : given
            ? REFUSAL_TEXT.given
            : house.gold < piece.price
            ? REFUSAL_TEXT.poor
            : swaps
              ? `${swaps.name} 대신 들어와요`
              : SLOT_NAME[piece.slot]
      }
      disabled={owned || given || house.gold < piece.price}
      owned={owned}
      onPress={() =>
        shop.spend(piece.id, piece.name, piece.price, "furniture", () =>
          buyFurniture(piece),
        )
      }
    />
  );
}

/**
 * The shop, drawing only. Loading and spending live in the screen, so this can
 * be put in front of made-up data on the development bench — which is the only
 * way anyone has been able to look at it without an account.
 */
export function ShopShelves({ ledger, busy, onSpend, gift }: Props) {
  const [shelf, setShelf] = useState<Shelf>(() => shelfOf(gift));
  // A garment she does not own, held up against her.
  //
  // Everything on this shelf costs a fortnight of training, and until now the
  // only way to see one on her was to buy it — which is a strange way to sell
  // clothes and the reason "어떻게 봐? 안 보이는데" was a fair question.
  const [tryingOn, setTryingOn] = useState<string | null>(() =>
    GARMENTS.some((g) => g.id === gift) ? gift ?? null : null,
  );
  const shop: Shop = { ledger, busy, onSpend, spend: onSpend };

  const { house, wardrobe, worn, culture } = ledger;
  // What the bars show: lessons plus whatever she has on.
  const standing = effectiveCulture(culture, wardrobe, worn);

  const enrolled = ledger.lesson;
  // Only what she does not have can be tried on: a gift already given that is
  // still named in the address must not read as 「아직 산 건 아니에요」.
  const previewed =
    tryingOn && !wardrobe.includes(tryingOn)
      ? GARMENTS.find((g) => g.id === tryingOn) ?? null
      : null;
  const shownWorn = previewed ? wearing(worn, previewed) : worn;


  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Purse house={house} />
      {/*
        Said before anyone runs into it: a greyed-out row with no warning
        reads as broken, and this is a rule, not a fault.
      */}
      <Text style={styles.hint}>
        {givenToday(ledger.giftedOn)
          ? "오늘 선물은 이미 했어요. 옷·장신구·방 꾸미기는 하루에 하나씩이에요."
          : "옷·장신구·방 꾸미기는 선물이에요. 하루에 하나씩 줄 수 있어요."}
      </Text>

      <View style={styles.tabs}>
        {SHELVES.map((s) => (
          <Pressable
            key={s}
            style={[styles.tab, shelf === s && styles.tabOn]}
            onPress={() => setShelf(s)}
          >
            <Text style={[styles.tabText, shelf === s && styles.tabTextOn]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {shelf === "부엌" &&
        FOOD.map((item) => <ItemRow key={item.id} item={item} shop={shop} />)}

      {shelf === "옷장" && (
        <>
          <View style={styles.dollRow}>
            <PaperDoll worn={adorned(shownWorn, wardrobe)} style={styles.doll} />
            <View style={styles.dollBody}>
              <Text style={styles.hint}>
                {previewed
                  ? `${withParticle(previewed.name, '을를')} 입혀 봤어요. 아직 산 건 아니에요.`
                  : "안 가진 옷은 눌러서 입혀만 볼 수 있어요. 가진 옷은 눌러서 갈아입어요."}
              </Text>
              {previewed && (
                <View style={styles.tryRow}>
                  <Pressable
                    style={[
                      styles.buy,
                      (house.gold < previewed.price || givenToday(ledger.giftedOn)) && styles.buyOff,
                    ]}
                    disabled={!!busy || house.gold < previewed.price || givenToday(ledger.giftedOn)}
                    onPress={() =>
                      shop.spend(
                        previewed.id,
                        previewed.name,
                        previewed.price,
                        "clothes",
                        async () => {
                          const next = await buyGarment(previewed);
                          setTryingOn(null);
                          return next;
                        },
                      )
                    }
                  >
                    <Text style={styles.buyText}>
                      {givenToday(ledger.giftedOn)
                        ? REFUSAL_TEXT.given
                        : house.gold < previewed.price
                        ? "골드가 모자라요"
                        : `사기 · ${previewed.price.toLocaleString()} G`}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.tryOff}
                    onPress={() => setTryingOn(null)}
                  >
                    <Text style={styles.tryOffText}>벗기</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
          {GARMENTS.map((garment) => (
            <GarmentRow
              key={garment.id}
              garment={garment}
              shop={shop}
              tryingOn={tryingOn === garment.id}
              onTryOn={() => setTryingOn(tryingOn === garment.id ? null : garment.id)}
            />
          ))}
        </>
      )}

      {shelf === "장신구" && (
        <>
          <Text style={styles.hint}>
            옷만큼 비싸지 않고, 매력이 조금씩 붙어요. 받은 날부터 늘 하고 있어요.
          </Text>
          <View style={styles.dollRow}>
            <PaperDoll worn={adorned(worn, wardrobe)} style={styles.doll} />
          </View>
          {ACCESSORIES.map((item) => (
            <ItemRow key={item.id} item={item} shop={shop} />
          ))}
        </>
      )}

      {shelf === "수업" && (
        <>
          <View style={styles.culture}>
            {CULTURE_ORDER.map((k) => (
              <View key={k} style={styles.cultureRow}>
                <Ionicons
                  name={CULTURE_META[k].icon as any}
                  size={14}
                  color={colors.gold}
                />
                <Text style={styles.cultureName}>{CULTURE_META[k].name}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${standing[k]}%` }]} />
                </View>
                <Text style={styles.cultureValue}>{standing[k]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>
            운동으로는 오르지 않는 것들이에요. 기품·매력은 무도회에서, 교양은 문답 대회에서
            쓰여요.
            {standing.charm > culture.charm
              ? ` 지금 차림으로 매력 +${standing.charm - culture.charm}.`
              : ""}
          </Text>
          {/*
            What she is doing and until when. Without this the shelf could
            only say a lesson was unavailable, which answers the wrong
            question: 「아이가 언제부터 언제까지 어떤 수업하는지 알 수가 없네」.
          */}
          {enrolled && (
            <View style={styles.enrolled}>
              <Ionicons name="school-outline" size={16} color={colors.gold} />
              <Text style={styles.enrolledText}>{enrolmentWord(enrolled)}</Text>
            </View>
          )}
          {LESSONS.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              shop={shop}
              enrolled={enrolled}
            />
          ))}
        </>
      )}

      {shelf === "방" && (
        <>
          <Text style={styles.hint}>
            한 자리에 하나씩. 좋은 걸 사면 있던 게 빠져요.
          </Text>
          {FURNITURE.map((piece) => (
            <FurnitureRow key={piece.id} piece={piece} shop={shop} />
          ))}
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tab: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tabOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tabText: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  tabTextOn: { color: colors.accent, fontWeight: "800" },
  dollRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  doll: { width: 96 },
  dollBody: { flex: 1 },
  enrolled: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  enrolledText: { color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 },
  tryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  buy: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  buyOff: { backgroundColor: colors.faint },
  buyText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  tryOff: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  tryOffText: { color: colors.textDim, fontWeight: "700", fontSize: 12 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: paper.bg,
    borderColor: colors.faint,
    borderWidth: 1,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.gold },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  culture: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cultureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cultureName: { color: colors.textDim, fontSize: 12, width: 32 },
  cultureValue: {
    color: colors.textDim,
    fontSize: 11,
    width: 24,
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  picture: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pictureArt: { width: 40, height: 40 },
  badge: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: paper.bg,
    borderColor: colors.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700", lineHeight: 21 },
  detail: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  note: { color: colors.gold, fontSize: 11, lineHeight: 16 },
  price: { color: colors.accent, fontSize: 14, fontWeight: "800" },
  priceOff: { color: colors.textDim },
});
