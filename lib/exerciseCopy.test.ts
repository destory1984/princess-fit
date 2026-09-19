import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coachTipOf, introOf, withParticle } from './exerciseCopy.ts';
import type { Exercise } from './types.ts';

type Described = Parameters<typeof introOf>[0];

function ex(partial: Partial<Described> & { name: string }): Described {
  return {
    muscle_group: '가슴',
    secondary_group: null,
    equipment: '바벨',
    muscle_detail: '대흉근',
    track_type: 'weight_reps' as Exercise['track_type'],
    ...partial,
  };
}

test('intro names the equipment, the target and the helper muscles', () => {
  const s = introOf(ex({ name: '벤치프레스', secondary_group: '팔', muscle_detail: '대흉근, 삼두' }));
  assert.match(s, /벤치프레스/);
  assert.match(s, /바벨로 하는/);
  assert.match(s, /대흉근, 삼두/);
  assert.match(s, /팔도 함께 쓰입니다/);
});

test('intro describes cardio and timed work by what they are, not by muscle group', () => {
  assert.match(
    introOf(ex({ name: '러닝', equipment: '맨몸', track_type: 'cardio', muscle_detail: '심폐' })),
    /유산소/
  );
  assert.match(
    introOf(ex({ name: '플랭크', equipment: '맨몸', track_type: 'duration' })),
    /버티는/
  );
});

test('intro does not repeat a secondary group that matches the primary', () => {
  const s = introOf(ex({ name: '푸시업', muscle_group: '가슴', secondary_group: '가슴' }));
  assert.doesNotMatch(s, /함께 쓰입니다/);
});

test('coaching lines match the kind of movement', () => {
  assert.match(coachTipOf(ex({ name: '바벨 스쿼트' })), /자세부터/);
  assert.match(coachTipOf(ex({ name: '러닝', track_type: 'cardio' })), /대화/);
  assert.match(coachTipOf(ex({ name: '플랭크', track_type: 'duration' })), /버티세요/);
  assert.match(coachTipOf(ex({ name: '레그 프레스', equipment: '머신' })), /패드 높이/);
  assert.match(coachTipOf(ex({ name: '크런치', muscle_group: '복근', equipment: '맨몸' })), /반동/);
  assert.match(coachTipOf(ex({ name: '덤벨 컬', equipment: '덤벨', muscle_group: '팔' })), /내릴 때/);
});

test('particles follow the final consonant of the preceding syllable', () => {
  assert.equal(withParticle('가슴', '을/를'), '가슴을');
  assert.equal(withParticle('어깨', '을/를'), '어깨를');
  assert.equal(withParticle('하체', '을/를'), '하체를');
  assert.equal(withParticle('덤벨 컬', '은/는'), '덤벨 컬은');
  assert.equal(withParticle('스쿼트', '은/는'), '스쿼트는');
});

test('intro reads naturally for a vowel-ending group', () => {
  assert.match(introOf(ex({ name: '덤벨 숄더 프레스', muscle_group: '어깨' })), /어깨를 쓰는/);
  assert.doesNotMatch(introOf(ex({ name: '덤벨 숄더 프레스', muscle_group: '어깨' })), /어깨을/);
});
