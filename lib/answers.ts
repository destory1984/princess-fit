/**
 * Telling someone the desk answered their request.
 *
 * There is no push server, so this is decided on the phone: the app remembers
 * when it last showed the requests screen and counts what the desk has
 * handled since. The answer arrives the next time the app is opened rather
 * than the moment it is written, which is the cost of not running a server
 * for a notice that is rarely urgent.
 *
 * Only a verdict or a written reply counts. 「읽음」 on its own tells the
 * person nothing they can act on, and a notice that leads to nothing is how
 * people learn to ignore notices.
 */

export type Answerable = {
  name: string;
  status: string;
  reply: string | null;
  handled_at: string | null;
};

function answered(r: Answerable) {
  return r.status === 'added' || r.status === 'declined' || !!r.reply?.trim();
}

/**
 * Answers handled after `seenAt`, newest first. With no `seenAt` every answer
 * counts: someone who has never been told has not seen any of them.
 */
export function unreadAnswers<T extends Answerable>(requests: T[], seenAt: string | null): T[] {
  const since = seenAt ? Date.parse(seenAt) : -Infinity;
  return requests
    .filter((r) => answered(r) && r.handled_at && Date.parse(r.handled_at) > since)
    .sort((a, b) => Date.parse(b.handled_at!) - Date.parse(a.handled_at!));
}

/**
 * What to remember after the requests screen has been looked at: the latest
 * handled time among them, not the phone's clock, so a phone whose clock
 * runs fast cannot hide an answer written a minute later.
 */
export function seenUpTo(requests: Answerable[], previous: string | null): string | null {
  let latest = previous ? Date.parse(previous) : -Infinity;
  for (const r of requests) {
    if (r.handled_at) latest = Math.max(latest, Date.parse(r.handled_at));
  }
  return latest === -Infinity ? previous : new Date(latest).toISOString();
}

/** One line for the home screen, or null when there is nothing to say. */
export function answerNotice(unread: Answerable[]): string | null {
  if (!unread.length) return null;
  const first = `「${unread[0].name}」`;
  return unread.length === 1
    ? `${first} 요청에 답이 왔어요`
    : `${first} 외 ${unread.length - 1}건의 요청에 답이 왔어요`;
}
