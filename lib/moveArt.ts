/**
 * The demonstration strips, by movement and by girl. Written by
 * scripts/move-index.py from the files in assets/moves — do not edit by hand.
 *
 * Each strip is the frames side by side in square cells. A movement drawn for
 * one girl and not yet for another is shown by the one who has it: a
 * demonstration by the wrong girl is still a demonstration.
 */
const MOVE_ART: Record<string, Record<string, number>> = {
  back_extension: {
    geumhwa: require('../assets/moves/back_extension_geumhwa.png'),
  },
  barbell_curl: {
    dohwa: require('../assets/moves/barbell_curl_dohwa.png'),
    geumhwa: require('../assets/moves/barbell_curl_geumhwa.png'),
    seora: require('../assets/moves/barbell_curl_seora.png'),
  },
  barbell_row: {
    dohwa: require('../assets/moves/barbell_row_dohwa.png'),
    geumhwa: require('../assets/moves/barbell_row_geumhwa.png'),
    seora: require('../assets/moves/barbell_row_seora.png'),
  },
  bench_press: {
    dohwa: require('../assets/moves/bench_press_dohwa.png'),
    geumhwa: require('../assets/moves/bench_press_geumhwa.png'),
    seora: require('../assets/moves/bench_press_seora.png'),
  },
  bulgarian_split_squat: {
    dohwa: require('../assets/moves/bulgarian_split_squat_dohwa.png'),
    geumhwa: require('../assets/moves/bulgarian_split_squat_geumhwa.png'),
    seora: require('../assets/moves/bulgarian_split_squat_seora.png'),
  },
  cable_crossover: {
    dohwa: require('../assets/moves/cable_crossover_dohwa.png'),
    geumhwa: require('../assets/moves/cable_crossover_geumhwa.png'),
    seora: require('../assets/moves/cable_crossover_seora.png'),
  },
  calf_raise: {
    dohwa: require('../assets/moves/calf_raise_dohwa.png'),
    geumhwa: require('../assets/moves/calf_raise_geumhwa.png'),
    seora: require('../assets/moves/calf_raise_seora.png'),
  },
  chest_press_machine: {
    dohwa: require('../assets/moves/chest_press_machine_dohwa.png'),
    geumhwa: require('../assets/moves/chest_press_machine_geumhwa.png'),
    seora: require('../assets/moves/chest_press_machine_seora.png'),
  },
  crunch: {
    dohwa: require('../assets/moves/crunch_dohwa.png'),
    geumhwa: require('../assets/moves/crunch_geumhwa.png'),
    seora: require('../assets/moves/crunch_seora.png'),
  },
  cycling: {
    dohwa: require('../assets/moves/cycling_dohwa.png'),
    geumhwa: require('../assets/moves/cycling_geumhwa.png'),
    seora: require('../assets/moves/cycling_seora.png'),
  },
  deadlift: {
    dohwa: require('../assets/moves/deadlift_dohwa.png'),
    geumhwa: require('../assets/moves/deadlift_geumhwa.png'),
    seora: require('../assets/moves/deadlift_seora.png'),
  },
  dips: {
    dohwa: require('../assets/moves/dips_dohwa.png'),
    geumhwa: require('../assets/moves/dips_geumhwa.png'),
    seora: require('../assets/moves/dips_seora.png'),
  },
  dumbbell_curl: {
    dohwa: require('../assets/moves/dumbbell_curl_dohwa.png'),
    geumhwa: require('../assets/moves/dumbbell_curl_geumhwa.png'),
    seora: require('../assets/moves/dumbbell_curl_seora.png'),
  },
  dumbbell_press: {
    dohwa: require('../assets/moves/dumbbell_press_dohwa.png'),
    geumhwa: require('../assets/moves/dumbbell_press_geumhwa.png'),
    seora: require('../assets/moves/dumbbell_press_seora.png'),
  },
  face_pull: {
    dohwa: require('../assets/moves/face_pull_dohwa.png'),
    geumhwa: require('../assets/moves/face_pull_geumhwa.png'),
    seora: require('../assets/moves/face_pull_seora.png'),
  },
  front_raise: {
    geumhwa: require('../assets/moves/front_raise_geumhwa.png'),
  },
  glute_bridge: {
    dohwa: require('../assets/moves/glute_bridge_dohwa.png'),
    geumhwa: require('../assets/moves/glute_bridge_geumhwa.png'),
    seora: require('../assets/moves/glute_bridge_seora.png'),
  },
  hammer_curl: {
    dohwa: require('../assets/moves/hammer_curl_dohwa.png'),
    geumhwa: require('../assets/moves/hammer_curl_geumhwa.png'),
    seora: require('../assets/moves/hammer_curl_seora.png'),
  },
  hanging_leg_raise: {
    geumhwa: require('../assets/moves/hanging_leg_raise_geumhwa.png'),
  },
  hip_thrust: {
    dohwa: require('../assets/moves/hip_thrust_dohwa.png'),
    geumhwa: require('../assets/moves/hip_thrust_geumhwa.png'),
    seora: require('../assets/moves/hip_thrust_seora.png'),
  },
  incline_bench_press: {
    dohwa: require('../assets/moves/incline_bench_press_dohwa.png'),
    geumhwa: require('../assets/moves/incline_bench_press_geumhwa.png'),
    seora: require('../assets/moves/incline_bench_press_seora.png'),
  },
  incline_dumbbell_press: {
    geumhwa: require('../assets/moves/incline_dumbbell_press_geumhwa.png'),
  },
  jump_rope: {
    geumhwa: require('../assets/moves/jump_rope_geumhwa.png'),
  },
  kettlebell_swing: {
    geumhwa: require('../assets/moves/kettlebell_swing_geumhwa.png'),
  },
  lat_pulldown: {
    dohwa: require('../assets/moves/lat_pulldown_dohwa.png'),
    geumhwa: require('../assets/moves/lat_pulldown_geumhwa.png'),
    seora: require('../assets/moves/lat_pulldown_seora.png'),
  },
  lateral_raise: {
    dohwa: require('../assets/moves/lateral_raise_dohwa.png'),
    geumhwa: require('../assets/moves/lateral_raise_geumhwa.png'),
    seora: require('../assets/moves/lateral_raise_seora.png'),
  },
  leg_curl: {
    dohwa: require('../assets/moves/leg_curl_dohwa.png'),
    geumhwa: require('../assets/moves/leg_curl_geumhwa.png'),
    seora: require('../assets/moves/leg_curl_seora.png'),
  },
  leg_extension: {
    dohwa: require('../assets/moves/leg_extension_dohwa.png'),
    geumhwa: require('../assets/moves/leg_extension_geumhwa.png'),
    seora: require('../assets/moves/leg_extension_seora.png'),
  },
  leg_press: {
    dohwa: require('../assets/moves/leg_press_dohwa.png'),
    geumhwa: require('../assets/moves/leg_press_geumhwa.png'),
    seora: require('../assets/moves/leg_press_seora.png'),
  },
  leg_raise: {
    dohwa: require('../assets/moves/leg_raise_dohwa.png'),
    geumhwa: require('../assets/moves/leg_raise_geumhwa.png'),
    seora: require('../assets/moves/leg_raise_seora.png'),
  },
  lunge: {
    dohwa: require('../assets/moves/lunge_dohwa.png'),
    geumhwa: require('../assets/moves/lunge_geumhwa.png'),
    seora: require('../assets/moves/lunge_seora.png'),
  },
  one_arm_row: {
    dohwa: require('../assets/moves/one_arm_row_dohwa.png'),
    geumhwa: require('../assets/moves/one_arm_row_geumhwa.png'),
    seora: require('../assets/moves/one_arm_row_seora.png'),
  },
  overhead_press: {
    dohwa: require('../assets/moves/overhead_press_dohwa.png'),
    geumhwa: require('../assets/moves/overhead_press_geumhwa.png'),
    seora: require('../assets/moves/overhead_press_seora.png'),
  },
  overhead_triceps_extension: {
    dohwa: require('../assets/moves/overhead_triceps_extension_dohwa.png'),
    geumhwa: require('../assets/moves/overhead_triceps_extension_geumhwa.png'),
    seora: require('../assets/moves/overhead_triceps_extension_seora.png'),
  },
  pec_deck_fly: {
    dohwa: require('../assets/moves/pec_deck_fly_dohwa.png'),
    geumhwa: require('../assets/moves/pec_deck_fly_geumhwa.png'),
    seora: require('../assets/moves/pec_deck_fly_seora.png'),
  },
  plank: {
    dohwa: require('../assets/moves/plank_dohwa.png'),
    geumhwa: require('../assets/moves/plank_geumhwa.png'),
    seora: require('../assets/moves/plank_seora.png'),
  },
  pull_up: {
    dohwa: require('../assets/moves/pull_up_dohwa.png'),
    geumhwa: require('../assets/moves/pull_up_geumhwa.png'),
    seora: require('../assets/moves/pull_up_seora.png'),
  },
  push_up: {
    dohwa: require('../assets/moves/push_up_dohwa.png'),
    geumhwa: require('../assets/moves/push_up_geumhwa.png'),
    seora: require('../assets/moves/push_up_seora.png'),
  },
  pushdown: {
    dohwa: require('../assets/moves/pushdown_dohwa.png'),
    geumhwa: require('../assets/moves/pushdown_geumhwa.png'),
    seora: require('../assets/moves/pushdown_seora.png'),
  },
  rear_delt_fly: {
    geumhwa: require('../assets/moves/rear_delt_fly_geumhwa.png'),
  },
  romanian_deadlift: {
    dohwa: require('../assets/moves/romanian_deadlift_dohwa.png'),
    geumhwa: require('../assets/moves/romanian_deadlift_geumhwa.png'),
    seora: require('../assets/moves/romanian_deadlift_seora.png'),
  },
  rowing_machine: {
    geumhwa: require('../assets/moves/rowing_machine_geumhwa.png'),
  },
  running: {
    dohwa: require('../assets/moves/running_dohwa.png'),
    geumhwa: require('../assets/moves/running_geumhwa.png'),
    seora: require('../assets/moves/running_seora.png'),
  },
  russian_twist: {
    geumhwa: require('../assets/moves/russian_twist_geumhwa.png'),
  },
  seated_row: {
    dohwa: require('../assets/moves/seated_row_dohwa.png'),
    geumhwa: require('../assets/moves/seated_row_geumhwa.png'),
    seora: require('../assets/moves/seated_row_seora.png'),
  },
  shoulder_press: {
    dohwa: require('../assets/moves/shoulder_press_dohwa.png'),
    geumhwa: require('../assets/moves/shoulder_press_geumhwa.png'),
    seora: require('../assets/moves/shoulder_press_seora.png'),
  },
  sit_up: {
    dohwa: require('../assets/moves/sit_up_dohwa.png'),
    geumhwa: require('../assets/moves/sit_up_geumhwa.png'),
    seora: require('../assets/moves/sit_up_seora.png'),
  },
  squat: {
    dohwa: require('../assets/moves/squat_dohwa.png'),
    geumhwa: require('../assets/moves/squat_geumhwa.png'),
    seora: require('../assets/moves/squat_seora.png'),
  },
  sumo_deadlift: {
    geumhwa: require('../assets/moves/sumo_deadlift_geumhwa.png'),
  },
  walking: {
    dohwa: require('../assets/moves/walking_dohwa.png'),
    geumhwa: require('../assets/moves/walking_geumhwa.png'),
    seora: require('../assets/moves/walking_seora.png'),
  },
};

export function moveArt(moveId: string, advisorId: string): number | undefined {
  const drawn = MOVE_ART[moveId];
  return drawn?.[advisorId] ?? (drawn ? Object.values(drawn)[0] : undefined);
}
