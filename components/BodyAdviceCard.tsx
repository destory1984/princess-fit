import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BodyLog } from '@/lib/body';
import { bodyRuleAdvice, requestBodyAdvice } from '@/lib/bodyAdvice';
import { getAdviceByModel } from '@/lib/prefs';
import { colors, paper, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';

/**
 * A line under the readings. The rules' line shows at once and the model's
 * replaces it if one answers — the screen is for writing a number down, and
 * nobody should wait twenty seconds on a sentence to do that.
 *
 * Titled like the workout card: 「AI 한마디」 only when a model spoke.
 */
export function BodyAdviceCard({ logs }: { logs: BodyLog[] }) {
  const girl = useGirl();
  // The model's reply, kept with the readings it was about: once they
  // change, it is about something else and the rules speak until it answers.
  // And with who gave it: a different girl is a different reply.
  const [reply, setReply] = useState<{ about: BodyLog[]; by: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fresh = reply?.about === logs && reply.by === girl.id ? reply : null;
  const text = fresh?.text ?? bodyRuleAdvice(logs, undefined, girl.id);
  const source = fresh ? 'model' : 'rules';

  const ask = useCallback(
    (signal?: AbortSignal) => {
      getAdviceByModel().then((useModel) => {
        if (!useModel || signal?.aborted) return;
        setBusy(true);
        requestBodyAdvice(logs, signal, true, undefined, girl.id)
          .then((answer) => {
            if (signal?.aborted) return;
            setReply(answer.source === 'model' ? { about: logs, by: girl.id, text: answer.text } : null);
          })
          .finally(() => {
            if (!signal?.aborted) setBusy(false);
          });
      });
    },
    [logs, girl.id]
  );

  useEffect(() => {
    const controller = new AbortController();
    ask(controller.signal);
    return () => controller.abort();
  }, [ask]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons
          name={source === 'model' ? 'sparkles' : 'reader-outline'}
          size={16}
          color={colors.accent}
        />
        <Text style={styles.title}>{source === 'model' ? 'AI 한마디' : '몸의 흐름'}</Text>
        {busy && <Text style={styles.badge}>모델에게 묻는 중…</Text>}
        <Pressable hitSlop={8} disabled={busy} onPress={() => ask()}>
          <Ionicons name="refresh" size={16} color={busy ? colors.border : colors.textDim} />
        </Pressable>
      </View>
      <Text style={styles.text}>{text}</Text>
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
  text: { color: colors.text, fontSize: 14, lineHeight: 22 },
});
