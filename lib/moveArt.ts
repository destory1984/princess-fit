/**
 * The demonstration strips, by movement and by girl. Written by
 * scripts/move-index.py from the files in assets/moves — do not edit by hand.
 *
 * Each strip is the frames side by side in square cells. A movement drawn for
 * one girl and not yet for another is shown by the one who has it: a
 * demonstration by the wrong girl is still a demonstration.
 */
const MOVE_ART: Record<string, Record<string, number>> = {
  barbell_curl: {
    geumhwa: require('../assets/moves/barbell_curl_geumhwa.png'),
  },
  barbell_row: {
    geumhwa: require('../assets/moves/barbell_row_geumhwa.png'),
  },
  bench_press: {
    geumhwa: require('../assets/moves/bench_press_geumhwa.png'),
  },
  calf_raise: {
    geumhwa: require('../assets/moves/calf_raise_geumhwa.png'),
  },
  chest_press_machine: {
    geumhwa: require('../assets/moves/chest_press_machine_geumhwa.png'),
  },
};

export function moveArt(moveId: string, advisorId: string): number | undefined {
  const drawn = MOVE_ART[moveId];
  return drawn?.[advisorId] ?? (drawn ? Object.values(drawn)[0] : undefined);
}
