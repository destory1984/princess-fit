/**
 * Which exercises have a demonstration drawn, and how many frames it has.
 *
 * The drawing is the girl doing the movement: its start, its middle and its end,
 * shown in turn (components/MoveDemo.tsx). It is there so the name on the board
 * means something to someone who has never done it. It is not a form check — the
 * app cannot see anyone's form — but nothing wrong is shown either: each drawing
 * was looked at before it went in.
 *
 * Keyed by the catalog's name, since that is what an exercise is known by across
 * accounts; one made by hand has no drawing. A hold has one frame.
 * The pictures themselves are in `./moveArt`, kept apart so this stays plain
 * data the tests can import without a bundler.
 */
export type Move = { id: string; frames: 1 | 3 | 5 | 7 };

const MOVES: Record<string, Move> = {
  스쿼트: { id: 'squat', frames: 5 },
  벤치프레스: { id: 'bench_press', frames: 3 },
  데드리프트: { id: 'deadlift', frames: 5 },
  '덤벨 프레스': { id: 'dumbbell_press', frames: 3 },
  푸시업: { id: 'push_up', frames: 3 },
  '바벨 로우': { id: 'barbell_row', frames: 3 },
  '랫 풀다운': { id: 'lat_pulldown', frames: 3 },
  '시티드 로우': { id: 'seated_row', frames: 3 },
  풀업: { id: 'pull_up', frames: 3 },
  '원암 덤벨 로우': { id: 'one_arm_row', frames: 3 },
  '오버헤드 프레스': { id: 'overhead_press', frames: 3 },
  '덤벨 숄더 프레스': { id: 'shoulder_press', frames: 3 },
  '사이드 레터럴 레이즈': { id: 'lateral_raise', frames: 3 },
  '레그 프레스': { id: 'leg_press', frames: 3 },
  런지: { id: 'lunge', frames: 3 },
  '레그 익스텐션': { id: 'leg_extension', frames: 3 },
  '레그 컬': { id: 'leg_curl', frames: 3 },
  '루마니안 데드리프트': { id: 'romanian_deadlift', frames: 3 },
  '힙 쓰러스트': { id: 'hip_thrust', frames: 3 },
  '카프 레이즈': { id: 'calf_raise', frames: 3 },
  '바벨 컬': { id: 'barbell_curl', frames: 3 },
  '덤벨 컬': { id: 'dumbbell_curl', frames: 3 },
  '트라이셉스 푸시다운': { id: 'pushdown', frames: 3 },
  딥스: { id: 'dips', frames: 3 },
  크런치: { id: 'crunch', frames: 3 },
  '레그 레이즈': { id: 'leg_raise', frames: 3 },
  플랭크: { id: 'plank', frames: 1 },
  러닝: { id: 'running', frames: 3 },
  '체스트 프레스 머신': { id: 'chest_press_machine', frames: 3 },
  걷기: { id: 'walking', frames: 3 },
  '인클라인 벤치프레스': { id: 'incline_bench_press', frames: 3 },
  '케이블 크로스오버': { id: 'cable_crossover', frames: 3 },
  '페이스 풀': { id: 'face_pull', frames: 3 },
  '해머 컬': { id: 'hammer_curl', frames: 3 },
  '오버헤드 트라이셉스 익스텐션': { id: 'overhead_triceps_extension', frames: 3 },
  '윗몸 일으키기': { id: 'sit_up', frames: 3 },
  '펙덱 플라이': { id: 'pec_deck_fly', frames: 3 },
  '불가리안 스플릿 스쿼트': { id: 'bulgarian_split_squat', frames: 3 },
  '글루트 브릿지': { id: 'glute_bridge', frames: 3 },
  사이클: { id: 'cycling', frames: 3 },
  '인클라인 덤벨 프레스': { id: 'incline_dumbbell_press', frames: 3 },
  '리어 델트 플라이': { id: 'rear_delt_fly', frames: 3 },
  '프론트 레이즈': { id: 'front_raise', frames: 3 },
  '로잉 머신': { id: 'rowing_machine', frames: 3 },
  '백 익스텐션': { id: 'back_extension', frames: 3 },
  '스모 데드리프트': { id: 'sumo_deadlift', frames: 3 },
  '케틀벨 스윙': { id: 'kettlebell_swing', frames: 5 },
  '행잉 레그 레이즈': { id: 'hanging_leg_raise', frames: 3 },
  '러시안 트위스트': { id: 'russian_twist', frames: 3 },
  줄넘기: { id: 'jump_rope', frames: 3 },
  '계단 오르기': { id: 'stair_climb', frames: 3 },
  '마운틴 클라이머': { id: 'mountain_climber', frames: 3 },
  '월 싯': { id: 'wall_sit', frames: 1 },
  '점프 스쿼트': { id: 'jump_squat', frames: 3 },
  '덩키 킥': { id: 'donkey_kick', frames: 3 },
  // Five: standing, hands down, plank, the push-up, the jump. In three it stopped at the plank.
  버피: { id: 'burpee', frames: 7 },
  '맨몸 스쿼트': { id: 'bodyweight_squat', frames: 3 },
  '니 푸시업': { id: 'knee_push_up', frames: 3 },
  '사이드 플랭크': { id: 'side_plank', frames: 1 },
  '점핑 잭': { id: 'jumping_jack', frames: 3 },
  친업: { id: 'chin_up', frames: 3 },
  '프론트 스쿼트': { id: 'front_squat', frames: 3 },
  '덤벨 고블릿 스쿼트': { id: 'goblet_squat', frames: 3 },
  '아놀드 프레스': { id: 'arnold_press', frames: 3 },
  '케이블 컬': { id: 'cable_curl', frames: 3 },
  '덤벨 플라이': { id: 'dumbbell_fly', frames: 3 },
  슈러그: { id: 'shrug', frames: 3 },
  '스컬 크러셔': { id: 'skull_crusher', frames: 3 },
  '바이시클 크런치': { id: 'bicycle_crunch', frames: 3 },
  일립티컬: { id: 'elliptical', frames: 3 },
  '덤벨 루마니안 데드리프트': { id: 'dumbbell_rdl', frames: 3 },
  '워킹 런지': { id: 'walking_lunge', frames: 3 },
  '리버스 런지': { id: 'reverse_lunge', frames: 3 },
  '핵 스쿼트': { id: 'hack_squat', frames: 3 },
  '시티드 레그 컬': { id: 'seated_leg_curl', frames: 3 },
  '업라이트 로우': { id: 'upright_row', frames: 3 },
  '프리처 컬': { id: 'preacher_curl', frames: 3 },
  '트라이셉스 킥백': { id: 'triceps_kickback', frames: 3 },
  '벤치 딥스': { id: 'bench_dips', frames: 3 },
  '케이블 크런치': { id: 'cable_crunch', frames: 3 },
  '리버스 크런치': { id: 'reverse_crunch', frames: 3 },
  슈퍼맨: { id: 'superman', frames: 3 },
  '하이 니': { id: 'high_knees', frames: 3 },
  '박스 점프': { id: 'box_jump', frames: 5 },
  '덤벨 스러스터': { id: 'thruster', frames: 5 },
  '디클라인 벤치프레스': { id: 'decline_bench_press', frames: 3 },
  '케이블 킥백': { id: 'cable_kickback', frames: 3 },
  '디클라인 푸시업': { id: 'decline_push_up', frames: 3 },
  '클로즈 그립 벤치프레스': { id: 'close_grip_bench_press', frames: 3 },
  '벤트오버 덤벨 로우': { id: 'bent_over_dumbbell_row', frames: 3 },
  '컨센트레이션 컬': { id: 'concentration_curl', frames: 3 },
  데드버그: { id: 'dead_bug', frames: 3 },
  버드독: { id: 'bird_dog', frames: 3 },
  '티바 로우': { id: 't_bar_row', frames: 3 },
  스텝업: { id: 'step_up', frames: 3 },
  '힙 어브덕션 머신': { id: 'hip_abduction', frames: 3 },
  굿모닝: { id: 'good_morning', frames: 3 },
  '리버스 컬': { id: 'reverse_curl', frames: 3 },
  '인클라인 덤벨 플라이': { id: 'incline_dumbbell_fly', frames: 3 },
  '덤벨 풀오버': { id: 'dumbbell_pullover', frames: 3 },
  '스트레이트 암 풀다운': { id: 'straight_arm_pulldown', frames: 3 },
  '인버티드 로우': { id: 'inverted_row', frames: 3 },
  '숄더 프레스 머신': { id: 'shoulder_press_machine', frames: 3 },
  '사이드 런지': { id: 'side_lunge', frames: 3 },
  '시티드 카프 레이즈': { id: 'seated_calf_raise', frames: 3 },
  수영: { id: 'swimming', frames: 3 },
  '천국의 계단': { id: 'stairmaster', frames: 3 },
  'AB 슬라이드': { id: 'ab_wheel', frames: 3 },
  '밴드 로우': { id: 'band_row', frames: 3 },
  '밴드 풀 어파트': { id: 'band_pull_apart', frames: 3 },
  '케틀벨 고블릿 스쿼트': { id: 'kettlebell_goblet_squat', frames: 3 },
  '푸시업 바 푸시업': { id: 'push_up_bar', frames: 3 },
  '스미스 머신 벤치프레스': { id: 'smith_bench_press', frames: 3 },
  '인클라인 체스트 프레스 머신': { id: 'incline_chest_press_machine', frames: 3 },
  '로우 케이블 플라이': { id: 'low_cable_fly', frames: 3 },
  '어시스트 풀업 머신': { id: 'assisted_pull_up', frames: 3 },
  '클로즈 그립 랫 풀다운': { id: 'close_grip_lat_pulldown', frames: 3 },
  '펜들레이 로우': { id: 'pendlay_row', frames: 3 },
  '체스트 서포티드 로우': { id: 'chest_supported_row', frames: 3 },
  '하이 로우 머신': { id: 'high_row_machine', frames: 3 },
  '랙 풀': { id: 'rack_pull', frames: 3 },
  '덤벨 슈러그': { id: 'dumbbell_shrug', frames: 3 },
  '파머스 워크': { id: 'farmers_walk', frames: 3 },
  '스미스 머신 숄더 프레스': { id: 'smith_shoulder_press', frames: 3 },
  '케이블 레터럴 레이즈': { id: 'cable_lateral_raise', frames: 3 },
  '레터럴 레이즈 머신': { id: 'lateral_raise_machine', frames: 3 },
  '리버스 펙덱 플라이': { id: 'reverse_pec_deck', frames: 3 },
  '파이크 푸시업': { id: 'pike_push_up', frames: 3 },
  '랜드마인 프레스': { id: 'landmine_press', frames: 3 },
  '푸시 프레스': { id: 'push_press', frames: 3 },
  'Y 레이즈': { id: 'y_raise', frames: 3 },
  '스미스 머신 스쿼트': { id: 'smith_squat', frames: 3 },
  '덤벨 스쿼트': { id: 'dumbbell_squat', frames: 3 },
  '싱글 레그 데드리프트': { id: 'single_leg_deadlift', frames: 3 },
  '트랩바 데드리프트': { id: 'trap_bar_deadlift', frames: 3 },
  '싱글 레그 글루트 브릿지': { id: 'single_leg_glute_bridge', frames: 3 },
  '케이블 풀 스루': { id: 'cable_pull_through', frames: 3 },
  '노르딕 햄스트링 컬': { id: 'nordic_curl', frames: 3 },
  '파워 클린': { id: 'power_clean', frames: 5 },
  '인클라인 덤벨 컬': { id: 'incline_dumbbell_curl', frames: 3 },
  '이지바 컬': { id: 'ez_bar_curl', frames: 3 },
  '암 컬 머신': { id: 'arm_curl_machine', frames: 3 },
  '로프 해머 컬': { id: 'rope_hammer_curl', frames: 3 },
  '케이블 오버헤드 트라이셉스 익스텐션': { id: 'cable_overhead_triceps_extension', frames: 3 },
  '다이아몬드 푸시업': { id: 'diamond_push_up', frames: 3 },
  '트라이셉스 딥 머신': { id: 'triceps_dip_machine', frames: 3 },
  '리스트 컬': { id: 'wrist_curl', frames: 3 },
  '앱 크런치 머신': { id: 'ab_crunch_machine', frames: 3 },
  '브이 업': { id: 'v_up', frames: 3 },
  '할로우 홀드': { id: 'hollow_hold', frames: 1 },
  '스플릿 스쿼트': { id: 'split_squat', frames: 3 },
  '플러터 킥': { id: 'flutter_kick', frames: 3 },
  '토즈 투 바': { id: 'toes_to_bar', frames: 3 },
  '케이블 우드찹': { id: 'cable_woodchop', frames: 3 },
  '인클라인 워킹': { id: 'incline_walking', frames: 3 },
  등산: { id: 'hiking', frames: 3 },
  '에어 바이크': { id: 'air_bike', frames: 3 },
  '배틀 로프': { id: 'battle_rope', frames: 3 },
  '섀도 복싱': { id: 'shadow_boxing', frames: 3 },
};

