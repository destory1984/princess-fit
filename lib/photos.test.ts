import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookends, byMonth, newPhotoId, sortPhotos, spanDays, type Photo } from './photos.ts';

const shot = (id: string, takenOn: string): Photo => ({ id, uri: `file:///${id}.jpg`, takenOn });

test('photos come back newest first', () => {
  const photos = [shot('a', '2026-07-01'), shot('b', '2026-09-20'), shot('c', '2026-08-10')];
  assert.deepEqual(
    sortPhotos(photos).map((p) => p.id),
    ['b', 'c', 'a']
  );
});

test('two shots on one day keep a stable order', () => {
  const same = [shot('1', '2026-09-20'), shot('2', '2026-09-20')];
  assert.deepEqual(sortPhotos(same), sortPhotos([...same].reverse()));
});

test('months group newest first, and keep their own order inside', () => {
  const photos = [shot('a', '2026-07-01'), shot('b', '2026-09-20'), shot('c', '2026-09-02')];
  const groups = byMonth(photos);
  assert.deepEqual(
    groups.map((g) => g.month),
    ['2026-09', '2026-07']
  );
  assert.deepEqual(
    groups[0].photos.map((p) => p.id),
    ['b', 'c']
  );
});

// The before-and-after is the whole point; one photo is not a comparison.
test('a single photo is not a before and after', () => {
  assert.equal(bookends([shot('a', '2026-09-20')]), null);
  assert.equal(bookends([]), null);
});

test('the bookends are the oldest and the newest', () => {
  const photos = [shot('a', '2026-07-01'), shot('b', '2026-09-20'), shot('c', '2026-08-10')];
  const ends = bookends(photos)!;
  assert.equal(ends.first.id, 'a');
  assert.equal(ends.latest.id, 'b');
});

test('the span is counted from the first photo to today', () => {
  const photos = [shot('a', '2026-08-21'), shot('b', '2026-09-10')];
  assert.equal(spanDays(photos, new Date(2026, 8, 20)), 30);
  assert.equal(spanDays([], new Date(2026, 8, 20)), 0);
});

test('ids do not collide when two are made in the same moment', () => {
  const now = new Date();
  assert.notEqual(newPhotoId(now), newPhotoId(now));
});
