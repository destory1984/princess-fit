import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coachTipOf, introOf, tipKindOf, withParticle } from './exerciseCopy.ts';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { VOICES } from './voices.ts';
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
  const kind = (p: Partial<Described> & { name: string }) => tipKindOf(ex(p));
  assert.equal(kind({ name: '바벨 스쿼트' }), 'compound');
  assert.equal(kind({ name: '러닝', track_type: 'cardio' }), 'cardio');
  assert.equal(kind({ name: '버피', muscle_group: '유산소', equipment: '맨몸' }), 'cardio');
  assert.equal(kind({ name: '플랭크', track_type: 'duration' }), 'hold');
  assert.equal(kind({ name: '레그 프레스', equipment: '머신' }), 'machine');
  assert.equal(kind({ name: '크런치', muscle_group: '복근', equipment: '맨몸' }), 'abs');
  assert.equal(kind({ name: '덤벨 컬', equipment: '덤벨', muscle_group: '팔' }), 'arm');
  assert.equal(kind({ name: '덤벨 프레스', equipment: '덤벨' }), 'press');
  assert.equal(kind({ name: '원암 덤벨 로우', equipment: '덤벨', muscle_group: '등' }), 'pull');
  assert.equal(kind({ name: '사이드 레터럴 레이즈', equipment: '덤벨', muscle_group: '어깨' }), 'raise');
  assert.equal(kind({ name: '런지', equipment: '덤벨', muscle_group: '하체' }), 'leg');
  assert.equal(kind({ name: '힙 쓰러스트', muscle_group: '하체' }), 'hip');
});

test('advice for a bar is not given where there is no bar', () => {
  // 「빈 봉으로 자세부터」 was said of the bodyweight squat, and 「내릴 때를 더 천천히」 of the box jump.
  for (const g of ['geumhwa', 'dohwa', 'seora']) {
    for (const turn of [0, 1]) {
      const squat = ex({ name: '맨몸 스쿼트', muscle_group: '하체', equipment: '맨몸' });
      assert.doesNotMatch(coachTipOf(squat, g, turn), /빈 봉/);
      const pullUp = ex({ name: '풀업', muscle_group: '등', equipment: '맨몸' });
      assert.doesNotMatch(coachTipOf(pullUp, g, turn), /빈 봉/);
      const jump = ex({ name: '박스 점프', muscle_group: '하체', equipment: '기타' });
      assert.doesNotMatch(coachTipOf(jump, g, turn), /내릴 때/);
    }
  }
});

test('no one line is what she says about half the catalog', () => {
  // 74 of 159 once heard the same sentence.
  for (const g of ['geumhwa', 'dohwa', 'seora']) {
    const heard = new Map<string, number>();
    for (const e of DEFAULT_EXERCISES) {
      const line = coachTipOf(e, g);
      heard.set(line, (heard.get(line) ?? 0) + 1);
    }
    assert.ok(Math.max(...heard.values()) <= 20, `${g}: ${Math.max(...heard.values())}`);
    assert.ok(heard.size >= 20, `${g}: ${heard.size} lines`);
  }
  assert.deepEqual(DEFAULT_EXERCISES.filter((e) => tipKindOf(e) === 'other').map((e) => e.name), []);
});

test('she does not open the same exercise on the same sentence every day', () => {
  const curl = ex({ name: '덤벨 컬', equipment: '덤벨', muscle_group: '팔' });
  for (const g of ['geumhwa', 'dohwa', 'seora']) {
    assert.notEqual(coachTipOf(curl, g, 0), coachTipOf(curl, g, 1));
    assert.equal(coachTipOf(curl, g, 0), coachTipOf(curl, g, 2));
  }
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

test('the tip is in the voice of whoever is beside you', () => {
  const squat = ex({ name: '바벨 스쿼트' });
  const turn = [0, 1].find((t) => /빈 봉/.test(coachTipOf(squat, 'geumhwa', t)))!;
  const said = ['geumhwa', 'dohwa', 'seora'].map((g) => coachTipOf(squat, g, turn));
  assert.equal(new Set(said).size, 3);
  // The same advice from all three; only the way of saying it differs.
  for (const line of said) assert.match(line, /빈 봉으로 자세부터/);
  assert.match(said[0], /요\.$/);
  assert.match(said[1], /!$/);
  assert.match(said[2], /십시오\.$/);
  // Every line she has, of every kind, in her own way of ending a sentence.
  for (const kind of Object.keys(VOICES.geumhwa.tip) as (keyof typeof VOICES.geumhwa.tip)[]) {
    assert.equal(VOICES.dohwa.tip[kind].length, VOICES.geumhwa.tip[kind].length, kind);
    assert.equal(VOICES.seora.tip[kind].length, VOICES.geumhwa.tip[kind].length, kind);
    for (const line of VOICES.geumhwa.tip[kind]) assert.match(line, /요\.$/, line);
    for (const line of VOICES.dohwa.tip[kind]) assert.match(line, /!$/, line);
    for (const line of VOICES.seora.tip[kind]) assert.match(line, /(십시오|니다)\.$/, line);
  }
});
