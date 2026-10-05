import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { PaperDoll } from "@/components/PaperDoll";
import { STAT_META, STAT_ORDER, type Stats } from "@/lib/character";
import { artFor } from "@/lib/furnitureArt";
import { TROPHY } from "@/lib/festivalArt";
import { rankArt } from "@/lib/rankArt";
import { DOLL_ASPECT } from "@/lib/outfitArt";
import { roomContents } from "@/lib/room";
import { roomArt } from "@/lib/roomArt";
import type { Girl } from "@/lib/girl";
import { colors, paper } from "@/lib/theme";

// Where the first cup stands on the sill, as fractions of the room, and how far
// along the next one is. Placed by eye against the room art (the sill runs from
// 0.52 to 0.70 across, at 0.56 down).
const TROPHY_AT = { x: 0.535, y: 0.475, w: 0.05, step: 0.055 };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Her plaque. Left out when visiting a friend: their numbers are theirs. */
type Status = {
  rank: string;
  level: number;
  archetype: string;
  condition: string;
  stats: Stats;
  streak: number;
};

type Props = Partial<Status> & {
  today: Date;
  /** Someone else's girl, when visiting. */
  girl?: Girl;
  /** Ids of the furniture she owns; the cot is always there underneath. */
  furniture?: string[];
  /** Why the numbers are lower than they were, when they are. */
  penalty?: string | null;
  /** The garments she has on, layered over the base girl. */
  worn?: string[];
  /** A line about how furnished the room is, shown beneath it. */
  caption?: string;
  /** Cups she has won at the festival (lib/festival.ts trophiesOf), stood on the window sill. */
  trophies?: number;
};

