import { Image, StyleSheet, Text, View } from 'react-native';
import { OrnateFrame } from '@/components/OrnateFrame';
import { STAT_META, STAT_ORDER, type Stats } from '@/lib/character';
import { paper, spacing } from '@/lib/theme';

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
}: Props) {
  return (
    <View style={styles.frameOuter}>
      <View style={styles.frameInner}>
        <View style={styles.scene}>
          {/* Capped and contained, so the whole room fits on screen at once. */}
          <Image source={ROOM} style={styles.room} resizeMode="contain" />

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
          </OrnateFrame>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frameOuter: { backgroundColor: paper.line, borderRadius: 8, padding: 3 },
  frameInner: {
    borderColor: paper.bg,
    borderWidth: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  scene: { backgroundColor: paper.bgAlt },
  room: { width: '100%', aspectRatio: 3 / 4, maxHeight: 360 },

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
