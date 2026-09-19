import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FURNITURE,
  replaces,
  roomContents,
  roomMood,
  roomProgress,
  STARTER,
} from './room.ts';

test('a new room holds nothing but the cheap bed', () => {
  const contents = roomContents([]);
  assert.deepEqual(
    contents.map((f) => f.id),
    [STARTER.id]
  );
  assert.match(roomMood([]), /침대 하나뿐/);
});

test('a better bed replaces the cot rather than joining it', () => {
  const contents = roomContents(['bed']);
  const beds = contents.filter((f) => f.slot === 'bed');
  assert.equal(beds.length, 1);
  assert.equal(beds[0].id, 'bed');
  assert.equal(replaces(FURNITURE.find((f) => f.id === 'bed')!, [])!.id, STARTER.id);
});

test('pieces in different slots all stay in the room', () => {
  const contents = roomContents(['rug', 'shelf', 'chandelier']);
  assert.equal(contents.length, 4, 'three bought plus the cot');
});

test('the rug goes down before the furniture stands on it', () => {
  const order = roomContents(['rug', 'bed', 'chandelier']).map((f) => f.slot);
  assert.ok(order.indexOf('rug') < order.indexOf('bed'));
  assert.ok(order.indexOf('bed') < order.indexOf('light'));
});

test('every piece has a distinct id and a place in the room', () => {
  const ids = [STARTER, ...FURNITURE].map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of [STARTER, ...FURNITURE]) {
    assert.ok(f.place.w > 0 && f.place.w <= 1, f.id);
    assert.ok(f.place.x >= 0 && f.place.x + f.place.w <= 1.001, `${f.id} fits the wall`);
    assert.ok(f.place.y >= 0 && f.place.y < 1, f.id);
  }
});

test('progress counts by price and finishes only when the room is full', () => {
  assert.equal(roomProgress([]).count, 0);
  const done = roomProgress(FURNITURE.map((f) => f.id));
  assert.equal(done.complete, true);
  assert.equal(done.ratio, 1);
  assert.match(roomMood(FURNITURE.map((f) => f.id)), /더 들일 것이 없는/);
});
