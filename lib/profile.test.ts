import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bodyKgOf,
  isPerHand,
  LEVEL_UP_SESSIONS,
  levelOf,
  levelUpDue,
  sexOf,
  startWeight,
  type Who,
} from './profile.ts';

const who = (over: Partial<Who> = {}): Who => ({ sex: 'male', level: 'beginner', bodyKg: 70, ...over });

test('what was not said stays unsaid', () => {
  assert.equal(sexOf(null), null);
  assert.equal(sexOf('other'), null);
  assert.equal(sexOf('female'), 'female');
  assert.equal(levelOf(null), 'beginner');
  assert.equal(levelOf('intermediate'), 'intermediate');
  assert.equal(bodyKgOf(7), null);
  assert.equal(bodyKgOf(700), null);
  assert.equal(bodyKgOf(62.5), 62.5);
});

test('no weight is offered without knowing who it is for', () => {
  assert.equal(startWeight('스쿼트', who({ bodyKg: null })), null);
  assert.equal(startWeight('스쿼트', who({ sex: null })), null);
  // A movement not on the list starts empty rather than borrowing a number.
  assert.equal(startWeight('케이블 우드찹', who()), null);
});

test('a barbell movement never starts below the bar', () => {
  assert.equal(startWeight('오버헤드 프레스', who({ bodyKg: 50 })), 20);
  assert.equal(startWeight('오버헤드 프레스', who({ sex: 'female', bodyKg: 45 })), 15);
});

test('the same movement starts lighter for a woman and heavier for someone who has trained', () => {
  const man = startWeight('스쿼트', who())!;
  const woman = startWeight('스쿼트', who({ sex: 'female' }))!;
  const trained = startWeight('스쿼트', who({ level: 'intermediate' }))!;
  assert.ok(woman < man, `${woman} < ${man}`);
  assert.ok(trained > man, `${trained} > ${man}`);
});

test('every offered weight is one a rack can make, and is low', () => {
  for (const name of ['스쿼트', '데드리프트', '벤치프레스', '레그 프레스', '덤벨 프레스', '덤벨 컬']) {
    for (const bodyKg of [45, 60, 80, 110]) {
      for (const sex of ['female', 'male'] as const) {
        const kg = startWeight(name, who({ sex, bodyKg }))!;
        assert.ok(kg > 0);
        // Whole kilos under 20, 2.5s above.
        assert.equal(kg < 20 ? kg % 1 : (kg * 10) % 25, 0, `${name} ${sex} ${bodyKg}: ${kg}`);
        // Nobody new is started above their own body weight.
        assert.ok(kg <= bodyKg, `${name} ${sex} ${bodyKg}: ${kg}`);
      }
    }
  }
});

test('a dumbbell weight is said to be for one hand', () => {
  assert.ok(isPerHand('덤벨 컬'));
  assert.ok(!isPerHand('스쿼트'));
  assert.ok(!isPerHand('없는 종목'));
});

test('the heavier routines are offered after enough sessions over enough weeks, not either alone', () => {
  const today = new Date('2026-10-06T12:00:00');
  const at = (daysAgo: number) => ({
    started_at: new Date(today.getTime() - daysAgo * 86_400_000).toISOString(),
  });
  // Two dozen in one keen month.
  const keen = Array.from({ length: LEVEL_UP_SESSIONS }, (_, i) => at(i));
  assert.equal(levelUpDue('beginner', keen, today), false);
  // Ten weeks of turning up once.
  const sparse = Array.from({ length: 10 }, (_, i) => at(i * 7));
  assert.equal(levelUpDue('beginner', sparse, today), false);
  // Both.
  const steady = Array.from({ length: LEVEL_UP_SESSIONS }, (_, i) => at(i * 3));
  assert.equal(levelUpDue('beginner', steady, today), true);
  // Someone already there is not asked again.
  assert.equal(levelUpDue('intermediate', steady, today), false);
});
