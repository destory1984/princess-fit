import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { ADVISORS, advisorById, DEFAULT_ADVISOR_ID } from '@/lib/advisors';
import { getAdvisorId, setAdvisorId } from '@/lib/prefs';
import { notify } from '@/lib/confirm';
import { colors, paper, spacing } from '@/lib/theme';

/** Stands in for a portrait that has not been dropped into assets yet. */
function Emblem({ size }: { size: number }) {
  return (
    <Svg viewBox="0 0 40 40" width={size} height={size}>
      <Circle cx={20} cy={20} r={18} fill={paper.bgAlt} stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M20 9 L23 17 L31 17 L25 22 L27 30 L20 25 L13 30 L15 22 L9 17 L17 17 Z" fill={colors.accent} opacity={0.8} />
    </Svg>
  );
}

/** Choose who keeps you company on the main screen. */
export function AdvisorPicker() {
  const [id, setId] = useState(DEFAULT_ADVISOR_ID);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getAdvisorId().then((saved) => alive && setId(saved));
      return () => {
        alive = false;
      };
    }, [])
  );

  async function choose(next: string) {
    const previous = id;
    setId(next);
    try {
      await setAdvisorId(next);
    } catch (e: any) {
      notify('저장 실패', e.message);
      setId(previous);
    }
  }

  const chosen = advisorById(id);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>함께할 사람</Text>
      <View style={styles.row}>
        {ADVISORS.map((a) => {
          const on = a.id === id;
          return (
            <Pressable key={a.id} onPress={() => choose(a.id)} style={styles.item}>
              <View style={[styles.frame, on && styles.frameOn]}>
                {a.portrait ? (
                  <Image source={a.portrait} style={styles.portrait} resizeMode="contain" />
                ) : (
                  <Emblem size={40} />
                )}
              </View>
              <Text style={[styles.name, on && styles.nameOn]}>{a.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.blurb}>
        {chosen.title} · {chosen.blurb}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: 2 },
  item: { alignItems: 'center', gap: 4, width: 64 },
  frame: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: paper.bgAlt,
    borderColor: colors.faint,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frameOn: { borderColor: colors.accent, borderWidth: 3 },
  portrait: { width: '100%', height: '100%' },
  name: { color: colors.textDim, fontSize: 12, lineHeight: 17 },
  nameOn: { color: colors.accent, fontWeight: '800' },
  blurb: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
