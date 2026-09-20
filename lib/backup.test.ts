import assert from 'node:assert/strict';
import test from 'node:test';
import {
  backupWord,
  csvField,
  CSV_HEADER,
  fileNameFor,
  toCsv,
  toJson,
  type BackupWorkout,
} from './backup.ts';

function workout(over: Partial<BackupWorkout> = {}): BackupWorkout {
  return {
    started_at: '2026-09-20T10:00:00',
    ended_at: '2026-09-20T11:00:00',
    title: '상체 날',
    condition: 'normal',
    memo: null,
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
    ...over,
  };
}

test('a memo with a comma does not split the row in two', () => {
  const csv = toCsv([workout({ memo: '어깨 아팠음, 다음엔 40으로' })]);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 3); // header and two sets
  assert.ok(lines[1].includes('"어깨 아팠음, 다음엔 40으로"'));
});

test('a quote inside a field is doubled, which is what CSV means by escaping', () => {
  assert.equal(csvField('그는 "무리하지 마" 라고'), '"그는 ""무리하지 마"" 라고"');
  assert.equal(csvField(null), '""');
  assert.equal(csvField(0), '"0"');
});

test('a line break in a memo stays inside its own field', () => {
  const csv = toCsv([workout({ memo: '첫째 줄\n둘째 줄' })]);
  // The row count is what a naive writer gets wrong: splitting on newline
  // would make this look like an extra record rather than one memo.
  assert.equal(csv.split('"첫째 줄\n둘째 줄"').length - 1, 2);
});

test('every set is a line, under one header', () => {
  const csv = toCsv([workout()]);
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], CSV_HEADER.map(csvField).join(','));
  assert.equal(lines.length, 3);
  assert.ok(lines[1].includes('"벤치프레스"'));
  assert.ok(lines[1].includes('"60"'));
});

test('a day with nothing on it is still a day you turned up', () => {
  const csv = toCsv([workout({ exercises: [] })]);
  assert.equal(csv.trim().split('\n').length, 2);
  assert.ok(csv.includes('"상체 날"'));
});

test('an exercise on the board with no sets logged is kept too', () => {
  const csv = toCsv([
    workout({ exercises: [{ name: '풀업', muscle_group: '등', sets: [] }] }),
  ]);
  assert.ok(csv.includes('"풀업"'));
});

test('the file ends with a newline, or some tools read it short', () => {
  assert.ok(toCsv([workout()]).endsWith('\n'));
  assert.ok(toCsv([]).endsWith('\n'));
});

test('nothing to export is a header and no rows, not a broken file', () => {
  assert.equal(toCsv([]).trim(), CSV_HEADER.map(csvField).join(','));
});

test('the json keeps the shape, and says what made it', () => {
  const parsed = JSON.parse(toJson([workout()], new Date('2026-09-20T12:00:00Z')));
  assert.equal(parsed.app, 'refit');
  assert.equal(parsed.version, 1);
  assert.equal(parsed.exportedAt, '2026-09-20T12:00:00.000Z');
  assert.deepEqual(parsed.workouts, [workout()]);
});

test('the file is named so a folder of them still sorts', () => {
  assert.equal(fileNameFor('csv', new Date(2026, 8, 5)), 'refit-20260905.csv');
  assert.equal(fileNameFor('json', new Date(2026, 11, 31)), 'refit-20261231.json');
});

test('she counts the things people count', () => {
  assert.match(backupWord([workout()]), /1일/);
  assert.match(backupWord([workout()]), /2개/);
  assert.match(backupWord([]), /없어요/);
});
