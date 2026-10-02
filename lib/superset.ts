/**
 * Two or three movements done in turn, resting only when the round is over.
 *
 * A superset is not a new kind of thing on the board. It is the blocks that
 * were already there, standing next to each other and carrying the same mark.
 * What changes is two answers the board gives after a set: which card opens
 * next, and whether the rest clock starts.
 *
 * Next to each other is part of the definition. Blocks that share a mark but
 * have been moved apart are not a superset any more — nobody alternates
 * between the first movement and the fifth — and treating them as one would
 * have the board jumping across the session after every set.
 */

/** A block as this file needs it: where it stands, its mark, what is left. */
export type Block = { blockId: string; superset: string | null; left: number };

/** More than three is a circuit, and wants a different screen than this one. */
export const SUPERSET_MAX = 3;

/**
 * The blocks this one alternates with, itself included, in board order.
 *
 * Empty when it stands alone — a mark shared with nobody adjacent is no mark.
 */
export function mates(blocks: Block[], blockId: string): Block[] {
  const at = blocks.findIndex((b) => b.blockId === blockId);
  const mark = blocks[at]?.superset;
  if (at === -1 || !mark) return [];

  let from = at;
  while (from > 0 && blocks[from - 1].superset === mark) from -= 1;
  let to = at;
  while (to < blocks.length - 1 && blocks[to + 1].superset === mark) to += 1;

  return to > from ? blocks.slice(from, to + 1) : [];
}

export type Turn = {
  /** The card to open, or null to let the board pick as it always has. */
  open: string | null;
  /** Whether the rest clock starts. */
  rest: boolean;
};

/**
 * What happens after a set in this block is finished.
 *
 * `blocks` is the board as it stands with that set already counted as done.
 *
 * Inside a round the next movement opens and nobody rests: that is what a
 * superset is. The round is over when there is nothing further down the group
 * still to do, and then the rest starts and the turn goes back to the top —
 * to the first one with sets left, which is not always the first one. Groups
 * are often uneven (three sets of one, two of the other), and the leftover
 * sets are simply done with their rests, as they would be alone.
 */
export function nextTurn(blocks: Block[], blockId: string): Turn {
  const group = mates(blocks, blockId);
  if (group.length === 0) return { open: null, rest: true };

  const at = group.findIndex((b) => b.blockId === blockId);
  const further = group.slice(at + 1).find((b) => b.left > 0);
  if (further) return { open: further.blockId, rest: false };

  const again = group.slice(0, at + 1).find((b) => b.left > 0);
  return { open: again?.blockId ?? null, rest: true };
}

/**
 * Whether this block can be tied to the one below it.
 *
 * Both need something left to do: tying a finished movement to an unfinished
 * one alternates with nothing. And the result has to stay within three.
 */
export function canLink(blocks: Block[], blockId: string): boolean {
  const at = blocks.findIndex((b) => b.blockId === blockId);
  const below = blocks[at + 1];
  if (at === -1 || !below) return false;
  if (blocks[at].left === 0 || below.left === 0) return false;

  const mine = mates(blocks, blockId);
  if (mine.some((b) => b.blockId === below.blockId)) return false;
  const theirs = mates(blocks, below.blockId);
  return Math.max(1, mine.length) + Math.max(1, theirs.length) <= SUPERSET_MAX;
}

/**
 * The marks to write so this block and the one below alternate.
 *
 * Whatever either was already tied to comes along, under one mark. `fresh` is
 * used only when neither had one — the caller makes it, so this stays a pure
 * function of the board.
 */
export function link(blocks: Block[], blockId: string, fresh: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!canLink(blocks, blockId)) return out;

  const at = blocks.findIndex((b) => b.blockId === blockId);
  const below = blocks[at + 1];
  const mine = mates(blocks, blockId);
  const theirs = mates(blocks, below.blockId);
  const members = [
    ...(mine.length ? mine : [blocks[at]]),
    ...(theirs.length ? theirs : [below]),
  ];
  const mark = mine[0]?.superset ?? theirs[0]?.superset ?? fresh;
  for (const b of members) out.set(b.blockId, mark);
  return out;
}

/** Every block of this one's group, to be set free together. */
export function unlink(blocks: Block[], blockId: string): string[] {
  return mates(blocks, blockId).map((b) => b.blockId);
}

/**
 * The blocks that move when this one is brought forward.
 *
 * The whole group, in order. Moving one alone would leave it marked and
 * apart, which by the definition above quietly ends the superset — and the
 * person only said 「이거 먼저」, not 「이제 따로 할게요」.
 */
export function movesWith(blocks: Block[], blockId: string): string[] {
  const group = mates(blocks, blockId);
  return group.length ? group.map((b) => b.blockId) : [blockId];
}

/**
 * The ties from last time, laid onto today's board.
 *
 * A routine does not store its supersets; the last session of it does, the
 * same way it holds the weights. So a new session of that routine starts tied
 * as the last one ended, and untying once is remembered just as tying once is.
 *
 * A group comes across only if today's board has the same movements standing
 * together in the same order. If the routine has been edited so that they no
 * longer do, the tie is dropped rather than bent to fit: tying two movements
 * that were never done in turn is a guess about someone's training.
 *
 * `mark` makes the marks, so this stays a pure function. Returns one entry
 * per block of `next`: its mark, or null.
 */
export function carryTies(
  previous: { exerciseId: string; superset: string | null }[],
  next: { exerciseId: string }[],
  mark: () => string
): (string | null)[] {
  const out: (string | null)[] = next.map(() => null);

  const asBlocks: Block[] = previous.map((b, i) => ({
    blockId: String(i),
    superset: b.superset,
    left: 1,
  }));
  const seen = new Set<number>();
  for (let i = 0; i < asBlocks.length; i += 1) {
    if (seen.has(i)) continue;
    const group = mates(asBlocks, String(i));
    if (group.length === 0) continue;
    const members = group.map((b) => Number(b.blockId));
    for (const m of members) seen.add(m);

    const wanted = members.map((m) => previous[m].exerciseId);
    for (let at = 0; at + wanted.length <= next.length; at += 1) {
      const fits = wanted.every(
        (exerciseId, k) => next[at + k].exerciseId === exerciseId && out[at + k] === null
      );
      if (!fits) continue;
      const fresh = mark();
      for (let k = 0; k < wanted.length; k += 1) out[at + k] = fresh;
      break;
    }
  }
  return out;
}
