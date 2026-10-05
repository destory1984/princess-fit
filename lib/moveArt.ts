/**
 * The demonstration strips, by movement and by girl. Written by
 * scripts/move-index.py from the files in assets/moves — do not edit by hand.
 *
 * Each strip is the frames side by side in square cells. A movement drawn for
 * one girl and not yet for another is shown by the one who has it: a
 * demonstration by the wrong girl is still a demonstration.
 */
const MOVE_ART: Record<string, Record<string, number>> = {
  arnold_press: {
    dohwa: require('../assets/moves/arnold_press_dohwa.png'),
    geumhwa: require('../assets/moves/arnold_press_geumhwa.png'),
    seora: require('../assets/moves/arnold_press_seora.png'),
  },
  back_extension: {
    dohwa: require('../assets/moves/back_extension_dohwa.png'),
    geumhwa: require('../assets/moves/back_extension_geumhwa.png'),
    seora: require('../assets/moves/back_extension_seora.png'),
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
  bench_dips: {
    dohwa: require('../assets/moves/bench_dips_dohwa.png'),
    geumhwa: require('../assets/moves/bench_dips_geumhwa.png'),
    seora: require('../assets/moves/bench_dips_seora.png'),
  },
  bench_press: {
    dohwa: require('../assets/moves/bench_press_dohwa.png'),
    geumhwa: require('../assets/moves/bench_press_geumhwa.png'),
    seora: require('../assets/moves/bench_press_seora.png'),
  },
  bent_over_dumbbell_row: {
    geumhwa: require('../assets/moves/bent_over_dumbbell_row_geumhwa.png'),
  },
  bicycle_crunch: {
    dohwa: require('../assets/moves/bicycle_crunch_dohwa.png'),
    geumhwa: require('../assets/moves/bicycle_crunch_geumhwa.png'),
    seora: require('../assets/moves/bicycle_crunch_seora.png'),
  },
  bird_dog: {
    geumhwa: require('../assets/moves/bird_dog_geumhwa.png'),
  },
  bodyweight_squat: {
    dohwa: require('../assets/moves/bodyweight_squat_dohwa.png'),
    geumhwa: require('../assets/moves/bodyweight_squat_geumhwa.png'),
    seora: require('../assets/moves/bodyweight_squat_seora.png'),
  },
  box_jump: {
    dohwa: require('../assets/moves/box_jump_dohwa.png'),
    geumhwa: require('../assets/moves/box_jump_geumhwa.png'),
    seora: require('../assets/moves/box_jump_seora.png'),
  },
  bulgarian_split_squat: {
    dohwa: require('../assets/moves/bulgarian_split_squat_dohwa.png'),
    geumhwa: require('../assets/moves/bulgarian_split_squat_geumhwa.png'),
    seora: require('../assets/moves/bulgarian_split_squat_seora.png'),
  },
  burpee: {
    dohwa: require('../assets/moves/burpee_dohwa.png'),
    geumhwa: require('../assets/moves/burpee_geumhwa.png'),
    seora: require('../assets/moves/burpee_seora.png'),
  },
  cable_crossover: {
    dohwa: require('../assets/moves/cable_crossover_dohwa.png'),
    geumhwa: require('../assets/moves/cable_crossover_geumhwa.png'),
    seora: require('../assets/moves/cable_crossover_seora.png'),
  },
  cable_crunch: {
    dohwa: require('../assets/moves/cable_crunch_dohwa.png'),
    geumhwa: require('../assets/moves/cable_crunch_geumhwa.png'),
    seora: require('../assets/moves/cable_crunch_seora.png'),
  },
  cable_curl: {
    dohwa: require('../assets/moves/cable_curl_dohwa.png'),
    geumhwa: require('../assets/moves/cable_curl_geumhwa.png'),
    seora: require('../assets/moves/cable_curl_seora.png'),
  },
  cable_kickback: {
    geumhwa: require('../assets/moves/cable_kickback_geumhwa.png'),
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
  chin_up: {
    dohwa: require('../assets/moves/chin_up_dohwa.png'),
    geumhwa: require('../assets/moves/chin_up_geumhwa.png'),
    seora: require('../assets/moves/chin_up_seora.png'),
  },
  close_grip_bench_press: {
    geumhwa: require('../assets/moves/close_grip_bench_press_geumhwa.png'),
  },
  concentration_curl: {
    geumhwa: require('../assets/moves/concentration_curl_geumhwa.png'),
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
  dead_bug: {
    geumhwa: require('../assets/moves/dead_bug_geumhwa.png'),
  },
  deadlift: {
    dohwa: require('../assets/moves/deadlift_dohwa.png'),
    geumhwa: require('../assets/moves/deadlift_geumhwa.png'),
    seora: require('../assets/moves/deadlift_seora.png'),
  },
  decline_bench_press: {
    geumhwa: require('../assets/moves/decline_bench_press_geumhwa.png'),
  },
  decline_push_up: {
    geumhwa: require('../assets/moves/decline_push_up_geumhwa.png'),
  },
  dips: {
    dohwa: require('../assets/moves/dips_dohwa.png'),
    geumhwa: require('../assets/moves/dips_geumhwa.png'),
    seora: require('../assets/moves/dips_seora.png'),
  },
  donkey_kick: {
    dohwa: require('../assets/moves/donkey_kick_dohwa.png'),
    geumhwa: require('../assets/moves/donkey_kick_geumhwa.png'),
    seora: require('../assets/moves/donkey_kick_seora.png'),
  },
  dumbbell_curl: {
    dohwa: require('../assets/moves/dumbbell_curl_dohwa.png'),
    geumhwa: require('../assets/moves/dumbbell_curl_geumhwa.png'),
    seora: require('../assets/moves/dumbbell_curl_seora.png'),
  },
  dumbbell_fly: {
    dohwa: require('../assets/moves/dumbbell_fly_dohwa.png'),
    geumhwa: require('../assets/moves/dumbbell_fly_geumhwa.png'),
    seora: require('../assets/moves/dumbbell_fly_seora.png'),
  },
  dumbbell_press: {
    dohwa: require('../assets/moves/dumbbell_press_dohwa.png'),
    geumhwa: require('../assets/moves/dumbbell_press_geumhwa.png'),
    seora: require('../assets/moves/dumbbell_press_seora.png'),
  },
  dumbbell_rdl: {
    dohwa: require('../assets/moves/dumbbell_rdl_dohwa.png'),
    geumhwa: require('../assets/moves/dumbbell_rdl_geumhwa.png'),
    seora: require('../assets/moves/dumbbell_rdl_seora.png'),
  },
  elliptical: {
    dohwa: require('../assets/moves/elliptical_dohwa.png'),
    geumhwa: require('../assets/moves/elliptical_geumhwa.png'),
    seora: require('../assets/moves/elliptical_seora.png'),
  },
  face_pull: {
    dohwa: require('../assets/moves/face_pull_dohwa.png'),
    geumhwa: require('../assets/moves/face_pull_geumhwa.png'),
    seora: require('../assets/moves/face_pull_seora.png'),
  },
  front_raise: {
    dohwa: require('../assets/moves/front_raise_dohwa.png'),
    geumhwa: require('../assets/moves/front_raise_geumhwa.png'),
    seora: require('../assets/moves/front_raise_seora.png'),
  },
  front_squat: {
    dohwa: require('../assets/moves/front_squat_dohwa.png'),
    geumhwa: require('../assets/moves/front_squat_geumhwa.png'),
    seora: require('../assets/moves/front_squat_seora.png'),
  },
  glute_bridge: {
    dohwa: require('../assets/moves/glute_bridge_dohwa.png'),
    geumhwa: require('../assets/moves/glute_bridge_geumhwa.png'),
    seora: require('../assets/moves/glute_bridge_seora.png'),
  },
  goblet_squat: {
    dohwa: require('../assets/moves/goblet_squat_dohwa.png'),
    geumhwa: require('../assets/moves/goblet_squat_geumhwa.png'),
    seora: require('../assets/moves/goblet_squat_seora.png'),
  },
  hack_squat: {
    dohwa: require('../assets/moves/hack_squat_dohwa.png'),
    geumhwa: require('../assets/moves/hack_squat_geumhwa.png'),
    seora: require('../assets/moves/hack_squat_seora.png'),
  },
  hammer_curl: {
    dohwa: require('../assets/moves/hammer_curl_dohwa.png'),
    geumhwa: require('../assets/moves/hammer_curl_geumhwa.png'),
    seora: require('../assets/moves/hammer_curl_seora.png'),
  },
  hanging_leg_raise: {
    dohwa: require('../assets/moves/hanging_leg_raise_dohwa.png'),
    geumhwa: require('../assets/moves/hanging_leg_raise_geumhwa.png'),
    seora: require('../assets/moves/hanging_leg_raise_seora.png'),
  },
  high_knees: {
    dohwa: require('../assets/moves/high_knees_dohwa.png'),
    geumhwa: require('../assets/moves/high_knees_geumhwa.png'),
    seora: require('../assets/moves/high_knees_seora.png'),
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
    dohwa: require('../assets/moves/incline_dumbbell_press_dohwa.png'),
    geumhwa: require('../assets/moves/incline_dumbbell_press_geumhwa.png'),
    seora: require('../assets/moves/incline_dumbbell_press_seora.png'),
  },
  jump_rope: {
    dohwa: require('../assets/moves/jump_rope_dohwa.png'),
    geumhwa: require('../assets/moves/jump_rope_geumhwa.png'),
    seora: require('../assets/moves/jump_rope_seora.png'),
  },
  jump_squat: {
    dohwa: require('../assets/moves/jump_squat_dohwa.png'),
    geumhwa: require('../assets/moves/jump_squat_geumhwa.png'),
    seora: require('../assets/moves/jump_squat_seora.png'),
  },
  jumping_jack: {
    dohwa: require('../assets/moves/jumping_jack_dohwa.png'),
    geumhwa: require('../assets/moves/jumping_jack_geumhwa.png'),
    seora: require('../assets/moves/jumping_jack_seora.png'),
  },
  kettlebell_swing: {
    dohwa: require('../assets/moves/kettlebell_swing_dohwa.png'),
    geumhwa: require('../assets/moves/kettlebell_swing_geumhwa.png'),
    seora: require('../assets/moves/kettlebell_swing_seora.png'),
  },
  knee_push_up: {
    dohwa: require('../assets/moves/knee_push_up_dohwa.png'),
    geumhwa: require('../assets/moves/knee_push_up_geumhwa.png'),
    seora: require('../assets/moves/knee_push_up_seora.png'),
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
  mountain_climber: {
    dohwa: require('../assets/moves/mountain_climber_dohwa.png'),
    geumhwa: require('../assets/moves/mountain_climber_geumhwa.png'),
    seora: require('../assets/moves/mountain_climber_seora.png'),
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
  preacher_curl: {
    dohwa: require('../assets/moves/preacher_curl_dohwa.png'),
    geumhwa: require('../assets/moves/preacher_curl_geumhwa.png'),
    seora: require('../assets/moves/preacher_curl_seora.png'),
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
    dohwa: require('../assets/moves/rear_delt_fly_dohwa.png'),
    geumhwa: require('../assets/moves/rear_delt_fly_geumhwa.png'),
    seora: require('../assets/moves/rear_delt_fly_seora.png'),
  },
  reverse_crunch: {
    dohwa: require('../assets/moves/reverse_crunch_dohwa.png'),
    geumhwa: require('../assets/moves/reverse_crunch_geumhwa.png'),
    seora: require('../assets/moves/reverse_crunch_seora.png'),
  },
  reverse_lunge: {
    dohwa: require('../assets/moves/reverse_lunge_dohwa.png'),
    geumhwa: require('../assets/moves/reverse_lunge_geumhwa.png'),
    seora: require('../assets/moves/reverse_lunge_seora.png'),
  },
  romanian_deadlift: {
    dohwa: require('../assets/moves/romanian_deadlift_dohwa.png'),
    geumhwa: require('../assets/moves/romanian_deadlift_geumhwa.png'),
    seora: require('../assets/moves/romanian_deadlift_seora.png'),
  },
  rowing_machine: {
    dohwa: require('../assets/moves/rowing_machine_dohwa.png'),
    geumhwa: require('../assets/moves/rowing_machine_geumhwa.png'),
    seora: require('../assets/moves/rowing_machine_seora.png'),
  },
  running: {
    dohwa: require('../assets/moves/running_dohwa.png'),
    geumhwa: require('../assets/moves/running_geumhwa.png'),
    seora: require('../assets/moves/running_seora.png'),
  },
  russian_twist: {
    dohwa: require('../assets/moves/russian_twist_dohwa.png'),
    geumhwa: require('../assets/moves/russian_twist_geumhwa.png'),
    seora: require('../assets/moves/russian_twist_seora.png'),
  },
  seated_leg_curl: {
    dohwa: require('../assets/moves/seated_leg_curl_dohwa.png'),
    geumhwa: require('../assets/moves/seated_leg_curl_geumhwa.png'),
    seora: require('../assets/moves/seated_leg_curl_seora.png'),
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
  shrug: {
    dohwa: require('../assets/moves/shrug_dohwa.png'),
    geumhwa: require('../assets/moves/shrug_geumhwa.png'),
    seora: require('../assets/moves/shrug_seora.png'),
  },
  side_plank: {
    dohwa: require('../assets/moves/side_plank_dohwa.png'),
    geumhwa: require('../assets/moves/side_plank_geumhwa.png'),
    seora: require('../assets/moves/side_plank_seora.png'),
  },
  sit_up: {
    dohwa: require('../assets/moves/sit_up_dohwa.png'),
    geumhwa: require('../assets/moves/sit_up_geumhwa.png'),
    seora: require('../assets/moves/sit_up_seora.png'),
  },
  skull_crusher: {
    dohwa: require('../assets/moves/skull_crusher_dohwa.png'),
    geumhwa: require('../assets/moves/skull_crusher_geumhwa.png'),
    seora: require('../assets/moves/skull_crusher_seora.png'),
  },
  squat: {
    dohwa: require('../assets/moves/squat_dohwa.png'),
    geumhwa: require('../assets/moves/squat_geumhwa.png'),
    seora: require('../assets/moves/squat_seora.png'),
  },
  stair_climb: {
    dohwa: require('../assets/moves/stair_climb_dohwa.png'),
    geumhwa: require('../assets/moves/stair_climb_geumhwa.png'),
    seora: require('../assets/moves/stair_climb_seora.png'),
  },
  sumo_deadlift: {
    dohwa: require('../assets/moves/sumo_deadlift_dohwa.png'),
    geumhwa: require('../assets/moves/sumo_deadlift_geumhwa.png'),
    seora: require('../assets/moves/sumo_deadlift_seora.png'),
  },
  superman: {
    dohwa: require('../assets/moves/superman_dohwa.png'),
    geumhwa: require('../assets/moves/superman_geumhwa.png'),
    seora: require('../assets/moves/superman_seora.png'),
  },
  thruster: {
    dohwa: require('../assets/moves/thruster_dohwa.png'),
    geumhwa: require('../assets/moves/thruster_geumhwa.png'),
    seora: require('../assets/moves/thruster_seora.png'),
  },
  triceps_kickback: {
    geumhwa: require('../assets/moves/triceps_kickback_geumhwa.png'),
    seora: require('../assets/moves/triceps_kickback_seora.png'),
  },
  upright_row: {
    geumhwa: require('../assets/moves/upright_row_geumhwa.png'),
    seora: require('../assets/moves/upright_row_seora.png'),
  },
  walking: {
    dohwa: require('../assets/moves/walking_dohwa.png'),
    geumhwa: require('../assets/moves/walking_geumhwa.png'),
    seora: require('../assets/moves/walking_seora.png'),
  },
  walking_lunge: {
    geumhwa: require('../assets/moves/walking_lunge_geumhwa.png'),
    seora: require('../assets/moves/walking_lunge_seora.png'),
  },
  wall_sit: {
    dohwa: require('../assets/moves/wall_sit_dohwa.png'),
    geumhwa: require('../assets/moves/wall_sit_geumhwa.png'),
    seora: require('../assets/moves/wall_sit_seora.png'),
  },
};

export function moveArt(moveId: string, advisorId: string): number | undefined {
  const drawn = MOVE_ART[moveId];
  return drawn?.[advisorId] ?? (drawn ? Object.values(drawn)[0] : undefined);
}
