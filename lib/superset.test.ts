import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canLink, link, mates, movesWith, nextTurn, unlink, type Block } from './superset.ts';

const b = (blockId: string, superset: string | null, left: number): Block => ({
  blockId,
  superset,
  left,
});

test('a block alone rests after every set and lets the board choose', () => {
  const board = [b('0', null, 2), b('1', null, 3)];
  assert.deepEqual(nextTurn(board, '0'), { open: null, rest: true });
});

test('inside a round the next movement opens and nobody rests', () => {
  // Bench just done (2 left of 3), row still has all 3.
  const board = [b('0', 's', 2), b('1', 's', 3)];
  assert.deepEqual(nextTurn(board, '0'), { open: '1', rest: false });
});

test('the round ends at the last movement: rest, then back to the top', () => {
  const board = [b('0', 's', 2), b('1', 's', 2)];
  assert.deepEqual(nextTurn(board, '1'), { open: '0', rest: true });
});

test('three movements go round in order', () => {
  const board = [b('0', 's', 1), b('1', 's', 2), b('2', 's', 2)];
  assert.deepEqual(nextTurn(board, '0'), { open: '1', rest: false });
  assert.deepEqual(nextTurn([b('0', 's', 1), b('1', 's', 1), b('2', 's', 2)], '1'), {
    open: '2',
    rest: false,
  });
  assert.deepEqual(nextTurn([b('0', 's', 1), b('1', 's', 1), b('2', 's', 1)], '2'), {
    open: '0',
    rest: true,
  });
});

test('uneven groups finish the leftover sets with their rests', () => {
  // Three sets of bench, two of row. Row is finished; bench has one left.
  const afterRow2 = [b('0', 's', 1), b('1', 's', 0)];
  assert.deepEqual(nextTurn(afterRow2, '1'), { open: '0', rest: true });
  // The last bench set: nothing left anywhere in the group.
  const afterBench3 = [b('0', 's', 0), b('1', 's', 0)];
  assert.deepEqual(nextTurn(afterBench3, '0'), { open: null, rest: true });
});

test('a finished movement further down is skipped, not opened', () => {
  // Bench done, row already finished: the round is over, bench again.
  const board = [b('0', 's', 2), b('1', 's', 0)];
  assert.deepEqual(nextTurn(board, '0'), { open: '0', rest: true });
});

test('walking a whole superset rests once per round', () => {
  const left = { '0': 3, '1': 3 } as Record<string, number>;
  const board = () => [b('0', 's', left['0']), b('1', 's', left['1'])];
  let on = '0';
  let rests = 0;
  const order: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    order.push(on);
    left[on] -= 1;
    const turn = nextTurn(board(), on);
    if (turn.rest) rests += 1;
    if (turn.open) on = turn.open;
  }
  assert.deepEqual(order, ['0', '1', '0', '1', '0', '1']);
  assert.equal(rests, 3);
});

test('blocks that share a mark but stand apart are not a superset', () => {
  const board = [b('0', 's', 2), b('1', null, 2), b('2', 's', 2)];
  assert.deepEqual(mates(board, '0'), []);
  assert.deepEqual(nextTurn(board, '0'), { open: null, rest: true });
});

test('two supersets side by side stay two', () => {
  const board = [b('0', 'x', 2), b('1', 'x', 2), b('2', 'y', 2), b('3', 'y', 2)];
  assert.deepEqual(mates(board, '1').map((m) => m.blockId), ['0', '1']);
  assert.deepEqual(mates(board, '2').map((m) => m.blockId), ['2', '3']);
});

test('linking ties a block to the one below under a fresh mark', () => {
  const board = [b('0', null, 3), b('1', null, 3), b('2', null, 3)];
  assert.ok(canLink(board, '0'));
  assert.deepEqual([...link(board, '0', 'new')], [['0', 'new'], ['1', 'new']]);
});

test('linking onto an existing pair joins it and keeps its mark', () => {
  const board = [b('0', 's', 3), b('1', 's', 3), b('2', null, 3)];
  assert.ok(canLink(board, '1'));
  assert.deepEqual([...link(board, '1', 'new')], [['0', 's'], ['1', 's'], ['2', 's']]);
});

test('no more than three, and never with a finished movement', () => {
  const four = [b('0', 's', 3), b('1', 's', 3), b('2', 's', 3), b('3', null, 3)];
  assert.equal(canLink(four, '2'), false);
  assert.equal(link(four, '2', 'new').size, 0);

  const pairs = [b('0', 'x', 3), b('1', 'x', 3), b('2', 'y', 3), b('3', 'y', 3)];
  assert.equal(canLink(pairs, '1'), false);

  assert.equal(canLink([b('0', null, 0), b('1', null, 3)], '0'), false);
  assert.equal(canLink([b('0', null, 3), b('1', null, 0)], '0'), false);
});

test('the last block has nothing below to tie to, and mates are already tied', () => {
  const board = [b('0', 's', 3), b('1', 's', 3)];
  assert.equal(canLink(board, '1'), false);
  assert.equal(canLink(board, '0'), false);
});

test('unlinking frees the whole group', () => {
  const board = [b('0', 's', 3), b('1', 's', 3), b('2', 's', 3), b('3', null, 3)];
  assert.deepEqual(unlink(board, '1'), ['0', '1', '2']);
  assert.deepEqual(unlink(board, '3'), []);
});

test('bringing one forward brings its group', () => {
  const board = [b('0', null, 3), b('1', 's', 3), b('2', 's', 3)];
  assert.deepEqual(movesWith(board, '2'), ['1', '2']);
  assert.deepEqual(movesWith(board, '0'), ['0']);
});
