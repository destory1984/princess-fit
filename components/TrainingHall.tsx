import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { BodyMap } from '@/components/BodyMap';
import { OrnateFrame } from '@/components/OrnateFrame';
import { STAT_META, STAT_ORDER, type Stats } from '@/lib/character';
import { paper, spacing } from '@/lib/theme';
import type { Slug } from 'react-native-body-highlighter';

const WALL = '#3A2B26';
const WALL_DARK = '#2E211D';
const FLOOR = '#6B4A31';
const FLOOR_DARK = '#573B27';
const WOOD = '#8A5E3C';
const IRON = '#4A4A52';
const GLOW = '#F0D9A8';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  today: Date;
  rank: string;
  level: number;
  archetype: string;
  condition: string;
  stats: Stats;
  streak: number;
  trained: { slug: Slug; intensity: number }[];
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
  trained,
}: Props) {
  return (
    <View style={styles.frameOuter}>
      <View style={styles.frameInner}>
        <View style={styles.scene}>
          <Svg viewBox="0 0 320 240" width="100%" height="100%">
            <Rect x={0} y={0} width={320} height={172} fill={WALL} />
            {Array.from({ length: 16 }, (_, i) => (
              <Rect key={i} x={i * 20} y={0} width={9} height={172} fill={WALL_DARK} opacity={0.5} />
            ))}

            <Rect x={0} y={166} width={320} height={8} fill={WOOD} />
            <Rect x={0} y={174} width={320} height={66} fill={FLOOR} />
            {Array.from({ length: 7 }, (_, i) => (
              <Line
                key={i}
                x1={-20 + i * 55}
                y1={240}
                x2={60 + i * 34}
                y2={174}
                stroke={FLOOR_DARK}
                strokeWidth={1.5}
              />
            ))}
            <Line x1={0} y1={200} x2={320} y2={200} stroke={FLOOR_DARK} strokeWidth={1.5} />

            <G>
              <Rect x={126} y={22} width={68} height={62} fill={WOOD} rx={2} />
              <Rect x={130} y={26} width={60} height={54} fill={GLOW} opacity={0.85} />
              <Line x1={160} y1={26} x2={160} y2={80} stroke={WOOD} strokeWidth={3} />
              <Line x1={130} y1={53} x2={190} y2={53} stroke={WOOD} strokeWidth={3} />
            </G>

            <G>
              <Rect x={240} y={104} width={52} height={46} fill="#7A2E24" rx={2} />
              <Rect x={244} y={108} width={44} height={38} fill="#8E382C" rx={1} />
              <Circle cx={266} cy={121} r={8} fill={GLOW} opacity={0.85} />
              <Rect x={252} y={133} width={28} height={4} rx={2} fill={GLOW} opacity={0.7} />
            </G>

            <G>
              <Rect x={104} y={208} width={30} height={5} rx={2} fill={IRON} />
              <Circle cx={104} cy={210} r={7} fill="#35353C" />
              <Circle cx={134} cy={210} r={7} fill="#35353C" />
            </G>

            <G>
              <Rect x={26} y={34} width={54} height={86} rx={3} fill={WOOD} />
              <Rect x={30} y={38} width={46} height={78} rx={2} fill="#8FA2AD" opacity={0.55} />
              <Path d="M34 112 L70 42" stroke="#D7E4EC" strokeWidth={3} opacity={0.5} />
            </G>

            <G>
              <Rect x={104} y={126} width={112} height={7} rx={3} fill={IRON} />
              <Rect x={100} y={118} width={8} height={23} rx={2} fill={IRON} />
              <Rect x={212} y={118} width={8} height={23} rx={2} fill={IRON} />
              <Circle cx={114} cy={129} r={9} fill={IRON} />
              <Circle cx={206} cy={129} r={9} fill={IRON} />
            </G>

            <G>
              <Rect x={18} y={186} width={74} height={9} rx={4} fill="#2F2A2E" />
              <Rect x={26} y={195} width={6} height={22} fill={IRON} />
              <Rect x={78} y={195} width={6} height={22} fill={IRON} />
            </G>

            <G>
              <Rect x={268} y={190} width={26} height={26} rx={3} fill={WOOD} />
              <Ellipse cx={281} cy={184} rx={16} ry={12} fill="#4E7A46" />
              <Ellipse cx={270} cy={178} rx={10} ry={8} fill="#5E8E54" />
              <Ellipse cx={292} cy={179} rx={9} ry={7} fill="#456B3E" />
            </G>
          </Svg>

          <View style={styles.character} pointerEvents="none">
            <BodyMap data={trained} scale={0.42} labels={false} fill="#C9BDA8" />
          </View>

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
  frameOuter: {
    backgroundColor: paper.line,
    borderRadius: 6,
    padding: 3,
  },
  frameInner: {
    borderColor: paper.bg,
    borderWidth: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scene: { aspectRatio: 4 / 3, backgroundColor: WALL },
  character: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '4%',
    alignItems: 'center',
  },

  datePlaque: { position: 'absolute', top: 8, left: 8, minWidth: 92 },
  dateMonth: { textAlign: 'center', color: paper.inkDim, fontSize: 10, fontWeight: '700' },
  dateDay: { textAlign: 'center', color: paper.ink, fontSize: 26, fontWeight: '800', lineHeight: 30 },
  dateWeekday: { textAlign: 'center', color: paper.accent, fontSize: 10, fontWeight: '700' },

  statusPanel: { position: 'absolute', top: 8, right: 8, minWidth: 146 },
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