/** The main hall: a room you stand in, with plaques pinned to its corners. */
export function TrainingHall({
  today,
  rank,
  level,
  archetype,
  condition,
  stats,
  streak,
  furniture = [],
  penalty,
  worn = [],
  caption,
  girl,
  trophies = 0,
}: Props) {
  // Everything in the scene — the girl, every piece of furniture — is placed
  // as a fraction of it, so the scene has to be exactly the artwork's 3:2.
  // Neither aspectRatio nor a percentage height survives contact with an
  // image this large: both lose to its intrinsic size. So measure the width
  // the layout gives us and set every size from that, in real pixels.
  const [width, setWidth] = useState(0);
  const scene = { width, height: (width * 2) / 3 };
  const girlHeight = scene.height * 0.7;

  const inRoom = roomContents(furniture).filter((piece) => !piece.paintedIn);
  const drawn = inRoom.filter((piece) => artFor(piece.id));
  const unpictured = inRoom.filter((piece) => !artFor(piece.id));
  const girlWidth = girlHeight * DOLL_ASPECT;

  return (
    <View style={styles.frameOuter}>
      <View style={styles.frameInner}>
        <View
          style={[styles.scene, { height: scene.height }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          <Image source={roomArt(today)} style={styles.room} resizeMode="cover" />

          {/*
            The room art is as crisp as she is, so the two compete and she
            disappears into it. A warm wash pushes the room back a step —
            placed here, so everything drawn after it stays at full strength.
          */}
          <View style={styles.wash} />

          {scene.width > 0 &&
            drawn.map((piece) => {
              const art = artFor(piece.id)!;
              const width = scene.width * piece.place.w;
              return (
                <Image
                  key={piece.id}
                  source={art.source}
                  resizeMode="contain"
                  style={[
                    styles.piece,
                    {
                      left: scene.width * piece.place.x,
                      top: scene.height * piece.place.y,
                      width,
                      height: width / art.aspect,
                    },
                  ]}
                />
              );
            })}

          {/*
            What she won, where it can be seen from the door: on the window
            sill, behind the bench and clear of the curtains. Won, never
            bought, so it is not furniture and has no slot.
          */}
          {scene.width > 0 &&
            Array.from({ length: trophies }, (_, i) => (
              <Image
                key={`trophy-${i}`}
                source={TROPHY}
                resizeMode="contain"
                style={[
                  styles.piece,
                  {
                    left: scene.width * (TROPHY_AT.x + i * TROPHY_AT.step),
                    top: scene.height * TROPHY_AT.y,
                    width: scene.width * TROPHY_AT.w,
                    height: scene.width * TROPHY_AT.w,
                  },
                ]}
              />
            ))}

          {/* Without the shadow she floats a little above the floorboards. */}
          <View style={styles.girlShadow} />
          {scene.height > 0 && (
            <PaperDoll
              worn={worn}
              girl={girl}
              style={{
                position: "absolute",
                bottom: scene.height * 0.02,
                // Centred at 31% across: at the foot of the bed, clear of the window.
                left: scene.width * 0.31 - girlWidth / 2,
                width: girlWidth,
                height: girlHeight,
              }}
            />
          )}

          {/*
            One line, not a three-line plaque: the plaque reached down to her
            head, and Yuki's ribbon and Pia's bun went under it. The year is
            dropped — nobody looks at her room to learn what year it is.
          */}
          <View style={styles.datePlaque}>
            <Text style={styles.dateDay}>
              {today.getMonth() + 1}월 {today.getDate()}일
            </Text>
            <Text style={styles.dateWeekday}>{WEEKDAYS[today.getDay()]}요일</Text>
          </View>

        </View>

        {/*
          Her plaque sits under the room, not in it. Pinned to the top right
          corner it covered the right half of the scene on a phone — the
          window, the curtain, the bench, the bookcase — so most of what had
          been bought for the room could not be seen in it.
        */}
        {stats && (
          <View style={styles.statusPanel}>
            <View style={styles.statusHead}>
              <View style={styles.statusLead}>
                <Image source={rankArt(level ?? 1)} style={styles.statusBadge} />
                <View style={styles.statusWho}>
                  <Text style={styles.statusName}>{archetype}</Text>
                  <Text style={styles.statusRank}>
                    제 {level} 품 · {rank}
                  </Text>
                </View>
              </View>
              <View style={styles.statusNumbers}>
                {STAT_ORDER.map((key) => (
                  <View key={key} style={styles.statusStat}>
                    <Text style={styles.statusStatLabel}>
                      {STAT_META[key].short}
                    </Text>
                    <Text style={styles.statusStatValue}>{stats[key]}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.statusCondition}>
              {condition}
              {!!streak && (
                <Text style={styles.statusStreak}> · 연속 {streak}일</Text>
              )}
            </Text>
            {penalty ? (
              <Text style={styles.statusPenalty}>{penalty}</Text>
            ) : null}
          </View>
        )}

        {caption ? <Text style={styles.caption}>{caption}</Text> : null}

        {/*
          Pieces whose art has not arrived yet, named under the room rather
          than in it. Standing them inside put a label on the floorboards
          beside her, which reads as a price tag rather than as furniture —
          and a name on a rug is not a rug however honestly it is written.
        */}
        {unpictured.length > 0 && (
          <Text style={styles.missing} numberOfLines={2}>
            들여둔 것 · {unpictured.map((piece) => piece.name).join(" · ")}
            {"  (그림은 준비 중이에요)"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: paper.inkDim,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 5,
    backgroundColor: paper.bgAlt,
  },
  // Width comes from the room data; aspectRatio from the art itself.
  piece: { position: "absolute" },
  wash: {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: paper.bg,
    opacity: 0.25,
  },
  girlShadow: {
    pointerEvents: "none",
    position: "absolute",
    bottom: "3%",
    left: "23%",
    width: "16%",
    height: 10,
    borderRadius: 999,
    backgroundColor: paper.ink,
    opacity: 0.18,
  },
  missing: {
    color: paper.inkDim,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 6,
    paddingBottom: 5,
    backgroundColor: paper.bgAlt,
  },
  statusPenalty: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  // Capping the whole card keeps the scene at 3:2 on a wide screen without
  // a gold frame stretching away from it.
  frameOuter: {
    backgroundColor: paper.line,
    borderRadius: 8,
    padding: 3,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  frameInner: {
    borderColor: paper.bg,
    borderWidth: 2,
    borderRadius: 5,
    overflow: "hidden",
  },
  // The scene must be exactly the artwork's 3:2, because everything in it —
  // the girl, every piece of furniture — is placed as a fraction of it. Cap
  // the width rather than the height: capping height cropped the art and left
  // every fraction pointing somewhere else.
  scene: { backgroundColor: paper.bgAlt },
  room: { width: "100%", height: "100%" },

  datePlaque: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
  },
  dateDay: { color: paper.ink, fontSize: 15, fontWeight: "800" },
  dateWeekday: { color: paper.accent, fontSize: 12, fontWeight: "700" },

  statusPanel: {
    backgroundColor: paper.bgAlt,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomColor: paper.lineSoft,
    borderBottomWidth: 1,
  },
  statusHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusLead: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  statusBadge: { width: 32, height: 32 },
  statusWho: { flexShrink: 1 },
  statusName: { color: paper.ink, fontSize: 16, fontWeight: "800" },
  statusRank: { color: paper.inkDim, fontSize: 12, fontWeight: "700" },
  statusCondition: {
    color: paper.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  statusNumbers: { flexDirection: "row", gap: 6 },
  statusStat: { alignItems: "center", minWidth: 28 },
  statusStatLabel: { color: paper.inkDim, fontSize: 11, fontWeight: "700" },
  statusStatValue: { color: paper.ink, fontSize: 16, fontWeight: "800" },
  statusStreak: { color: paper.inkDim, fontSize: 12, fontWeight: "400" },
});
