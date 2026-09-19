/**
 * The girls who can keep you company on the main screen.
 *
 * Their portraits live in `./portraits`, kept apart so this file stays plain
 * data that tests can import without a bundler.
 */

export type Advisor = {
  id: string;
  /** What she is called. */
  name: string;
  /** Her standing at the training hall. */
  title: string;
  /** One line of flavour, shown beside her in 설정. */
  blurb: string;
};

// Only two are in play while the game around them is built. The other four
// (dana, munhui, dohwa, cheongram) keep their portraits in assets/advisors and
// their entries in git history — add them back here when the rest is ready.
const ROSTER: Advisor[] = [
  {
    id: 'geumhwa',
    name: '금화',
    title: '꽃을 든 시녀',
    blurb: '무슨 날이든 꽃 한 송이를 들고 반겨요. 칭찬이 후한 편이에요.',
  },
  {
    id: 'seora',
    name: '설아',
    title: '엄한 기사단장',
    blurb: '자세부터 봐요. 대충 넘어가는 법이 없어요.',
  },
];

export const ADVISORS: Advisor[] = ROSTER;

export const DEFAULT_ADVISOR_ID = ADVISORS[0].id;

export function advisorById(id: string | null | undefined): Advisor {
  return ADVISORS.find((a) => a.id === id) ?? ADVISORS[0];
}
