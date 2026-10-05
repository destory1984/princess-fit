import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { paper, spacing } from '@/lib/theme';

/** A parchment panel with a double rule, like a page out of a training ledger. */
export function Scroll({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.outer}>
      <View style={styles.inner}>
        {title ? (
          <View style={styles.titleWrap}>
            <View style={styles.rule} />
            <Text style={styles.title}>{title}</Text>
            <View style={styles.rule} />
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: paper.bg,
    borderColor: paper.line,
    borderWidth: 3,
    borderRadius: 6,
    padding: 3,
  },
  inner: {
    borderColor: paper.lineSoft,
    borderWidth: 1,
    borderRadius: 3,
    padding: spacing.lg,
    gap: spacing.md,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rule: { flex: 1, height: 1, backgroundColor: paper.lineSoft },
  title: { color: paper.ink, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});
