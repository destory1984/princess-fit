import assert from 'node:assert/strict';
import test from 'node:test';
import { explain } from './dbError.ts';

test('a missing column says which one, and what to run', () => {
  // The raw sentence is accurate and tells the reader nothing they can do.
  const said = explain(
    new Error("Could not find the 'hidden' column of 'exercises' in the schema cache")
  );
  assert.match(said, /exercises\.hidden/);
  assert.match(said, /migrate\.sql/);
  assert.match(said, /reload schema/);
});

test('anything else is passed through untouched', () => {
  // A made-up explanation is worse than a raw one: it sends people looking in
  // the wrong place.
  assert.equal(explain(new Error('네트워크 연결 없음')), '네트워크 연결 없음');
  assert.equal(explain('duplicate key value violates unique constraint'),
    'duplicate key value violates unique constraint');
});

test('nothing at all does not become "undefined"', () => {
  assert.equal(explain(null), '');
  assert.equal(explain(undefined), '');
});

test('a rejection that is not an Error still reads', () => {
  // Supabase rejects with a plain object, and checking instanceof Error alone
  // turned a readable complaint into 「[object Object]」 — less use than the
  // raw text it was meant to improve on.
  const postgrest = {
    message: "Could not find the 'hidden' column of 'exercises' in the schema cache",
    details: null,
    hint: null,
    code: 'PGRST204',
  };
  assert.match(explain(postgrest), /exercises\.hidden/);
  assert.equal(explain({ message: '권한이 없습니다' }), '권한이 없습니다');
});

test('something with no message at all does not print its shape', () => {
  assert.equal(explain({ code: 'PGRST204' }), '');
  assert.equal(explain({}), '');
});
