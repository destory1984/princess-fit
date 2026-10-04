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
  deadlift: {
    geumhwa: require('../assets/moves/deadlift_geumhwa.png'),
  },
  dips: {
    geumhwa: require('../assets/moves/dips_geumhwa.png'),
  },
  dumbbell_curl: {
    geumhwa: require('../assets/moves/dumbbell_curl_geumhwa.png'),
  },
  dumbbell_press: {
    geumhwa: require('../assets/moves/dumbbell_press_geumhwa.png'),
  },
  hip_thrust: {
    geumhwa: require('../assets/moves/hip_thrust_geumhwa.png'),
  },
  lat_pulldown: {
    geumhwa: require('../assets/moves/lat_pulldown_geumhwa.png'),
  },
  lateral_raise: {
    geumhwa: require('../assets/moves/lateral_raise_geumhwa.png'),
  },
  leg_curl: {
    geumhwa: require('../assets/moves/leg_curl_geumhwa.png'),
  },
  leg_extension: {
    geumhwa: require('../assets/moves/leg_extension_geumhwa.png'),
  },
  leg_press: {
    geumhwa: require('../assets/moves/leg_press_geumhwa.png'),
  },
  leg_raise: {
    geumhwa: require('../assets/moves/leg_raise_geumhwa.png'),
  },
  lunge: {
    geumhwa: require('../assets/moves/lunge_geumhwa.png'),
  },
  one_arm_row: {
    geumhwa: require('../assets/moves/one_arm_row_geumhwa.png'),
  },
  overhead_press: {
    geumhwa: require('../assets/moves/overhead_press_geumhwa.png'),
  },
  plank: {
    geumhwa: require('../assets/moves/plank_geumhwa.png'),
  },
  pull_up: {
    geumhwa: require('../assets/moves/pull_up_geumhwa.png'),
  },
  push_up: {
    geumhwa: require('../assets/moves/push_up_geumhwa.png'),
  },
  pushdown: {
    geumhwa: require('../assets/moves/pushdown_geumhwa.png'),
  },
  romanian_deadlift: {
    geumhwa: require('../assets/moves/romanian_deadlift_geumhwa.png'),
  },
  running: {
    geumhwa: require('../assets/moves/running_geumhwa.png'),
  },
  seated_row: {
    geumhwa: require('../assets/moves/seated_row_geumhwa.png'),
  },
  shoulder_press: {
    geumhwa: require('../assets/moves/shoulder_press_geumhwa.png'),
  },
  squat: {
    geumhwa: require('../assets/moves/squat_geumhwa.png'),
  },
  walking: {
    geumhwa: require('../assets/moves/walking_geumhwa.png'),
  },
};

export function moveArt(moveId: string, advisorId: string): number | undefined {
  const drawn = MOVE_ART[moveId];
  return drawn?.[advisorId] ?? (drawn ? Object.values(drawn)[0] : undefined);
}
