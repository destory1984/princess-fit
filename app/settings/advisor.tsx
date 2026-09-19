import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { Portrait } from '@/components/Portrait';
import { ADVISORS, DEFAULT_ADVISOR_ID } from '@/lib/advisors';
import { notify } from '@/lib/confirm';
import { portraitOf } from '@/lib/portraits';
import { getAdvisorId, setAdvisorId } from '@/lib/prefs';
import { colors, radius, spacing } from '@/lib/theme';

/** Pick who keeps you company, with all six shown face-up. */
export default function AdvisorScreen() {
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>고른 사람이 첫 화면과 종목 설명에서 말을 걸어요.</Text>

      {ADVISORS.map((a) => {
        const on = a.id === id;
        return (
          <Pressable
            key={a.id}
            style={[styles.card, on && styles.cardOn]}
            onPress={() => choose(a.id)}>
            <Portrait source={portraitOf(a.id)} size={72} active={on} />
            <View style={styles.body}>
              <Text style={[styles.name, on && styles.nameOn]}>{a.name}</Text>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.blurb}>{a.blurb}</Text>
            </View>
            {on && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  hint: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.md,
  },
  cardOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  body: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  nameOn: { color: colors.accent },
  title: { color: colors.gold, fontSize: 12, lineHeight: 17 },
  blurb: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
