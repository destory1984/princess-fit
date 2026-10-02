/**
 * A copy of the work that belongs to you rather than to an account.
 *
 * Two apps of this kind were read through before this file existed, eight
 * hundred reviews each. In one, forty-four in every hundred were one star, and
 * the same sentence carried nearly all of them: 「폰 바꾸고 기록 다 날아갔다」,
 * 「재로그인 후 루틴 다 날아감」, 「업데이트 한 번에 3년치가」. Not one of
 * those was a person who stopped training. They were people whose training had
 * been kept in a place they had no copy of, and a sign-in went wrong.
 *
 * Refit signs in with an email and a password, which does not lose an identity
 * the way a relayed social login can. That is a reason to be less afraid, not
 * a reason to hold the only copy. A year of turning up should survive this
 * app entirely — being uninstalled, being abandoned, being wrong.
 *
 * So: one file, two formats, no service in between. CSV because a spreadsheet
 * opens it and every one of these rows is a number someone earned; JSON
 * because it keeps the shape, and a shape is what an import would need.
 */

export type BackupSet = {
  set_no: number;
  weight_kg: number;
  reps: number;
  duration_sec: number;
  distance_km: number;
  done: boolean;
  /*
    What a set was, beyond its numbers. Written only when it says something —
    a warm-up, a side, an answer about effort — so a file from before these
    were kept reads the same as one whose sets simply had none.

    Without them a restore turned every warm-up into working volume, and a
    year of left-and-right into one undivided column. The JSON keeps them; the
    CSV is a sheet for a person and stays as it was.

    Which movements were done in turn (`superset`) is not kept. It is how a
    session was arranged, not what was lifted.
  */
  warmup?: boolean;
  side?: 'L' | 'R';
  rir?: number;
};

export type BackupWorkout = {
  started_at: string;
  ended_at: string | null;
  title: string;
  condition: string | null;
  memo: string | null;
  exercises: { name: string; muscle_group: string; sets: BackupSet[] }[];
};

export const CSV_HEADER = [
  '날짜',
  '운동',
  '컨디션',
  '종목',
  '부위',
  '세트',
  '무게kg',
  '횟수',
  '시간초',
  '거리km',
  '완료',
  '메모',
  // Last, and after the memo, because it is for this app rather than for the
  // person reading the sheet: the day column is what someone scans, and the
  // full moment is what an import needs to tell two sessions on one day apart
  // and to recognise a workout it has already seen.
  '시작시각',
];

/**
 * One field, safe to put between commas.
 *
 * Everything is quoted rather than only what needs it. Deciding per field is
 * where CSV writers go wrong, and a memo is the most likely place in this app
 * to hold a comma, a quote or a line break — 「어깨 아팠음, 다음엔 40으로」 is
 * exactly the sort of thing people write and exactly what splits a row in two.
 */
export function csvField(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** The day as it is read, not as it is stored. */
function dayOf(iso: string) {
  return iso.slice(0, 10);
}

/**
 * Every set, one per line.
 *
 * A workout with no sets still gets a line. It is a day someone turned up,
 * and a backup that quietly omitted it would be disagreeing with the app's
 * own history — which is the one thing a backup must never do.
 */
export function toCsv(workouts: BackupWorkout[]) {
  const rows = [CSV_HEADER.map(csvField).join(',')];
  for (const workout of workouts) {
    const head = [dayOf(workout.started_at), workout.title, workout.condition ?? ''];
    const tail = workout.memo ?? '';
    if (workout.exercises.length === 0) {
      rows.push(
        [...head, '', '', '', '', '', '', '', '', tail, workout.started_at].map(csvField).join(',')
      );
      continue;
    }
    for (const exercise of workout.exercises) {
      if (exercise.sets.length === 0) {
        rows.push(
          [
            ...head,
            exercise.name,
            exercise.muscle_group,
            '',
            '',
            '',
            '',
            '',
            '',
            tail,
            workout.started_at,
          ]
            .map(csvField)
            .join(',')
        );
        continue;
      }
      for (const set of exercise.sets) {
        rows.push(
          [
            ...head,
            exercise.name,
            exercise.muscle_group,
            set.set_no,
            set.weight_kg,
            set.reps,
            set.duration_sec,
            set.distance_km,
            set.done ? '완료' : '',
            tail,
            workout.started_at,
          ]
            .map(csvField)
            .join(',')
        );
      }
    }
  }
  // A trailing newline: a file without one is a file some tools read short.
  return `${rows.join('\n')}\n`;
}

export function toJson(workouts: BackupWorkout[], at = new Date()) {
  return JSON.stringify(
    { app: 'refit', version: 1, exportedAt: at.toISOString(), workouts },
    null,
    2
  );
}

/** What the file is called, so a folder full of them still makes sense. */
export function fileNameFor(format: 'csv' | 'json', at = new Date()) {
  const day = `${at.getFullYear()}${String(at.getMonth() + 1).padStart(2, '0')}${String(
    at.getDate()
  ).padStart(2, '0')}`;
  return `refit-${day}.${format}`;
}

/** What to say about it afterwards, counting the things people count. */
export function backupWord(workouts: BackupWorkout[]) {
  const sets = workouts.reduce(
    (sum, w) => sum + w.exercises.reduce((n, e) => n + e.sets.length, 0),
    0
  );
  if (workouts.length === 0) return '아직 내보낼 기록이 없어요.';
  return `운동 ${workouts.length}일 · 세트 ${sets}개를 담았어요.`;
}
