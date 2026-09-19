import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Portrait } from '@/components/Portrait';
import { ADVISORS, DEFAULT_ADVISOR_ID } from '@/lib/advisors';
import { notify } from '@/lib/confirm';
import { portraitOf } from '@/lib/portraits';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * Who you are raising.
 *
 * Only one of them can be dressed, because the paper doll is her body: the
 * base is drawn in gym clothes so garments layer over it, and every other girl
 * would need the same picture before she could wear anything. The rest are
 * shown with their portraits and marked 준비 중, which is more honest than
 * hiding them and more useful than offering a choice that breaks the wardrobe.
 */
export default function GirlScreen() {
  const chosen = DEFAULT_ADVISOR_ID;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        함께 지낼 아이예요. 옷을 갈아입히려면 그 아이의 체육복 그림이 있어야 해서,
        지금은 리나만 고를 수 있어요.
      </Text>

      {ADVISORS.map((girl) => {
        const on = girl.id === chosen;
        return (
          <Pressable
            key={girl.id}
            style={[styles.card, on && styles.cardOn, !girl.playable && styles.cardOff]}
            disabled={!girl.playable}
            onPress={() => notify(`${girl.name}는 이미 함께 있어요.`)}>
            <Portrait source={portraitOf(girl.id)} size={64} active={on} />
            <View style={styles.body}>
              <Text style={[styles.name, on && styles.nameOn]}>{girl.name}</Text>
              <Text style={styles.blurb}>{girl.blurb}</Text>
              {!girl.playable && <Text style={styles.soon}>준비 중 · 체육복 그림이 필요해요</Text>}
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
