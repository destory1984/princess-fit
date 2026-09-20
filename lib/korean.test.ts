import assert from 'node:assert/strict';
import test from 'node:test';
import { endsInConsonant, particle, withParticle } from './korean.ts';

test('a syllable ending in a consonant is told from one that does not', () => {
  assert.equal(endsInConsonant('둔근'), true);
  assert.equal(endsInConsonant('목걸이'), false);
  assert.equal(endsInConsonant('리본'), true);
  assert.equal(endsInConsonant('대퇴사두'), false);
  assert.equal(endsInConsonant('가슴'), true);
  assert.equal(endsInConsonant('종아리'), false);
});

test('the particles this app actually prints', () => {
  assert.equal(withParticle('금빛 목걸이', '을를'), '금빛 목걸이를');
  assert.equal(withParticle('머리 리본', '을를'), '머리 리본을');
  assert.equal(withParticle('둔근', '은는'), '둔근은');
  assert.equal(withParticle('종아리', '은는'), '종아리는');
  assert.equal(withParticle('삼두', '이가'), '삼두가');
  assert.equal(withParticle('복근', '이가'), '복근이');
});

test('ㄹ takes 로, which is the whole reason 으로 needs its own rule', () => {
  assert.equal(withParticle('서울', '으로로'), '서울로');
  // 트 has no final consonant of its own, so it takes 로 like any open syllable.
  assert.equal(withParticle('스쿼트', '으로로'), '스쿼트로');
  assert.equal(withParticle('62.5kg', '으로로'), '62.5kg으로');
});

test('numbers are read the way they are said aloud', () => {
  // 1 일, 3 삼, 6 육, 7 칠, 8 팔 close; 2 이, 4 사, 5 오, 9 구, 0 영 do not.
  assert.equal(withParticle('1', '은는'), '1은');
  assert.equal(withParticle('2', '은는'), '2는');
  assert.equal(withParticle('5', '은는'), '5는');
  assert.equal(withParticle('7', '은는'), '7은');
  assert.equal(withParticle('30', '이가'), '30이');
});

test('units are read as words, not spelled out letter by letter', () => {
  // kg is 킬로그램, which ends in ㅁ — nothing like the 지 a bare "g" gives.
  assert.equal(withParticle('62.5kg', '이가'), '62.5kg이');
  assert.equal(withParticle('1RM', '은는'), '1RM은');
  assert.equal(withParticle('30%', '은는'), '30%는');
  assert.equal(withParticle('A', '은는'), 'A는');
});

test('trailing spaces do not change which particle is chosen', () => {
  assert.equal(particle('목걸이  ', '을를'), '를');
  assert.equal(particle('둔근 ', '은는'), '은');
});

test('an unreadable ending falls back rather than guessing', () => {
  // An emoji or a symbol has no sound to read; the consonant form is the one
  // that survives being wrong when said out loud.
  assert.equal(particle('🔥', '은는'), '은');
  assert.equal(particle('', '은는'), '은');
  assert.equal(endsInConsonant('🔥'), null);
});

test('every pair produces one of its own two forms and nothing else', () => {
  const pairs = ['을를', '은는', '이가', '와과', '으로로', '이에요예요'] as const;
  const forms: Record<(typeof pairs)[number], string[]> = {
    을를: ['을', '를'],
    은는: ['은', '는'],
    이가: ['이', '가'],
    와과: ['과', '와'],
    으로로: ['으로', '로'],
    이에요예요: ['이에요', '예요'],
  };
  for (const pair of pairs) {
    for (const word of ['둔근', '목걸이', '서울', '1RM', '7', '🔥']) {
      assert.ok(forms[pair].includes(particle(word, pair)), `${word} + ${pair}`);
    }
  }
});

test('metres end open and grams do not, which is the whole point of the table', () => {
  assert.equal(withParticle('4.1km', '은는'), '4.1km는');
  assert.equal(withParticle('170cm', '은는'), '170cm는');
  assert.equal(withParticle('60kg', '은는'), '60kg은');
});
