import assert from 'node:assert/strict';
import test from 'node:test';
import { toCsv, toJson, type BackupWorkout } from './backup.ts';
import { csvRows, read, readCsv, restoreWord, unseen } from './restore.ts';

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

test('the CSV comes back as the same workouts it went out as', () => {
  const original = [
    workout(),
    workout({ started_at: '2026-09-18T09:00:00', title: '하체 날', memo: null }),
  ];
  const { workouts, skipped } = read(toCsv(original));
  assert.equal(skipped, 0);
  // Everything the CSV holds survives. The end time is not in the file, so it
  // comes back empty rather than guessed at.
  assert.deepEqual(
    workouts,
    original.map((w) => ({ ...w, ended_at: null }))
  );
});

test('a memo with a comma, a quote and a line break survives the round trip', () => {
  const memo = '어깨 아팠음, 다음엔 40으로\n"가볍게"';
  const { workouts } = read(toCsv([workout({ memo })]));
  assert.equal(workouts[0].memo, memo);
});

test('a day someone turned up for with nothing under it is still a day', () => {
  const { workouts } = read(toCsv([workout({ exercises: [] })]));
  assert.equal(workouts.length, 1);
  assert.deepEqual(workouts[0].exercises, []);
});

test('an exercise with no sets keeps its place instead of vanishing', () => {
  const { workouts } = read(
    toCsv([workout({ exercises: [{ name: '데드리프트', muscle_group: '등', sets: [] }] })])
  );
  assert.deepEqual(workouts[0].exercises, [{ name: '데드리프트', muscle_group: '등', sets: [] }]);
});

test('columns are read by name, so a tidied sheet still imports', () => {
  // Columns reordered, one added, and a number retyped the way a sheet writes
  // it. None of that is a reason to lose the afternoon.
  const csv =
    '"메모","횟수","무게kg","종목","날짜","내 메모칸","부위","시간초","거리km","완료","세트"\n' +
    '"","8","1,200","레그프레스","2026-09-20","내 생각","하체","0","0","완료","1"\n';
  const { workouts, skipped } = readCsv(csv);
  assert.equal(skipped, 0);
  assert.deepEqual(workouts[0].exercises[0].sets, [
    { set_no: 1, weight_kg: 1200, reps: 8, duration_sec: 0, distance_km: 0, done: true },
  ]);
});

test('an unreadable number drops the set rather than calling it zero', () => {
  const csv =
    '"날짜","종목","부위","세트","무게kg","횟수","시간초","거리km","완료"\n' +
    '"2026-09-20","벤치프레스","가슴","1","60","8","0","0","완료"\n' +
    '"2026-09-20","벤치프레스","가슴","2","모르겠음","7","0","0","완료"\n';
  const { workouts, skipped } = readCsv(csv);
  assert.equal(skipped, 1);
  assert.equal(workouts[0].exercises[0].sets.length, 1);
});

test('a CSV row with no readable day is dropped, not given today', () => {
  const csv =
    '"날짜","종목","부위","세트","무게kg","횟수","시간초","거리km"\n' +
    '"언젠가","벤치프레스","가슴","1","60","8","0","0"\n';
  const { workouts, skipped } = readCsv(csv);
  assert.deepEqual(workouts, []);
  assert.equal(skipped, 1);
});

test('two sessions on one day stay two, even with only the date to go on', () => {
  const csv =
    '"날짜","운동","종목","부위","세트","무게kg","횟수","시간초","거리km"\n' +
    '"2026-09-20","아침","벤치프레스","가슴","1","60","8","0","0"\n' +
    '"2026-09-20","저녁","스쿼트","하체","1","80","5","0","0"\n';
  const { workouts } = readCsv(csv);
  assert.equal(workouts.length, 2);
  // The clock time is invented — the file never held one — but the two
  // sessions stay apart, and in the order they were written.
  assert.deepEqual(
    workouts.map((w) => w.title),
    ['아침', '저녁']
  );
  assert.notEqual(workouts[0].started_at, workouts[1].started_at);
});

