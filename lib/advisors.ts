/**
 * The girls you can raise.
 *
 * Only 리나 is playable: the paper doll is her body, drawn in gym clothes so
 * garments can be layered over it, and each of the others would need the same
 * base before she could be dressed. Their portraits exist, so they are shown
 * rather than hidden — a locked door you can see through is better than a
 * choice that quietly does not exist.
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
  { id: 'dohwa', name: '피아', blurb: '지친 날에도 손을 흔들어요.', playable: false },
  { id: 'cheongram', name: '아이리', blurb: '틈만 나면 내기를 걸어요.', playable: false },
  { id: 'seora', name: '유키', blurb: '자세부터 봐요. 대충 넘어가는 법이 없어요.', playable: false },
];

export const DEFAULT_ADVISOR_ID = ADVISORS[0].id;

export function advisorById(id: string | null | undefined): Advisor {
  return ADVISORS.find((a) => a.id === id) ?? ADVISORS[0];
}