/** The movement drawn for an exercise of this name, if one was. */
export function moveOf(name: string): Move | undefined {
  return MOVES[name];
}

export const MOVE_NAMES = Object.keys(MOVES);

const ROUND = new Set([
  'running',
  'walking',
  'cycling',
  'jump_rope',
  'stair_climb',
  'elliptical',
  'high_knees',
  'swimming',
  'stairmaster',
  'farmers_walk',
  'incline_walking',
  'hiking',
  'air_bike',
  'shadow_boxing',
  // Up onto the box and that is the repetition: played backwards she would jump off it backwards.
  'box_jump',
]);

/**
 * Movements whose frames are not played in the order they were drawn. A burpee
 * drawn as stand · crouch · plank · push-up · jump and played straight through
 * went from lying on the floor to mid-air: the way back up was never shown.
 * It is the same two drawings in reverse, so they are shown again rather than
 * drawn again. The gathering before the jump (5) and the landing (6) were drawn
 * later and joined in where they happen, either side of the jump (5).
 */
const ORDER: Record<string, number[]> = {
  burpee: [0, 1, 2, 3, 2, 1, 4, 5, 6],
};

/**
 * Which frame to show at a tick: there and back again (0 1 2 1 0 1 …), because a
 * repetition goes down and comes up. Walking, running, cycling, skipping and
 * climbing stairs go round instead (0 1 2 0 1 2 …): a stride does not rewind, nor does a pedal
 * or a rope. A burpee has its own order, and goes round: after the jump she is
 * standing again.
 */
export function frameAt(move: Move, tick: number): number {
  if (move.frames === 1) return 0;
  const order = ORDER[move.id];
  if (order) return order[tick % order.length];
  if (ROUND.has(move.id)) return tick % move.frames;
  // There and back without resting twice on either end: 0 1 2 1, or 0 1 2 3 4 3 2 1.
  const at = tick % (2 * move.frames - 2);
  return at < move.frames ? at : 2 * move.frames - 2 - at;
}
