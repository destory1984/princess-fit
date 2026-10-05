import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Advisor } from '@/components/Advisor';
import {
  CONTESTS,
  FAVOUR_BONUS,
  FULL_FORM_DAYS,
  daysUntil,
  prizeFor,
  rumourOf,
  scoreOf,
  type ContestId,
  type Festival,
  type Standing,
} from '@/lib/festival';
import { rivalArt } from '@/lib/festivalArt';
import { Portrait } from '@/components/Portrait';
import { faceArt } from '@/lib/outfitArt';
import { voiceOf } from '@/lib/voices';
import { colors, paper, spacing } from '@/lib/theme';

type Props = {
  festival: Festival;
  today: Date;
  girl: { id: string; name: string; base: number };
  /** Where she stands today, which is the best guess at the day. */
  standing: Standing;
  formDays: number;
  /** Which of her festivals it will be, which is how good the rivals are. */
  index: number;
  entry: ContestId;
  onChoose?: (id: ContestId) => void;
};

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * The festival to come, and the one choice it asks for: where she goes.
 *
 * Her score and the rivals' are shown side by side because a festival is a
 * thing to aim at, and nobody can aim at a number they are not shown. The
 * rivals are fictional and the same for everyone, so this is not the
 * leaderboard NOTES.md keeps out — there is no one real to beat.
 */
export function FestivalAhead({ festival, today, girl, standing, formDays, index, entry, onChoose }: Props) {
  const left = daysUntil(festival, today);
  const date = new Date(`${festival.day}T12:00:00`);
  const chosen = CONTESTS.find((c) => c.id === entry)!;
  const dimmed = standing.factor < 0.99;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>
          {festival.month}월 {festival.name}
        </Text>
        <Text style={styles.when}>
          {date.getMonth() + 1}월 {date.getDate()}일 {WEEKDAY[date.getDay()]}요일 ·{' '}
          <Text style={styles.left}>{left === 0 ? '오늘' : `${left}일 남음`}</Text>
        </Text>
      </View>

      <Advisor name={girl.name} portrait={girl.base}>
        {voiceOf(girl.id).festival.ahead(chosen.name, left)}
      </Advisor>

      <View style={styles.form}>
        <Ionicons name="flame-outline" size={16} color={colors.accent} />
        <Text style={styles.formText}>
          기세 <Text style={styles.strong}>{standing.form}</Text> · 최근 4주에 운동한 날{' '}
          <Text style={styles.strong}>{formDays}</Text>/{FULL_FORM_DAYS}
        </Text>
      </View>
      <View style={styles.form}>
        <Ionicons name="heart-outline" size={16} color={colors.accent} />
        <Text style={styles.formText}>
          지난 축제 뒤로 들어준 부탁 <Text style={styles.strong}>{standing.favours}</Text>번 · 모든 대회{' '}
          <Text style={styles.strong}>+{FAVOUR_BONUS * standing.favours}</Text>
        </Text>
      </View>
      {dimmed && (
        <Text style={styles.warn}>
          배고프거나 옷이 해져서 점수가 {Math.round((1 - standing.factor) * 100)}% 깎여 있어요. 축제 전에 챙겨 주세요.
        </Text>
      )}

      {CONTESTS.map((c) => {
        const mine = scoreOf(c.id, standing);
        const rivals = rumourOf(c.id, index);
        const on = c.id === entry;
        return (
          <Pressable
            key={c.id}
            style={[styles.card, on && styles.cardOn]}
            onPress={() => onChoose?.(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}>
            <View style={styles.cardHead}>
              <Ionicons name={c.icon as never} size={18} color={on ? colors.accent : colors.textDim} />
              <Text style={[styles.cardName, on && styles.cardNameOn]}>{c.name}</Text>
              {on ? (
                <Text style={styles.badge}>나갈 곳</Text>
              ) : (
                <Text style={styles.pick}>여기로 →</Text>
              )}
            </View>
            <Text style={styles.hint}>{c.hint}</Text>
            <Bar label={`${girl.name} (지금)`} value={mine} her face={<Portrait source={faceArt(girl.id, 'fine')} size={FACE} />} />
            {rivals.map((r) => (
              <Bar
                key={r.name}
                label={`${r.name} · ${r.from}`}
                value={r.about}
                about
                face={rivalArt(r.name) ? <Image source={rivalArt(r.name)} style={styles.face} /> : undefined}
              />
            ))}
          </Pressable>
        );
      })}

      <Text style={styles.rules}>
        매달 마지막 토요일에 열리고, 결과는 다음 날 알려 드려요. 그날까지의 기록으로 겨뤄요. 상금은 1등{' '}
        {prizeFor(1)}G · 2등 {prizeFor(2)}G · 3등 {prizeFor(3)}G, 나가기만 해도 {prizeFor(4)}G.
      </Text>
    </View>
  );
}

/** The width of a face at the head of a bar. */
const FACE = 24;

function Bar({
  label,
  value,
  her,
  about,
  face,
}: {
  label: string;
  value: number;
  her?: boolean;
  about?: boolean;
  /** Who the bar is: a rival you can picture is one you look forward to meeting. */
  face?: ReactNode;
}) {
  return (
    <View style={styles.bar}>
      {face ?? <View style={styles.face} />}
      <Text style={[styles.barLabel, her && styles.barLabelHer]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, her && styles.fillHer, { width: `${Math.min(100, value)}%` }]} />
      </View>
      <Text style={[styles.barValue, her && styles.barLabelHer]}>{about ? `${value}쯤` : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  head: { alignItems: 'center', gap: 2 },
  title: { color: paper.ink, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  when: { color: colors.textDim, fontSize: 15 },
  left: { color: colors.accent, fontWeight: '800' },
  form: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  formText: { color: colors.text, fontSize: 15, flex: 1 },
  strong: { fontWeight: '800' },
  warn: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: paper.bgAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardOn: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: colors.surface },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  cardNameOn: { color: colors.accent },
  badge: {
    color: '#fff',
    backgroundColor: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pick: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 14, lineHeight: 20, marginBottom: spacing.xs },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  face: { width: FACE, height: FACE },
  barLabel: { width: 118, color: colors.textDim, fontSize: 13 },
  barLabelHer: { color: colors.accent, fontWeight: '800' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.faint },
  fillHer: { backgroundColor: colors.accent },
  barValue: { width: 36, textAlign: 'right', color: colors.textDim, fontSize: 13, fontVariant: ['tabular-nums'] },
  rules: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
});