/** Two sets of the same exercise, so row order has something to disturb. */
function twoSets(): BackupWorkout {
  return workout({
    exercises: [
      {
        name: '벤치프레스',
        muscle_group: '가슴',
        sets: [
          { set_no: 1, weight_kg: 60, reps: 8, duration_sec: 0, distance_km: 0, done: true },
          { set_no: 2, weight_kg: 60, reps: 7, duration_sec: 0, distance_km: 0, done: true },
        ],
      },
    ],
  });
}

test('rows of one workout stay together however far apart they sit', () => {
  const lines = toCsv([twoSets()]).trim().split('\n');
  const shuffled = [lines[0], lines[2], lines[1]].join('\n');
  const { workouts } = readCsv(shuffled);
  assert.equal(workouts.length, 1);
  assert.equal(workouts[0].exercises[0].sets.length, 2);
});

test('a CSV written by a Windows spreadsheet is still ours', () => {
  const csv = `\ufeff${toCsv([twoSets()]).replace(/\n/g, '\r\n')}`;
  const { workouts, skipped } = read(csv);
  assert.equal(skipped, 0);
  assert.equal(workouts.length, 1);
  assert.equal(workouts[0].exercises[0].sets.length, 2);
});

test('a quoted field holding a comma and a newline is one field', () => {
  const rows = csvRows('"a","b,c","d\ne"\n"f","g",""\n');
  assert.deepEqual(rows, [
    ['a', 'b,c', 'd\ne'],
    ['f', 'g', ''],
  ]);
});

test('importing the same CSV twice adds nothing the second time', () => {
  const mine = [workout()];
  const first = read(toCsv(mine)).workouts;
  const second = read(toCsv(mine)).workouts;
  assert.equal(
    unseen(
      second,
      first.map((w) => w.started_at)
    ).length,
    0
  );
});

const sets = (list: BackupWorkout['exercises'][number]['sets']) =>
  workout({ exercises: [{ name: '덤벨 컬', muscle_group: '팔', sets: list }] });
const base = { weight_kg: 20, reps: 8, duration_sec: 0, distance_km: 0, done: true };

// A warm-up restored as a working set is counted in every sum it was kept out
// of. This is the round trip that keeps it a warm-up.
test('a warm-up, a side and an effort answer survive the round trip', () => {
  const original = [
    sets([
      { set_no: 1, ...base, weight_kg: 10, warmup: true },
      { set_no: 2, ...base, side: 'L', rir: 2 },
      { set_no: 3, ...base, side: 'R', rir: 0 },
    ]),
  ];
  assert.deepEqual(read(toJson(original)).workouts, original);
});

test('a set that was none of those is written without them', () => {
  const [w] = JSON.parse(toJson([sets([{ set_no: 1, ...base }])])).workouts;
  assert.deepEqual(Object.keys(w.exercises[0].sets[0]).sort(), [
    'distance_km', 'done', 'duration_sec', 'reps', 'set_no', 'weight_kg',
  ]);
});

test('a file from before these were kept reads as it always did', () => {
  const old = JSON.stringify({
    workouts: [{ started_at: '2026-01-05T10:00:00', exercises: [{ name: '덤벨 컬', sets: [{ set_no: 1, ...base }] }] }],
  });
  const [w] = read(old).workouts;
  assert.deepEqual(w.exercises[0].sets[0], { set_no: 1, ...base });
});

test('anything that is not exactly a mark is left off, not guessed', () => {
  const odd = JSON.stringify({
    workouts: [
      {
        started_at: '2026-01-05T10:00:00',
        exercises: [
          {
            name: '덤벨 컬',
            sets: [{ set_no: 1, ...base, warmup: 'yes', side: 'left', rir: 2.5 }, { set_no: 2, ...base, rir: -1 }],
          },
        ],
      },
    ],
  });
  for (const set of read(odd).workouts[0].exercises[0].sets) {
    assert.equal('warmup' in set, false);
    assert.equal('side' in set, false);
    assert.equal('rir' in set, false);
  }
});
