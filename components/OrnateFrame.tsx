import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, spacing } from '@/lib/theme';

/** A small floral flourish, mirrored into each corner of the frame. */
function Corner({ style }: { style: ViewStyle }) {
  return (
    <View style={[styles.corner, style]} pointerEvents="none">
      <Svg viewBox="0 0 24 24" width={22} height={22}>
        <Path
          d="M2 12 Q2 2 12 2"
          stroke={colors.gold}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M2 18 Q2 8 8 6"
          stroke={colors.goldSoft}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={12} cy={2.5} r={2} fill={colors.accent} opacity={0.75} />
        <Circle cx={2.5} cy={12} r={1.6} fill={colors.gold} />
      </Svg>
    </View>
  );
}

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** Tighter padding for small plaques. */
  compact?: boolean;
};

export function OrnateFrame({ children, style, compact }: Props) {
  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.inner, compact ? styles.innerCompact : null]}>{children}</View>
      <Corner style={styles.tl} />
      <Corner style={styles.tr} />
      <Corner style={styles.bl} />
      <Corner style={styles.br} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.surface,
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: 10,
    padding: 3,
  },
  inner: {
    borderColor: colors.goldSoft,
    borderWidth: 1,
    borderRadius: 7,
    padding: spacing.lg,
  },
  innerCompact: { padding: spacing.sm },
  corner: { position: 'absolute', width: 22, height: 22 },
  tl: { top: 1, left: 1 },
  tr: { top: 1, right: 1, transform: [{ scaleX: -1 }] },
  bl: { bottom: 1, left: 1, transform: [{ scaleY: -1 }] },
  br: { bottom: 1, right: 1, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
});
