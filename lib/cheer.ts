import type { Stage } from './companion.ts';
import { voiceOf } from './voices.ts';

/**
 * What she says while you are working out.
 *
 * A screen of numbers and steppers is a spreadsheet; she is the reason it is
 * not. The line is chosen from how far through the session you are, and only
 * from that, so it never flickers between renders — the same board always
 * draws the same words.
 *
 * The words are hers (lib/voices.ts): until 2026-10-04 all three girls cheered
 * in 리나's voice, so 유키 was formal in the room and soft at the gym.
 */

export type Cheer = {
  line: string;
  done: boolean;
  /**
   * Whether she is asking for something rather than remarking on it.
   *
   * Carried on the line instead of inferred from the board, because a
   * question you cannot answer by tapping it is a question only in shape —
   * and whoever adds the next line should not have to know that the screen
   * decides tappability by counting sets somewhere else.
   */
  invites: boolean;
};

export function cheerFor(doneSets: number, totalSets: number, girl?: string, stage: Stage = 'new'): Cheer {
  // Not knowing the stage reads as the first one, as on the stats screen:
  // stiffer than it should be is a smaller mistake than familiar too soon.
  const voice = voiceOf(girl);
  const eased = stage === 'comfortable' || stage === 'old';
  const say = (eased && voice.cheerEased) || voice.cheer;

  if (totalSets === 0) {
    return { line: say.pick, done: false, invites: true };
  }
  const remark = (line: string, done = false): Cheer => ({ line, done, invites: false });

  if (doneSets === 0) return remark(say.first);
  if (doneSets >= totalSets) return remark(say.done, true);

  const left = totalSets - doneSets;
  if (left === 1) return remark(say.last);

  const through = doneSets / totalSets;
  if (through >= 0.5) return remark(say.half(left));
  return remark(say.going(left));
}
