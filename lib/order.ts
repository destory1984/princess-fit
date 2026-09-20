/**
 * Doing them in a different order than they were planned.
 *
 * Two reviews of a much larger app, one asking and one complaining: 「다른
 * 사람이 기구를 쓰고 있으면 해당 추천 운동을 할 수 없을 경우 루틴 중 다른
 * 운동으로 빠르게 교체할 수 있으면 좋을 것 같습니다」 and 「운동 순서 변경 시
 * 버벅거림」. The second is the more useful one: they had dragging, and
 * dragging is what made it slow.
 *
 * So not dragging. One tap that means 「이거 먼저 할게요」, which is the only
 * thing anyone actually wants in a gym — the rack is free now, the machine is
 * taken, the order on the board has stopped matching the room. Dragging a card
 * to a precise slot is a thing people do while planning, sitting down, and
 * this screen is not for sitting down.
 *
 * What is already done never moves. Those are minutes that happened in an
 * order, and reshuffling them would be the board disagreeing with the
 * afternoon it recorded.
 */

/**
 * The blocks on the board, first to last.
 *
 * A block rather than an exercise, because the same movement can now sit on
 * the board twice — 「A머신 이후 마지막단계 A머신 한번더」 — and the two are
 * separate things to move around.
 */
export type Board = { blockId: string; done: boolean }[];

/**
 * The board with this exercise brought to the front of what is still to do.
 *
 * In front of the unfinished ones, behind every finished one. Putting it above
 * work that is already logged would be claiming it happened earlier than it
 * did; putting it at the very end of everything would be ignoring the tap.
 *
 * Returns the same array when there is nothing to change, so a caller can skip
 * the write rather than sending a reorder that reorders nothing.
 */
export function bringForward(board: Board, blockId: string): Board {
  const moving = board.find((e) => e.blockId === blockId);
  if (!moving) return board;

  const rest = board.filter((e) => e.blockId !== blockId);
  const firstUndone = rest.findIndex((e) => !e.done);
  const at = firstUndone === -1 ? rest.length : firstUndone;

  const next = [...rest.slice(0, at), moving, ...rest.slice(at)];
  const same = next.every((e, i) => e.blockId === board[i].blockId);
  return same ? board : next;
}

/**
 * Whether the tap would do anything, which is whether to offer it.
 *
 * A button that is visibly there and visibly does nothing teaches people to
 * stop trusting the buttons, so the first thing still to do does not get one.
 */
export function canBringForward(board: Board, blockId: string) {
  return bringForward(board, blockId) !== board;
}
