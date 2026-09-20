/**
 * Reading a backup back in.
 *
 * The export exists because an account can go wrong. That promise is only half
 * kept while the file is something a person can read and nothing can put back
 * — a year of training in a spreadsheet nobody can return to the app is a
 * consolation prize, not a recovery.
 *
 * Two rules shape everything here.
 *
 * The first is that a file off a disk is not to be trusted. It has been edited
 * in a spreadsheet, truncated by a mail client, written by a version of this
 * app that no longer exists, or is simply the wrong file. Every field is
 * checked and anything unreadable is dropped rather than imported as a zero —
 * a set that says 「무게 없음」 is a lie about an afternoon, and the person
 * reading their own history later has no way to know it was invented here.
 *
 * The second is that importing twice must not double anything. People import
 * when they are frightened, and frightened people press buttons more than
 * once. A workout is recognised by the moment it started, which is the one
 * thing about it that was never chosen and never repeats.
 */

import type { BackupSet, BackupWorkout } from './backup.ts';

/** What a file turned out to hold, including what could not be read. */
export type Reading = {
  workouts: BackupWorkout[];
  /** Entries dropped as unreadable, for saying so rather than hiding it. */
  skipped: number;
};

function num(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function readSet(raw: unknown, index: number): BackupSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const reps = num(r.reps, -1);
  const weight = num(r.weight_kg, -1);
  const seconds = num(r.duration_sec, -1);
  const distance = num(r.distance_km, -1);
  // Every number must be readable and not negative. A missing one is not a
  // zero: 0kg × 0회 is a claim about what happened, and a wrong one.
  if (reps < 0 || weight < 0 || seconds < 0 || distance < 0) return null;
  return {
    set_no: num(r.set_no, index + 1),
    weight_kg: weight,
    reps,
    duration_sec: seconds,
    distance_km: distance,
    done: r.done === true,
  };
}

/**
 * A workout is only as good as the moment it started.
 *
 * Without a readable `started_at` there is nothing to put it in order by,
 * nothing to show on a calendar and nothing to recognise it by on a second
 * import — so it is dropped rather than given today's date, which would move
 * someone's training to a day they did not train.
 */
function readWorkout(raw: unknown): BackupWorkout | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const started = text(r.started_at);
  if (!started || Number.isNaN(Date.parse(started))) return null;

  const exercises = Array.isArray(r.exercises) ? r.exercises : [];
  return {
    started_at: started,
    ended_at: text(r.ended_at),
    title: text(r.title) ?? '가져온 운동',
    condition: text(r.condition),
    memo: text(r.memo),
    exercises: exercises
      .map((e) => {
        if (!e || typeof e !== 'object') return null;
        const entry = e as Record<string, unknown>;
        const name = text(entry.name);
        if (!name) return null;
        const sets = Array.isArray(entry.sets) ? entry.sets : [];
        return {
          name,
          muscle_group: text(entry.muscle_group) ?? '기타',
          sets: sets.map(readSet).filter((s): s is BackupSet => s !== null),
        };
      })
      .filter((e): e is BackupWorkout['exercises'][number] => e !== null),
  };
}

/**
 * What is in this file, as far as it can be believed.
 *
 * Throws only when the file is not a Refit backup at all. A file with some
 * bad rows in it is still worth importing — the good ones are somebody's
 * training — and the count of what was dropped is returned so it can be said
 * out loud instead of quietly swallowed.
 */
export function read(raw: string): Reading {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('이 파일은 리핏이 만든 파일이 아닌 것 같아요.');
  }
  const body = parsed as Record<string, unknown> | null;
  const list = body && Array.isArray(body.workouts) ? body.workouts : null;
  if (!list) {
    throw new Error('운동 기록이 들어 있지 않아요. 내보내기로 받은 .json 파일을 골라 주세요.');
  }

  const workouts: BackupWorkout[] = [];
  let skipped = 0;
  for (const entry of list) {
    const workout = readWorkout(entry);
    if (workout) workouts.push(workout);
    else skipped += 1;
  }
  return { workouts, skipped };
}

/**
 * The ones not already here.
 *
 * Matched on the start time alone. The title can be edited and the sets can be
 * added to afterwards, but the moment a session began is not something anyone
 * chose, so it is the one field that identifies it without lying.
 */
export function unseen(workouts: BackupWorkout[], existing: string[]): BackupWorkout[] {
  const here = new Set(existing);
  return workouts.filter((w) => !here.has(w.started_at));
}

/** What she says afterwards, counting what happened and what did not. */
export function restoreWord(added: number, already: number, skipped: number) {
  if (added === 0 && already > 0) return '이미 다 들어와 있어요. 새로 넣은 건 없어요.';
  if (added === 0) return '넣을 수 있는 기록을 찾지 못했어요.';
  const parts = [`운동 ${added}일을 넣었어요`];
  if (already > 0) parts.push(`이미 있던 ${already}일은 그대로 뒀어요`);
  if (skipped > 0) parts.push(`읽지 못한 ${skipped}개는 건너뛰었어요`);
  return `${parts.join(' · ')}.`;
}
