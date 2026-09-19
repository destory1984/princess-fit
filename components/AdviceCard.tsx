import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { requestAdvice, type AdviceContext } from '@/lib/advice';
import { cacheAdvice, getCachedAdvice } from '@/lib/prefs';
import { colors, paper, radius, spacing } from '@/lib/theme';

/** `context` must keep a stable identity — a new object each render refetches. */
export function AdviceCard({ context }: { context: AdviceContext }) {
  const [text, setText] = useState('');
  const [source, setSource] = useState<'model' | 'rules'>('rules');
  const [busy, setBusy] = useState(true);

  const ask = useCallback(
    (signal?: AbortSignal) => {
      setBusy(true);
      requestAdvice(context, signal)
        .then(({ text: next, source: from }) => {
          if (signal?.aborted) return;
          setText(next);
          setSource(from);
          if (from === 'model') cacheAdvice(context.today.id, next);
        })
        .finally(() => {
          if (!signal?.aborted) setBusy(false);
        });
    },
    [context]
  );

  useEffect(() => {
    const controller = new AbortController();
    getCachedAdvice(context.today.id).then((cached) => {
      if (controller.signal.aborted) return;
      if (cached) {
        setText(cached);
        setSource('model');
        setBusy(false);
        return;
      }
      ask(controller.signal);
    });
    return () => controller.abort();
  }, [ask, context.today.id]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={16} color={colors.accent} />
        <Text style={styles.title}>AI 조언</Text>
        <Text style={styles.badge}>{source === 'model' ? '모델' : '규칙 기반'}</Text>
        <Pressable hitSlop={8} disabled={busy} onPress={() => ask()}>
          <Ionicons
            name="refresh"
            size={16}
            color={busy ? colors.border : colors.textDim}
          />
        </Pressable>
      </View>

      {busy ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>오늘 운동을 살펴보는 중…</Text>
        </View>
      ) : (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 },
  badge: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { color: colors.textDim, fontSize: 13 },
  text: { color: colors.text, fontSize: 14, lineHeight: 22 },
});
