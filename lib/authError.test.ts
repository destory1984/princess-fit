import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainAuth } from './authError.ts';

test('the complaints a person at the door can cause are said in Korean', () => {
  assert.match(explainAuth('Invalid login credentials'), /맞지 않아요/);
  assert.match(explainAuth('User already registered'), /이미 가입/);
  assert.match(explainAuth('Email not confirmed'), /인증/);
  assert.match(explainAuth('TypeError: Failed to fetch'), /인터넷/);
  assert.match(explainAuth('email rate limit exceeded'), /1분/);
});

test('the shortest password allowed is the one the server said', () => {
  assert.equal(explainAuth('Password should be at least 6 characters.'), '비밀번호는 6자 이상이어야 해요.');
  assert.equal(explainAuth('Password should be at least 8 characters'), '비밀번호는 8자 이상이어야 해요.');
});

test('a complaint nobody foresaw is shown as it came, and silence still says something', () => {
  assert.equal(explainAuth('Database error saving new user'), 'Database error saving new user');
  assert.equal(explainAuth(''), '다시 시도해 주세요.');
  assert.equal(explainAuth(null), '다시 시도해 주세요.');
});
