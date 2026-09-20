import assert from 'node:assert/strict';
import test from 'node:test';
import { toJson, type BackupWorkout } from './backup.ts';
import { read, restoreWord, unseen } from './restore.ts';

function workout(over: Partial<BackupWorkout> = {}): BackupWorkout {
  return {
    started_at: '2026-09-20T10:00:00',
    ended_at: '2026-09-20T11:00:00',
    title: '상체 날',
    condition: 'normal',
    memo: '어깨 아팠음, 다음엔 40으로',
    exercises: [
      {
        name: '벤치프레스',
        muscle_group: '가슴',
        sets: [
          { set_no: 1, weight_kg: 60, reps: 8, duration_sec: 0, distance_km: 0, done: true },
        ],
      },
    ],
    ...over,
  };
}

test('what the export writes, the import reads back unchanged', () => {
  const original = [workout(), workout({ started_at: '2026-09-18T09:00:00' })];
  const { workouts, skipped } = read(toJson(original));
  assert.equal(skipped, 0);
  assert.deepEqual(workouts, original);
});

test('a file that is not ours is refused, not half-imported', () => {
  assert.throws(() => read('this is not json'), /리핏이 만든 파일/);
  assert.throws(() => read('{"hello":true}'), /운동 기록이 들어 있지 않아요/);
  assert.throws(() => read('[]'), /운동 기록이 들어 있지 않아요/);
});

test('an empty but valid backup is not an error', () => {
  assert.deepEqual(read('{"workouts":[]}'), { workouts: [], skipped: 0 });
});

test('a workout with no readable start is dropped, not given today', () => {
  const { workouts, skipped } = read(
    JSON.stringify({ workouts: [{ title: '언제였더라' }, { started_at: 'nonsense' }, workout()] })
  );
  assert.equal(workouts.length, 1);
  assert.equal(skipped, 2);
  assert.equal(workouts[0].started_at, '2026-09-20T10:00:00');
});

test('a set missing a number is dropped rather than imported as a zero', () => {
  // 0kg × 0회 is a claim about an afternoon, and a false one.
  const { workouts } = read(
    JSON.stringify({
      workouts: [
        {
          started_at: '2026-09-20T10:00:00',
          exercises: [
            {
              name: '스쿼트',
              sets: [
                { set_no: 1, reps: 5, weight_kg: 100, duration_sec: 0, distance_km: 0 },
                { set_no: 2, reps: 5 },
                { set_no: 3, reps: -1, weight_kg: 60, duration_sec: 0, distance_km: 0 },
              ],
            },
          ],
        },
      ],
    })
  );
  assert.equal(workouts[0].exercises[0].sets.length, 1);
  assert.equal(workouts[0].exercises[0].sets[0].weight_kg, 100);
});

test('a nameless exercise is dropped; a missing group is not fatal', () => {
  const { workouts } = read(
    JSON.stringify({
      workouts: [
        {
          started_at: '2026-09-20T10:00:00',
          exercises: [{ sets: [] }, { name: '풀업', sets: [] }],
        },
      ],
    })
  );
  assert.equal(workouts[0].exercises.length, 1);
  assert.equal(workouts[0].exercises[0].muscle_group, '기타');
});

test('a workout with no title gets a plain one rather than being lost', () => {
  const { workouts } = read(JSON.stringify({ workouts: [{ started_at: '2026-09-20T10:00:00' }] }));
  assert.equal(workouts[0].title, '가져온 운동');
  assert.deepEqual(workouts[0].exercises, []);
});

test('importing the same file twice adds nothing the second time', () => {
  const mine = [workout(), workout({ started_at: '2026-09-18T09:00:00' })];
  assert.equal(unseen(mine, []).length, 2);
  assert.equal(unseen(mine, mine.map((w) => w.started_at)).length, 0);
  assert.deepEqual(
    unseen(mine, ['2026-09-20T10:00:00']).map((w) => w.started_at),
    ['2026-09-18T09:00:00']
  );
});

test('she says what happened, including what did not', () => {
  assert.match(restoreWord(3, 0, 0), /3일을 넣었어요/);
  assert.match(restoreWord(3, 2, 1), /이미 있던 2일/);
  assert.match(restoreWord(3, 2, 1), /읽지 못한 1개/);
  assert.match(restoreWord(0, 5, 0), /이미 다 들어와 있어요/);
  assert.match(restoreWord(0, 0, 0), /찾지 못했어요/);
});
