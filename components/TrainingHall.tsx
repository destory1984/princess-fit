import { Image, StyleSheet, Text, View } from 'react-native';
import { OrnateFrame } from '@/components/OrnateFrame';
import { STAT_META, STAT_ORDER, type Stats } from '@/lib/character';
import { artFor } from '@/lib/furnitureArt';
import { roomContents } from '@/lib/room';
import { colors, paper, spacing } from '@/lib/theme';

const ROOM = require('../assets/room.png');

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  today: Date;
  rank: string;
  level: number;
  archetype: string;
  condition: string;
  stats: Stats;
  streak: number;
  /** Ids of the furniture she owns; the cot is always there underneath. */
  furniture?: string[];
  /** Why the numbers are lower than they were, when they are. */
  penalty?: string | null;
  /** The girl herself, standing in the room. */
  advisorArt?: number | null;
  /** A line about how furnished the room is, shown beneath it. */
  caption?: string;
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
  advisorArt,
  caption,
}: Props) {
  return (
    <View style={styles.frameOuter}>
      <View style={styles.frameInner}>
        <View style={styles.scene}>
          <Image source={ROOM} style={styles.room} resizeMode="cover" />

          {roomContents(furniture)
            .filter((piece) => !piece.paintedIn)
            .map((piece) => {
              const art = artFor(piece.id);
              const box = {
                left: `${piece.place.x * 100}%` as const,
                top: `${piece.place.y * 100}%` as const,
                width: `${piece.place.w * 100}%` as const,
              };
              // Until a sprite exists, a plaque stands in so the purchase is
              // visibly in the room rather than only in the database.
              return art ? (
                <Image key={piece.id} source={art} style={[styles.piece, box]} resizeMode="contain" />
              ) : (
                <View key={piece.id} style={[styles.plaque, box]}>
                  <Text style={styles.plaqueText} numberOfLines={1}>
                    {piece.name}
                  </Text>
                </View>
              );
            })}

          {advisorArt ? (
            <Image source={advisorArt} style={styles.girl} resizeMode="contain" />
          ) : null}

          <OrnateFrame compact style={styles.datePlaque}>
            <Text style={styles.dateMonth}>
              {today.getFullYear()}년 {today.getMonth() + 1}월
            </Text>
            <Text style={styles.dateDay}>{today.getDate()}</Text>
            <Text style={styles.dateWeekday}>{WEEKDAYS[today.getDay()]}요일</Text>
          </OrnateFrame>

          <OrnateFrame compact style={styles.statusPanel}>
            <Text style={styles.statusName}>{archetype}</Text>
            <Text style={styles.statusRank}>
              제 {level} 품 · {rank}
            </Text>
            <Text style={styles.statusCondition}>{condition}</Text>
            <View style={styles.statusNumbers}>
              {STAT_ORDER.map((key) => (
                <View key={key} style={styles.statusStat}>
                  <Text style={styles.statusStatLabel}>{STAT_META[key].name[0]}</Text>
                  <Text style={styles.statusStatValue}>{stats[key]}</Text>
                </View>
              ))}
            </View>
            {streak > 0 && <Text style={styles.statusStreak}>연속 {streak}일</Text>}
            {penalty ? <Text style={styles.statusPenalty}>{penalty}</Text> : null}
          </OrnateFrame>
        </View>

        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: paper.inkDim,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingVertical: 5,
    backgroundColor: paper.bgAlt,
  },
  piece: { position: 'absolute', height: undefined, aspectRatio: 1 },
  // Anchored to the floor and placed right of the window, clear of the plaques
  // above and of the bed on the left.
  girl: {
    position: 'absolute',
    bottom: '2%',
    left: '52%',
    width: '40%',
    height: '58%',
  },
  plaque: {
    position: 'absolute',
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  plaqueText: { color: colors.text, fontSize: 9, lineHeight: 13, textAlign: 'center' },
  statusPenalty: { color: colors.accent, fontSize: 9, lineHeight: 13, marginTop: 2 },
  frameOuter: { backgroundColor: paper.line, borderRadius: 8, padding: 3 },
  frameInner: {
    borderColor: paper.bg,
    borderWidth: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  scene: { backgroundColor: paper.bgAlt },
  // A banner, not the whole screen: the rest of the page has to fit under it.
  // 3:2, the artwork's own ratio — anything else crops the window out.
  room: { width: '100%', aspectRatio: 3 / 2, maxHeight: 280 },

  datePlaque: { position: 'absolute', top: 10, left: 10, minWidth: 92 },
  dateMonth: { textAlign: 'center', color: paper.inkDim, fontSize: 10, fontWeight: '700' },
  dateDay: {
    textAlign: 'center',
    color: paper.ink,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  dateWeekday: { textAlign: 'center', color: paper.accent, fontSize: 10, fontWeight: '700' },

  statusPanel: { position: 'absolute', top: 10, right: 10, minWidth: 146 },
  statusName: { color: paper.ink, fontSize: 14, fontWeight: '800' },
  statusRank: { color: paper.inkDim, fontSize: 10, fontWeight: '700' },
  statusCondition: { color: paper.accent, fontSize: 11, fontWeight: '700', marginTop: 2 },
  statusNumbers: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    borderTopColor: paper.lineSoft,
    borderTopWidth: 1,
    paddingTop: 3,
  },
  statusStat: { alignItems: 'center', minWidth: 20 },
  statusStatLabel: { color: paper.inkDim, fontSize: 9, fontWeight: '700' },
  statusStatValue: { color: paper.ink, fontSize: 12, fontWeight: '800' },
  statusStreak: { color: paper.inkDim, fontSize: 10, marginTop: 2 },
});
