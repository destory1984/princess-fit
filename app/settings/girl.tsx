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
 * A girl can only be chosen once her gym-clothes base has been drawn, because
 * that base is the body every garment layers over — without it she could be
 * shown but never dressed. The rest are listed with their portraits and marked
 * 준비 중, which is more honest than hiding them and more useful than offering
 * a choice that would break the wardrobe.
 *
 * Switching takes nothing away. The gold, the clothes and the room belong to
 * the household rather than to her, so a change decides who wears the dresses,
 * never whether they were bought.
 */
export default function GirlScreen() {
  const { girl, choose } = useGirlChoice();
  const playable = ADVISORS.filter((a) => a.playable).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        {playable > 1
          ? '바꿔도 모아 둔 골드와 옷, 방은 그대로예요. 누가 입을지만 달라져요.'
          : '옷을 갈아입히려면 그 아이의 체육복 그림이 있어야 해서, 지금은 한 명만 고를 수 있어요.'}
      </Text>

      {ADVISORS.map((entry) => {
        const on = entry.id === girl.id;
        return (
          <Pressable
            key={entry.id}
            style={[styles.card, on && styles.cardOn, !entry.playable && styles.cardOff]}
            disabled={!entry.playable}
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
              {!entry.playable && (
                <Text style={styles.soon}>준비 중 · 체육복 그림이 필요해요</Text>
              )}
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
  cardOff: { opacity: 0.55 },
  body: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  nameOn: { color: colors.accent },
  blurb: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  soon: { color: colors.gold, fontSize: 11, lineHeight: 16 },
});
