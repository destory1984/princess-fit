/**
 * The girls you can raise.
 *
 * Three of them, each with a gym-clothes base drawn: the paper doll is a body,
 * and garments are layered over it, so a girl without that picture could be
 * shown in a portrait but never dressed. Everyone in this list can be.
 *
 * `playable` has to be kept in step with `BASE_ART` in `outfitArt.ts` by hand.
 * This file stays free of `require` so the tests can import it, which is the
 * whole reason the art lives over there.
 */

export type Advisor = {
  id: string;
  name: string;
  /** One line about who she is. */
  blurb: string;
  /** False until her gym-clothes base is drawn and she can be dressed. */
  playable: boolean;
};

export const ADVISORS: Advisor[] = [
  {
    id: 'geumhwa',
    name: '리나',
    blurb: '꽃을 들고 반겨요. 칭찬이 후한 편이에요.',
    playable: true,
  },
  { id: 'dohwa', name: '피아', blurb: '지친 날에도 손을 흔들어요.', playable: true },
  { id: 'seora', name: '유키', blurb: '자세부터 봐요. 대충 넘어가는 법이 없어요.', playable: true },
];

/**
 * Written, drawn in portrait, and not shipping yet.
 *
 * Kept here rather than deleted so the names and the lines are not lost and
 * their portraits keep a reason to exist. Nothing renders this list: a roster
 * of three is a roster of three, and three locked doors beside them only make
 * the choice look smaller than it is.
 */
export const UPCOMING: Omit<Advisor, 'playable'>[] = [
  { id: 'dana', name: '다나', blurb: '말수는 적지만, 빠진 날을 기억해 둬요.' },
  { id: 'munhui', name: '루미', blurb: '늘 책을 끼고 다녀요. 숫자로 이야기해요.' },
  { id: 'cheongram', name: '아이리', blurb: '틈만 나면 내기를 걸어요.' },
];

export const DEFAULT_ADVISOR_ID = ADVISORS[0].id;

