import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Portrait } from '@/components/Portrait';
import { useFocusEffect } from 'expo-router';
import { ADVISORS, advisorById, DEFAULT_ADVISOR_ID } from '@/lib/advisors';
import { getAdvisorId, setAdvisorId } from '@/lib/prefs';
import { notify } from '@/lib/confirm';
import { colors, paper, spacing } from '@/lib/theme';

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
              <Portrait source={a.portrait} size={60} active={on} />
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
  name: { color: colors.textDim, fontSize: 12, lineHeight: 17 },
  nameOn: { color: colors.accent, fontWeight: '800' },
  blurb: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
