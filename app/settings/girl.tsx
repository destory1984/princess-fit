import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Portrait } from '@/components/Portrait';
import { ADVISORS } from '@/lib/advisors';
import { notify } from '@/lib/confirm';
import { useGirlChoice } from '@/lib/girl';
import { portraitOf } from '@/lib/portraits';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * Who you are raising.
 *
 * Three, all of them choosable. A girl needs a gym-clothes base before she can
 * be here at all — that base is the body every garment layers over — so the
 * ones still waiting on art are in `UPCOMING` and not on this screen. Three
 * locked doors beside three open ones only make the choice look smaller.
 *
 * Switching takes nothing away. The gold, the clothes and the room belong to
 * the household rather than to her, so a change decides who wears the dresses,
 * never whether they were bought.
 */
export default function GirlScreen() {
  const { girl, choose } = useGirlChoice();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        바꿔도 모아 둔 골드와 옷, 방은 그대로예요. 누가 입을지만 달라져요.
      </Text>

      {ADVISORS.map((entry) => {
        const on = entry.id === girl.id;
        return (
          <Pressable
            key={entry.id}
            style={[styles.card, on && styles.cardOn]}
            onPress={() => {
              if (on) {
                notify(`${entry.name}는 이미 함께 있어요.`);
                return;
              }
              void choose(entry.id);
            }}>
            <Portrait source={portraitOf(entry.id)} size={64} active={on} />
            <View style={styles.body}>
              <Text style={[styles.name, on && styles.nameOn]}>{entry.name}</Text>
              <Text style={styles.blurb}>{entry.blurb}</Text>
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
  blurb: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
