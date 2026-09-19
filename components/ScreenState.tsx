import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  /** Set when the load failed; otherwise this reads as still loading. */
  error?: string | null;
  onRetry?: () => void;
};

/** What a screen shows before its data arrives, or when it never did. */
export function ScreenState({ error, onRetry }: Props) {
  if (!error) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.textDim} />
      <Text style={styles.title}>불러오지 못했어요</Text>
      <Text style={styles.detail}>{error}</Text>
      {onRetry && (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  detail: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  retry: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryText: { color: '#fff', fontWeight: '800' },
});
