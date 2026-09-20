/**
 * The girls you can raise.
 *
 * A girl is playable once her gym-clothes base has been drawn: the paper doll
 * is a body, and garments are layered over it, so a girl without that picture
 * could be shown in a portrait but never dressed. The ones still waiting are
 * listed anyway — a locked door you can see through is better than a choice
 * that quietly does not exist.
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
  { id: 'dana', name: '다나', blurb: '말수는 적지만, 빠진 날을 기억해 둬요.', playable: false },
  { id: 'munhui', name: '루미', blurb: '늘 책을 끼고 다녀요. 숫자로 이야기해요.', playable: false },
  { id: 'dohwa', name: '피아', blurb: '지친 날에도 손을 흔들어요.', playable: true },
  { id: 'cheongram', name: '아이리', blurb: '틈만 나면 내기를 걸어요.', playable: false },
  { id: 'seora', name: '유키', blurb: '자세부터 봐요. 대충 넘어가는 법이 없어요.', playable: true },
];

export const DEFAULT_ADVISOR_ID = ADVISORS[0].id;

