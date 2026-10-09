import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { pauseNotice } from '@/lib/pause';
import { colors, radius, spacing } from '@/lib/theme';

/** The maker's word that work has stopped for a while. Gone after its last day. */
export function PauseCard({ today }: { today: Date }) {
  const text = pauseNotice(today);
  if (!text) return null;

  return (
    <View style={styles.card}>
      <Ionicons name="megaphone-outline" size={18} color={colors.textDim} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  text: { color: colors.text, fontSize: 15, lineHeight: 22, flex: 1 },
});
