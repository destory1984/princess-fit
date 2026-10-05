import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { valueAt } from '@/lib/textScale';
import { colors, spacing } from '@/lib/theme';

type Props = {
  value: number;
  min: number;
  max: number;
  step: number;
  /** The numbers written under the track. */
  marks: number[];
  /** While the thumb is being dragged. */
  onChange: (value: number) => void;
  /** When the finger lifts. */
  onDone?: (value: number) => void;
  label?: string;
};

const THUMB = 22;

/**
 * A track with a thumb, a tick at each mark, and the marks' numbers below —
 * the shape the owner showed for a setting that is an amount (2026-10-06).
 *
 * Built here rather than taken from a package: it is one track and one thumb,
 * and it has to work the same on the web as on a phone.
 */
export function Slider({ value, min, max, step, marks, onChange, onDone, label }: Props) {
  const track = useRef<View>(null);
  const left = useRef(0);
  const [width, setWidth] = useState(0);
  // What the finger last asked for, so lifting it reports that and not a stale prop.
  const latest = useRef(value);
  const dragging = useRef(false);

  const along = max === min ? 0 : (value - min) / (max - min);

  function move(pageX: number) {
    const next = valueAt(pageX - left.current, width, min, max, step);
    latest.current = next;
    if (next !== value) onChange(next);
  }

  function end() {
    dragging.current = false;
    onDone?.(latest.current);
  }

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      style={styles.wrap}
      // The whole band takes the touch, not only the thin line in it.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Inside a scrolling screen a sideways drag must not be taken for a scroll.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        const pageX = e.nativeEvent.pageX;
        dragging.current = true;
        // Where the track is, measured at the touch: the screen may have scrolled
        // since layout. On the web that is an answer; on a phone it is a callback.
        const node = track.current as unknown as { getBoundingClientRect?: () => { left: number } };
        if (node?.getBoundingClientRect) {
          left.current = node.getBoundingClientRect().left;
          move(pageX);
          return;
        }
        track.current?.measure((_x, _y, _w, _h, px) => {
          left.current = px;
          move(pageX);
          // A tap is over before the measurement comes back. The release already
          // reported the old value; this is the one the tap meant.
          if (!dragging.current) onDone?.(latest.current);
        });
      }}
      onResponderMove={(e) => move(e.nativeEvent.pageX)}
      onResponderRelease={end}
      // A touch taken away (the pointer left the window, a system gesture) still
      // ends the drag.
      onResponderTerminate={end}>
      <View
        ref={track}
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.fill, { width: `${along * 100}%` }]} />
        <View style={[styles.thumb, { left: along * width - THUMB / 2 }]} />
      </View>

      <View style={styles.marks}>
        {marks.map((mark) => {
          const at = max === min ? 0 : ((mark - min) / (max - min)) * width;
          return (
            <View key={mark} style={[styles.mark, { left: at - 20 }]}>
              <View style={styles.tick} />
              <Text style={styles.markText}>{mark}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sides wide enough for half a thumb, so it does not hang off the card at either end.
  wrap: { paddingTop: spacing.md, paddingHorizontal: THUMB / 2 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent, marginLeft: -1 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.accent,
    borderColor: colors.surface,
    borderWidth: 2,
  },
  marks: { height: 34, marginTop: spacing.sm },
  mark: { position: 'absolute', width: 40, alignItems: 'center', gap: 2 },
  tick: { width: 1, height: 6, backgroundColor: colors.textDim },
  markText: { color: colors.textDim, fontSize: 13 },
});
