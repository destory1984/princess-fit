import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { moveArt } from '@/lib/moveArt';
import { frameAt, moveOf } from '@/lib/moves';
import { useGirl } from '@/lib/girl';

/** How long each frame stays. Slow enough to read a pose, quick enough to read as moving. */
const FRAME_MS = 550;

type Props = {
  /** The exercise's name, which is what a drawing is kept under. */
  name: string;
  size?: number;
};

/**
 * Her, doing the movement: start, middle, end, and back again.
 *
 * The strip is every frame side by side in square cells; the window shows one
 * cell and the strip slides behind it. One image rather than three so the frames
 * cannot arrive at different times and flash.
 *
 * Draws nothing for an exercise with no drawing, so it can be dropped in
 * anywhere an exercise is shown.
 */
export function MoveDemo({ name, size = 160 }: Props) {
  const girl = useGirl();
  const move = moveOf(name);
  const source = move ? moveArt(move.id, girl.id) : undefined;
  const [tick, setTick] = useState(0);

  const frames = move?.frames ?? 1;
  useEffect(() => {
    if (frames === 1) return;
    const timer = setInterval(() => setTick((t) => t + 1), FRAME_MS);
    return () => clearInterval(timer);
  }, [frames]);

  if (!move || !source) return null;
  const frame = frameAt(move, tick);

  return (
    <View style={[styles.window, { width: size, height: size }]}>
      <Image
        source={source}
        style={{ width: size * frames, height: size, marginLeft: -size * frame }}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden', pointerEvents: 'none' },
});
