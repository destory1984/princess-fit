/**
 * The six girls who can keep you company on the main screen.
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

const ROSTER: Advisor[] = [
  {
    id: 'geumhwa',
    name: '금화',
    title: '꽃을 든 사매',
    blurb: '무슨 날이든 꽃 한 송이를 들고 반겨요. 칭찬이 후한 편이에요.',
  },
  {
    id: 'dana',
    name: '단아',
    title: '말수 적은 사저',
    blurb: '요란하게 말하지 않지만, 빠진 날을 조용히 기억해 둬요.',
  },
  {
    id: 'munhui',
    name: '문희',
    title: '기록을 맡은 서생',
    blurb: '늘 장부를 끼고 다녀요. 숫자로 이야기하는 걸 좋아해요.',
  },
  {
    id: 'dohwa',
    name: '도화',
    title: '기운 돋우는 사매',
    blurb: '지친 날에도 손을 흔들어요. 쉬자는 말은 잘 안 해요.',
  },
  {
    id: 'cheongram',
    name: '청람',
    title: '장난기 많은 사제',
    blurb: '틈만 나면 내기를 걸어요. 기록 경신에 제일 신이 나요.',
  },
  {
    id: 'seora',
    name: '설아',
    title: '엄한 관장',
    blurb: '자세부터 봐요. 대충 넘어가는 법이 없어요.',
  },
];

export const ADVISORS: Advisor[] = ROSTER;

export const DEFAULT_ADVISOR_ID = ADVISORS[0].id;

export function advisorById(id: string | null | undefined): Advisor {
  return ADVISORS.find((a) => a.id === id) ?? ADVISORS[0];
}
