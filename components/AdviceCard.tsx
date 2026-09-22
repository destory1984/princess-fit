import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { requestAdvice, type AdviceContext } from '@/lib/advice';
import { isEmptyWorkout } from '@/lib/gamification';
import { saveAdvice } from '@/lib/db';
import { cacheAdvice, getAdviceByModel, getCachedAdvice } from '@/lib/prefs';
import { colors, paper, radius, spacing } from '@/lib/theme';
import { useGirl } from '@/lib/girl';

type Saved = { text: string; source: string | null; speaker: string | null };

/**
 * `context` must keep a stable identity — a new object each render refetches.
 *
 * What was said is kept with who said it, and shown only while she is still
 * the one here. Switch girls and it is asked again in the new girl's voice:
 * 리나's gentle line under 유키's name is the wrong girl talking.
 */
export function AdviceCard({ context, saved }: { context: AdviceContext; saved?: Saved | null }) {
  const girl = useGirl();
  const [text, setText] = useState('');
  const [source, setSource] = useState<'model' | 'rules'>('rules');
  const [busy, setBusy] = useState(true);

  const ask = useCallback(
    (signal?: AbortSignal) => {
      setBusy(true);
      getAdviceByModel()
        .then((useModel) => requestAdvice(context, signal, useModel, girl.id))
        .then(({ text: next, source: from }) => {
          if (signal?.aborted) return;
          setText(next);
          setSource(from);
          if (from === 'model') cacheAdvice(context.today.id, next, girl.id);
          // Kept with the session too, so it survives a new phone and can be
          // read back later. Never allowed to interrupt: a sentence that did
          // not save is not worth a message to someone who just finished.
          void saveAdvice(context.today.id, next, from, girl.id).catch(() => {});
        })
        .finally(() => {
          if (!signal?.aborted) setBusy(false);
        });
    },
    [context, girl.id]
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getCachedAdvice(context.today.id), getAdviceByModel()]).then(([cached, useModel]) => {
      if (controller.signal.aborted) return;
      // An empty session's kept reply was the model comparing nothing with
      // last week; the rules have the one true thing to say instead.
      if (!isEmptyWorkout(context.today)) {
        // The session's own record first, the phone's copy second. Either
        // only if she said it — and a model's answer only while the model is
        // still wanted, since it is not shown to someone who switched it off.
        const kept: { text: string; source: 'model' | 'rules' } | null =
          saved?.speaker === girl.id && (saved.source !== 'model' || useModel)
            ? { text: saved.text, source: saved.source === 'model' ? 'model' : 'rules' }
            : cached?.speaker === girl.id && useModel
              ? { text: cached.text, source: 'model' }
              : null;
        if (kept) {
          setText(kept.text);
          setSource(kept.source);
          setBusy(false);
          return;
        }
      }
      ask(controller.signal);
    });
    return () => controller.abort();
    // `saved` is read once per session and girl: it is what was there when
    // the screen opened, and what this card writes back must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, context.today.id, girl.id]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        {/*
          Calling a canned sentence "AI 조언" and then admitting 규칙 기반 in
          the corner is a joke at the app's expense. It is only AI when a model
          actually answered; otherwise it is what it is — a short read of the
          numbers, which is worth saying plainly.
        */}
        <Ionicons
          name={source === 'model' ? 'sparkles' : 'reader-outline'}
          size={16}
          color={colors.accent}
        />
        <Text style={styles.title}>
          {source === 'model' ? 'AI 조언' : '오늘의 한 줄'}
          <Text style={styles.speaker}> · {girl.name}</Text>
        </Text>
        {source === 'model' && <Text style={styles.badge}>모델</Text>}
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
  speaker: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  badge: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { color: colors.textDim, fontSize: 13 },
  text: { color: colors.text, fontSize: 14, lineHeight: 22 },
});
