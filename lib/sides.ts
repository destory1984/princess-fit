/**
 * Movements done one side at a time, and what the two sides say.
 *
 * From a review of a much larger app, twice over: 「좌우 교대가 필요한 운동의
 * 경우 왜 좌우 세트 운동 지원을 하지 않는지 궁금하구요」 and 「몸에 왼팔과
 * 오른팔, 왼다리와 오른다리에 힘이 달라서 운동할 때 오른쪽은 자극이 잘 되는데
 * 왼쪽은 자극이 되는지 안되는지 모르겠어요. 혹시 왼쪽과 오른쪽 힘의 균형을
 * 맞출 수 있는 프로그램 같은 걸 만들어주실 수 있나요?」
 *
 * Neither of the two apps this one is measured against does it. Both were
 * asked. That is the reason to build it properly rather than as a label on a
 * set: the point is not to record which arm, it is to be able to answer the
 * question at the end — 「어느 쪽이 약한가요」.
 *
 * One side of a body is almost always a little stronger, and saying so about
 * every small gap would turn a real signal into nagging. So there is a
 * threshold, and below it she says nothing at all.
 */

export type Side = 'L' | 'R';

export const SIDE_LABEL: Record<Side, string> = { L: '왼쪽', R: '오른쪽' };

/** The other one, for alternating as you go. */
export function otherSide(side: Side): Side {
  return side === 'L' ? 'R' : 'L';
}

/**
 * Movements worth asking the question about.
 *
 * Only the ones genuinely done one limb at a time. A dumbbell press uses both
 * arms at once and would answer 「같아요」 forever, which teaches people to
 * ignore the answer — and the whole value of this is that the answer means
 * something on the day it changes.
 */
export const UNILATERAL = new Set([
  '원암 덤벨 로우',
  '불가리안 스플릿 스쿼트',
  '스텝업',
  '런지',
  '케이블 킥백',
  '덩키 킥',
  '트라이셉스 킥백',
]);

/**
 * Whether to ask the question about this movement.
 *
 * The list above covers the catalogue, and a catalogue is not what everyone
 * trains from. Someone who adds 싱글 레그 데드리프트 by hand is exactly the
 * person who wanted this feature, and the name they typed is not on any list
 * — 「싱글 레그 데드리프트」, 「한발 데드」, 「SLDL」 are all the same movement
 * and no amount of guessing at the name catches all three. So the movement
 * carries the answer, and the list is only what to do when it does not.
 *
 * Null and undefined are not false. A row written before the column existed
 * arrives without it, and reading that as 「아니오」 would silently stop asking
 * about the seven that always worked.
 */
export function isUnilateral(name: string, unilateral?: boolean | null) {
  if (unilateral === true || unilateral === false) return unilateral;
  return UNILATERAL.has(name);
}

/** How far apart the two sides may be before it is worth mentioning. */
export const GAP = 0.1;

export type SidedSet = { side?: Side | null; weight_kg: number; reps: number; warmup?: boolean };

export type Balance = {
  left: number;
  right: number;
  /** Which side is behind, or null when they are close enough. */
  weaker: Side | null;
  /** How far behind, 0–1, for saying how much. */
  gap: number;
};

/**
 * What the two sides did, by the weight actually moved.
 *
 * Volume rather than top weight, because a side that manages the same kilos
 * for fewer reps is the case this exists to catch — and a top weight alone
 * would call that even.
 *
 * Null when one side has nothing: a comparison needs two things to compare,
 * and treating a missing side as zero would report a total collapse on the
 * arm nobody has trained yet today.
 */
export function balanceOf(sets: SidedSet[]): Balance | null {
  const working = sets.filter((s) => !s.warmup && s.reps > 0);
  const sideTotal = (side: Side) =>
    working
      .filter((s) => s.side === side)
      // Bodyweight work still counts: 「0kg × 12회」 on one leg and 8 on the
      // other is exactly the imbalance being looked for.
      .reduce((sum, s) => sum + Math.max(s.weight_kg, 1) * s.reps, 0);

  const left = sideTotal('L');
  const right = sideTotal('R');
  if (left === 0 || right === 0) return null;

  const weakerSide: Side = left < right ? 'L' : 'R';
  const gap = 1 - Math.min(left, right) / Math.max(left, right);
  return { left, right, weaker: gap >= GAP ? weakerSide : null, gap };
}

/**
 * Her line about it, or nothing.
 *
 * Silent when the sides are close, which is most of the time. A body is not
 * symmetrical and never will be, and an app that remarks on every three
 * percent is an app that gets ignored on the day it matters.
 */
export function balanceWord(balance: Balance | null, movement: string): string | null {
  if (!balance || !balance.weaker) return null;
  const behind = SIDE_LABEL[balance.weaker];
  const percent = Math.round(balance.gap * 100);
  if (balance.gap >= 0.25) {
    return `${movement}, ${behind}이 ${percent}%쯤 덜 나왔어요. 약한 쪽 먼저 해보시는 건 어떨까요?`;
  }
  return `${movement}, ${behind}이 조금 덜 나왔어요.`;
}

/**
 * The side the next set should be, given what has been done.
 *
 * Alternating, starting on the left, and following whatever was actually done
 * last rather than counting — a set deleted or added out of order should not
 * make the board ask for the same arm twice.
 */
export function nextSide(sets: { side?: Side | null; done: boolean }[]): Side {
  const done = sets.filter((s) => s.done && s.side);
  const last = done[done.length - 1]?.side;
  return last ? otherSide(last) : 'L';
}
