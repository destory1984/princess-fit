import assert from 'node:assert/strict';
import test from 'node:test';
import { filterUsers, pageOf } from '../public/adminList.js';

const u = (email: string | null) => ({ email });
const people = [u('Kim@Example.com'), u('lee@test.kr'), u(null), u('park.kim@test.kr')];

test('empty or blank query keeps everyone, in order', () => {
  assert.deepEqual(filterUsers(people, ''), people);
  assert.deepEqual(filterUsers(people, '   '), people);
});

test('matches part of the email, ignoring case', () => {
  assert.deepEqual(filterUsers(people, 'KIM'), [people[0], people[3]]);
  assert.deepEqual(filterUsers(people, 'test.kr'), [people[1], people[3]]);
});

test('every word must match', () => {
  assert.deepEqual(filterUsers(people, 'kim test'), [people[3]]);
});

test('no email never matches a real query', () => {
  assert.ok(!filterUsers(people, 'a').includes(people[2]));
});

test('does not touch the list it was given', () => {
  const copy = [...people];
  filterUsers(people, 'kim');
  assert.deepEqual(people, copy);
});

const ten = Array.from({ length: 10 }, (_, i) => i);

test('cuts a page', () => {
  assert.deepEqual(pageOf(ten, 2, 4), { rows: [4, 5, 6, 7], page: 2, pages: 3, total: 10 });
  assert.deepEqual(pageOf(ten, 3, 4).rows, [8, 9]);
});

test('clamps a page out of range', () => {
  assert.equal(pageOf(ten, 9, 4).page, 3);
  assert.equal(pageOf(ten, 0, 4).page, 1);
  assert.equal(pageOf(ten, -2, 4).page, 1);
});

test('an empty list is page 1 of 1', () => {
  assert.deepEqual(pageOf([], 5, 4), { rows: [], page: 1, pages: 1, total: 0 });
});

test('exact multiple has no empty trailing page', () => {
  assert.equal(pageOf(Array(8).fill(0), 1, 4).pages, 2);
});
