import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { initialsOf, isInitialsOnly, matches, matchesAny } from './hangul.ts';

test('initials come out of the syllables', () => {
  assert.equal(initialsOf('스쿼트'), 'ㅅㅋㅌ');
  assert.equal(initialsOf('바벨 벤치 프레스'), 'ㅂㅂㅂㅊㅍㄹㅅ');
  assert.equal(initialsOf('레그 프레스'), 'ㄹㄱㅍㄹㅅ');
});

test('spaces are dropped, so nobody has to remember where they were', () => {
  assert.equal(initialsOf('바벨 스쿼트'), initialsOf('바벨스쿼트'));
  assert.ok(matches('바벨 스쿼트', 'ㅂㅂㅅㅋㅌ'));
  assert.ok(matches('바벨 스쿼트', 'ㅂㅂ ㅅㅋㅌ'));
});

test('latin and digits survive, so 1RM is still findable', () => {
  assert.equal(initialsOf('1RM 계산'), '1rmㄱㅅ');
  assert.ok(matches('1RM 계산기', '1rm'));
  assert.ok(matches('1RM 계산기', '계산'));
});

test('a bare consonant query searches initials; a syllable does not', () => {
  assert.ok(isInitialsOnly('ㅅㅋㅌ'));
  assert.ok(isInitialsOnly('ㄲ'));
  assert.ok(!isInitialsOnly('스'));
  assert.ok(!isInitialsOnly('ㅅ쿼'));
  assert.ok(!isInitialsOnly(''));
});

test('a syllable still means that syllable', () => {
  // 「스」 must not behave as "anything starting with ㅅ", or a real search
  // turns into a wildcard the moment someone types one letter.
  assert.ok(matches('스쿼트', '스'));
  assert.ok(!matches('시티드 로우', '스'));
});

test('an empty query matches everything, which is what an empty box means', () => {
  assert.ok(matches('무엇이든', ''));
  assert.ok(matches('무엇이든', '   '));
  assert.ok(matchesAny(['가슴', null], ''));
});

test('matching ignores case on the latin side', () => {
  assert.ok(matches('Barbell Squat', 'barbell'));
  assert.ok(matches('barbell squat', 'SQUAT'));
});

test('any field can answer, and empty fields never do', () => {
  assert.ok(matchesAny(['스쿼트', '하체'], 'ㅎㅊ'));
  assert.ok(!matchesAny([null, undefined, ''], 'ㅎㅊ'));
});

test('every movement in the catalogue is reachable by its own initials', () => {
  for (const exercise of DEFAULT_EXERCISES) {
    const initials = initialsOf(exercise.name);
    assert.ok(
      matches(exercise.name, initials),
      `${exercise.name} cannot be found by ${initials}`
    );
  }
});

test('a partial run of initials finds it, since nobody types the whole thing', () => {
  const squat = DEFAULT_EXERCISES.find((e) => e.name === '스쿼트');
  assert.ok(squat, '스쿼트 missing from the catalogue');
  assert.ok(matches(squat.name, 'ㅅㅋ'));
  assert.ok(matches('레그 익스텐션', 'ㄹㄱ'));
});

test('initials that belong to nothing find nothing', () => {
  const found = DEFAULT_EXERCISES.filter((e) => matches(e.name, '�headache'));
  assert.equal(found.length, 0);
});
