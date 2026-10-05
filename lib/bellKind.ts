/*
  Which bell ends a rest. Apart from `./bell`, which makes the sound and so
  needs a browser: this is the plain list the settings row and the tests read.
*/

export type BellKind = 'soft' | 'clear' | 'loud';

/**
 * Quietest first. 「또렷하게」 is what a new account gets: the first bell was
 * two soft notes, and in a gym, with music on and the phone on a bench, it was
 * asked to be 「좀 더 잘 들리는 걸로」.
 */
export const BELLS: { id: BellKind; label: string; detail: string }[] = [
  { id: 'soft', label: '은은하게', detail: '두 음, 조용한 곳에서' },
  { id: 'clear', label: '또렷하게', detail: '세 음을 두 번' },
  { id: 'loud', label: '크게', detail: '삑삑 소리를 세 번, 시끄러운 곳에서' },
];

export const DEFAULT_BELL: BellKind = 'clear';

export function bellOf(stored: string | null | undefined): BellKind {
  return BELLS.some((b) => b.id === stored) ? (stored as BellKind) : DEFAULT_BELL;
}

/** The one after this, round again: the settings row steps through them. */
export function nextBell(kind: BellKind): BellKind {
  const i = BELLS.findIndex((b) => b.id === kind);
  return BELLS[(i + 1) % BELLS.length].id;
}
