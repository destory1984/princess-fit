import assert from 'node:assert/strict';
import test from 'node:test';
import { bringForward, canBringForward, type Board } from './order.ts';

const ids = (board: Board) => board.map((e) => e.blockId);

test('an exercise comes to the front of what is still to do', () => {
  const board: Board = [
    { blockId: 'a', done: false },
    { blockId: 'b', done: false },
    { blockId: 'c', done: false },
  ];
  assert.deepEqual(ids(bringForward(board, 'c')), ['c', 'a', 'b']);
});

test('it never jumps in front of work already done', () => {
  // Those are minutes that happened in an order, and moving them would be the
  // board disagreeing with the afternoon it recorded.
  const board: Board = [
    { blockId: 'done1', done: true },
    { blockId: 'done2', done: true },
    { blockId: 'a', done: false },
    { blockId: 'b', done: false },
  ];
  assert.deepEqual(ids(bringForward(board, 'b')), ['done1', 'done2', 'b', 'a']);
});

test('the one already next is left alone, and offered no button', () => {
  const board: Board = [
    { blockId: 'a', done: false },
    { blockId: 'b', done: false },
  ];
  assert.equal(bringForward(board, 'a'), board);
  assert.ok(!canBringForward(board, 'a'));
  assert.ok(canBringForward(board, 'b'));
});

test('a board with nothing left to do cannot be reordered into one', () => {
  const board: Board = [
    { blockId: 'a', done: true },
    { blockId: 'b', done: true },
  ];
  // Moving 'a' would put it after 'b', which is a real change but a pointless
  // one — so it lands at the end and the caller may still write it.
  assert.deepEqual(ids(bringForward(board, 'a')), ['b', 'a']);
});

test('an exercise that is not on the board changes nothing', () => {
  const board: Board = [{ blockId: 'a', done: false }];
  assert.equal(bringForward(board, 'zzz'), board);
  assert.ok(!canBringForward(board, 'zzz'));
});

test('an empty board is not an error', () => {
  assert.deepEqual(bringForward([], 'a'), []);
});
