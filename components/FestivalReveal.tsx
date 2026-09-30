import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Advisor } from '@/components/Advisor';
import { festivalTitle, type Result } from '@/lib/festival';
import { voiceOf } from '@/lib/voices';
import { colors, paper, spacing } from '@/lib/theme';

type Props = {
  result: Result;
  /** Who went: her name goes on her own row, and her voice tells it. */
  girl: { id: string; name: string; base: number };
  /** Gold it paid, when this is the moment it was paid. */
  prize?: number;
  /** Read out one place at a time, last to first. Off once it has been seen. */
  animate: boolean;
};

const STEP_MS = 900;

/**
 * The results, called out from the bottom up the way a stage announces them.
 *
 * Shown all at once would be a table. The wait between places is the whole
 * of the festival's drama, and it costs four seconds — a tap skips it for
 * anyone who would rather just know.
 */
export function FestivalReveal({ result, girl, prize, animate }: Props) {
  const total = result.entries.length;
  const [shown, setShown] = useState(animate ? 0 : total);

  useEffect(() => {
    if (shown >= total) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : STEP_MS);
    return () => clearTimeout(t);
  }, [shown, total]);

  const done = shown >= total;
  const winner = result.entries[0];
  const said = voiceOf(girl.id).festival.place[result.place](
    result.contestName,
    winner.her ? girl.name : winner.name
  );

  return (
    <Pressable onPress={() => setShown(total)} disabled={done}>
      <View style={styles.head}>
        <Text style={styles.title}>{festivalTitle(result)}</Text>
        <Text style={styles.contest}>{result.contestName}</Text>
      </View>

      <View style={styles.board}>
        {result.entries.map((e, i) => {
          // Places are uncovered from the last: row i is shown once the
          // (total - i)-th call has been made.
          const visible = total - i <= shown;
          const place = i + 1;
          return (
            <View key={`${e.name}-${i}`} style={[styles.row, e.her && visible && styles.rowHer]}>
              <View style={[styles.medal, visible && place <= 3 && medal[place as 1 | 2 | 3]]}>
                <Text style={[styles.medalText, visible && place <= 3 && styles.medalTextOn]}>{place}</Text>
              </View>
              {visible ? (
                <>
                  <View style={styles.who}>
                    <Text style={[styles.name, e.her && styles.nameHer]}>{e.her ? girl.name : e.name}</Text>
                    <Text style={styles.from}>{e.her ? '우리 집' : e.from}</Text>
                  </View>
                  <Text style={[styles.score, e.her && styles.nameHer]}>{e.score}</Text>
                </>
              ) : (
                <Text style={styles.hidden}>· · ·</Text>
              )}
            </View>
          );
        })}
      </View>

      {done ? (
        <View style={styles.after}>
          <Advisor name={girl.name} portrait={girl.base}>
            {said}
          </Advisor>
          {prize ? (
            <View style={styles.prize}>
              <Ionicons name="trophy-outline" size={16} color={colors.gold} />
              <Text style={styles.prizeText}>상금 +{prize}G</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.skip}>누르면 바로 보여요</Text>
      )}
    </Pressable>
  );
}

const medal = StyleSheet.create({
  1: { backgroundColor: colors.gold, borderColor: colors.gold },
  2: { backgroundColor: '#B8B2A7', borderColor: '#B8B2A7' },
  3: { backgroundColor: '#B08457', borderColor: '#B08457' },
});

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 2, marginBottom: spacing.md },
  title: { color: paper.ink, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  contest: { color: colors.textDim, fontSize: 13 },
  board: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: paper.bgAlt,
    minHeight: 48,
  },
  rowHer: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  medal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: { color: colors.textDim, fontWeight: '800', fontSize: 12 },
  medalTextOn: { color: '#fff' },
  who: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  nameHer: { color: colors.accent },
  from: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  score: { color: colors.text, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hidden: { flex: 1, color: colors.faint, fontSize: 15, letterSpacing: 4 },
  after: { marginTop: spacing.lg, gap: spacing.md },
  prize: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  prizeText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  skip: { marginTop: spacing.md, textAlign: 'center', color: colors.textDim, fontSize: 11 },
});
