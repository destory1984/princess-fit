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
export type Move = { id: string; frames: 1 | 3 };

const MOVES: Record<string, Move> = {
  스쿼트: { id: 'squat', frames: 3 },
  벤치프레스: { id: 'bench_press', frames: 3 },
  데드리프트: { id: 'deadlift', frames: 3 },
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
};

/** The movement drawn for an exercise of this name, if one was. */
export function moveOf(name: string): Move | undefined {
  return MOVES[name];
}

export const MOVE_NAMES = Object.keys(MOVES);

/**
 * Which frame to show at a tick: there and back again (0 1 2 1 0 1 …), because a
 * repetition goes down and comes up. Walking, running and cycling go round
 * instead (0 1 2 0 1 2 …): a stride does not rewind, nor does a pedal.
 */
export function frameAt(move: Move, tick: number): number {
  if (move.frames === 1) return 0;
  if (move.id === 'running' || move.id === 'walking' || move.id === 'cycling') return tick % 3;
  return [0, 1, 2, 1][tick % 4];
}
