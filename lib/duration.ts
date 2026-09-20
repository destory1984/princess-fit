/**
 * How long today's board will take.
 *
 * Asked for by name in a review of the app this one is measured against —
 * 「운동 예상 시간, 왜 사라졌나요???」 — which is the most useful kind of
 * request, because it is somebody noticing the absence of something they had
 * stopped thinking about. The question behind it is never really about
 * minutes. It is 「이거 오늘 안에 끝나나」, asked in a doorway with a coat on.
 *
 * The estimate is deliberately rough and deliberately honest about it. Rest is
 * the only part anyone has actually configured, so it carries the weight; the
 * set itself is a flat guess, because a set of five heavy squats and a set of
 * fifteen curls take about the same minute once the bar is loaded, and
 * pretending otherwise would be precision nobody asked for and nobody can
 * check.
 *
 * What it must never do is count a set twice. A board half done should say how
 * much is *left* — an estimate that keeps announcing the original total is an
 * estimate that stops being read by the third set.
 */

/** A working set, less the rest after it: getting in, doing it, writing it down. */
export const SECONDS_PER_SET = 45;

/** What a set of a timed movement is worth when nobody has said. */
export const SECONDS_PER_CARDIO_SET = 600;

export type PlannedSet = {
  done: boolean;
  duration_sec: number;
  exercise_id: string;
};

/**
 * Seconds still to go, given what is on the board and how long each movement
 * rests for.
 *
 * The last set of the session has no rest after it, and neither does any set
 * already done — so rest is counted once per set still ahead, minus one. It is
 * a small difference on a long board and a silly one on a short board, where
 * 「3분」 against 「1분」 is the difference between believing the number and not.
 */
export function remainingSeconds(
  sets: PlannedSet[],
  restOf: (exerciseId: string) => number
): number {
  const ahead = sets.filter((s) => !s.done);
  if (ahead.length === 0) return 0;

  let seconds = 0;
  for (const set of ahead) {
    // A cardio set carries its own planned length when one was entered; a
    // weight set is the flat guess, because the reps do not really change it.
    seconds += set.duration_sec > 0 ? set.duration_sec : SECONDS_PER_SET;
  }
  for (const set of ahead.slice(0, -1)) {
    seconds += restOf(set.exercise_id);
  }
  return seconds;
}

/**
 * Rounded to something a person would say out loud.
 *
 * Never a number of seconds, and never 「37분」 either — the estimate is not
 * good to the minute and a figure that looks precise invites being held to it.
 * Under five minutes it stops guessing and says so, because at that point the
 * answer to 「얼마나 남았어요」 is 「거의 다 하셨어요」.
 */
export function remainingWord(seconds: number): string | null {
  if (seconds <= 0) return null;
  // Measured against the seconds rather than the rounded minutes, so the
  // boundary is where it reads — 4분 40초 is not five minutes to anyone.
  if (seconds < 5 * 60) return '거의 다 하셨어요';
  const minutes = Math.round(seconds / 60);
  const rounded = minutes < 60 ? Math.round(minutes / 5) * 5 : Math.round(minutes / 10) * 10;
  if (rounded < 60) return `${rounded}분쯤 남았어요`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours}시간쯤 남았어요` : `${hours}시간 ${rest}분쯤 남았어요`;
}
