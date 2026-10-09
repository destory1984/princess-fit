import { localDayKey } from './format.ts';

/**
 * A word from the maker when work on the app stops for a while.
 *
 * Carries its own last day so it takes itself down: nobody is working on the
 * app while it shows, so nobody would be there to remove it.
 */
export const PAUSE = {
  /** The last day it shows, YYYY-MM-DD. */
  until: '2026-10-31',
  text: '요즘 게임 만드느라 바빠서 & 다니던 헬스장이 리모델링 중이라서 10월 말까지 개발을 멈춥니다.',
};

export function pauseNotice(today: Date): string | null {
  return localDayKey(today) <= PAUSE.until ? PAUSE.text : null;
}
