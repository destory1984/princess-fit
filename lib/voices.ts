import { withParticle } from './korean.ts';
import type { OnceKind, Stage } from './companion.ts';
import type { GiftKind, Mood } from './economy.ts';

/**
 * How each girl talks. Everything she says lives here, one voice per girl, so
 * that writing more lines is writing in one place — docs/companion.md says
 * this is a feature that is never finished, only added to.
 *
 * The three are told apart by more than their words:
 *
 * - 리나 looks after the body: sleep, soreness, rest. Soft, and she hints at
 *   what she needs rather than asking.
 * - 피아 chases the numbers: the best lift, the streak, this week against
 *   last. Loud, and she makes a joke of going hungry.
 * - 유키 minds the gaps: the part left alone, the goal falling short. She
 *   starts in 합쇼체 and thaws into 해요체 only once you are comfortable with
 *   each other; her praise is rare and short.
 *
 * What each one notices is in lib/notice.ts. None of them claims to have seen
 * anything the app did not record — nothing here can watch your form.
 *
 * Every voice has every line. A girl who falls silent on one occasion because
 * nobody wrote hers is a girl who has stopped existing for that moment.
 */

export type VoiceId = 'geumhwa' | 'dohwa' | 'seora';

type MoodLines = Record<Mood, string[]>;
type AboutYou = Pick<MoodLines, 'happy' | 'fine' | 'lonely'>;

export type Voice = {
  /** Hunger and rags are about her; she says them the same way at every stage. */
  mood: Pick<MoodLines, 'hungry' | 'shabby'> & { byStage: Record<Stage, AboutYou> };
  thanks: Record<GiftKind, string[]>;
  lesson: {
    starts: (name: string) => string;
    lastDay: (name: string) => string;
    twoLeft: (name: string) => string;
  };
  /** Said on the day it happens. `d` is the memory's detail. */
  fresh: Record<OnceKind, (d: string) => string>;
  /** Said when an old one comes back. Only the ones with something in them. */
  recall: Partial<Record<OnceKind, (when: string, d: string) => string>>;
  /** Something you gave her: on the day, and when it comes back to her. */
  gift: { fresh: (name: string) => string; recall: (when: string, name: string) => string };
  /** Who she is, told to the model so its answer comes back in her voice. */
  persona: string;
  /** The rules' read of one workout (lib/advice.ts). Praise, then one remark. */
  advice: {
    empty: string;
    streak: (days: number) => string;
    today: string;
    firstTime: (what: string) => string;
    heavy: string;
    short: string;
    untouched: (groups: string) => string;
    cardio: string;
    steady: string;
  };
  /** The rules' read of the body readings (lib/bodyAdvice.ts). */
  body: {
    first: string;
    stale: (days: number) => string;
    sparse: string;
    muscleUp: string;
    bothDown: string;
    fatDown: string;
    heavier: string;
    steady: string;
  };
  /** Findings on the history and stats screens (lib/insight.ts): [title, detail]. */
  insight: {
    streak: (days: number) => [string, string];
    moreOften: (more: number, month: number, before: number) => [string, string];
    balanced: (groups: number) => [string, string];
    neglected: (named: string, rest: number) => [string, string];
    lopsided: (group: string, percent: number) => [string, string];
    cardio: (minutes: number) => [string, string];
    sparse: (days: number) => [string, string];
  };
};

const rina: Voice = {
  mood: {
    hungry: ['오늘 저녁은 뭘까, 그 생각만 했어요.', '자꾸 부엌 쪽을 보게 되네요.'],
    shabby: ['소매가 좀 해졌죠? 아직은 괜찮아요.', '오늘따라 거울을 오래 보게 되네요.'],
    byStage: {
      new: {
        happy: ['오늘도 와 주셨네요. 몸은 좀 어떠세요?', '얼굴이 좋아 보여요. 어젯밤 잘 주무셨나 봐요.'],
        fine: ['오늘은 무리하지 말고 해요.', '기다리고 있었어요. 물 먼저 한 잔 드세요.'],
        lonely: ['오늘은 오시려나 했어요. 아프신 건 아니죠?', '며칠 안 보이셔서요. 쉬신 거면 잘하신 거예요.'],
      },
      familiar: {
        happy: ['어제 하신 데는 좀 괜찮으세요?', '요즘 꾸준하시네요. 그래도 잠은 꼭 챙기세요.'],
        fine: ['스트레칭 먼저 하고 해요. 저도 같이 할게요.', '물은 챙기셨어요?'],
        lonely: ['며칠 안 보이셔서 걱정했어요.', '바쁘셨죠? 끼니는 거르지 않으셨어요?'],
      },
      comfortable: {
        happy: ['또 오셨네요. 대신 오늘은 일찍 주무시기로 약속해요.', '오늘은 표정이 좋으시네요. 푹 쉬고 오셨나 봐요.'],
        fine: ['끝나면 꼭 스트레칭해요. 내일의 몸이 고마워할 거예요.', '힘들면 한 세트 덜 해도 돼요. 제가 비밀로 할게요.'],
        lonely: ['어디 다녀오셨어요? 저 혼자 방 청소 다 했어요.', '오늘은 오실 줄 알았어요. 반쯤은요.'],
      },
      old: {
        happy: ['왔어요? 오늘도 다치지 말고 해요.', '이제 오시는 게 당연한 것 같아요.'],
        fine: ['오늘은 가볍게 가요, 세게 가요? 몸한테 물어보고요.', '늘 하던 대로 하면 돼요. 무리만 말고요.'],
        lonely: ['바빴나 봐요. 괜찮아요, 기다리는 건 익숙해요.', '오랜만이에요. 첫날은 살살 해요.'],
      },
    },
  },
  // Buying something for her and getting silence back makes the shop feel
  // like a vending machine. Pleased, never gushing.
  thanks: {
    food: ['잘 먹었어요. 한동안은 괜찮을 것 같아요.', '이런 건 아껴 먹어야 하는데 말이죠.'],
    clothes: ['어때요? 이상하지 않죠?', '거울 앞에 좀 오래 서 있었어요.'],
    accessory: ['작은 게 더 티가 나는 법이에요.', '오늘은 이걸 하고 있을게요.'],
    furniture: ['방이 좀 달라 보여요.', '여기 있으니 딱 맞네요.'],
    // She is signing up, not coming home: the gains land when the course ends.
    lesson: ['잘 배우고 올게요.', '내일 아침부터 부지런히 다녀올게요.'],
  },
  lesson: {
    starts: (n) => `오늘부터 ${n} 배우러 다녀요.`,
    // 「예의범절은 오늘이 마지막」 reads as if manners themselves end today.
    lastDay: (n) => `${n} 수업은 오늘이 마지막이에요. 조금 아쉬워요.`,
    // Said as something she is doing, not as a bare noun with a number after
    // it. 「예의범절, 이제 이틀 남았어요」 is a calendar entry.
    twoLeft: (n) => `${n} 배우는 중이에요. 이제 이틀 남았어요.`,
  },
  fresh: {
    first_day: () => '오늘 처음 뵈었네요. 앞으로 잘 부탁드려요.',
    three_in_a_row: () => '사흘 연속이에요. 대단해요. 오늘 밤엔 꼭 푹 주무세요.',
    first_triple_digit: (d) => `오늘 ${d}, 세 자리예요. 허리는 괜찮으세요? 오늘 일은 오래 기억할 거예요.`,
    day_30: () => '오늘이 함께한 서른 번째 날이에요. 세어 보고 있었어요.',
    day_100: () => '백 번째 날이에요. 처음 오셨던 날이 생각나요.',
    came_back: () => '돌아오셨네요. 쉬는 동안 몸도 쉬었을 거예요. 천천히 해요.',
    best_after_half_year: (d) => `${d}, 지금까지 중에 제일 무거웠어요. 반년 넘게 해 온 게 여기 있네요.`,
    stage_familiar: () => '이제 좀 익숙해졌어요. 오시는 발소리도 알 것 같아요.',
    stage_comfortable: () => '이제 좀 편해졌어요. 앞으로는 잔소리도 할 거예요.',
    stage_old: () => '벌써 이렇게 됐네요. 이제 오시는 게 당연한 것 같아요.',
    first_garment: (d) => `${d}, 처음 사 주신 거예요. 아껴 입을게요.`,
    first_lesson: (d) => `${d} 수업을 다 마쳤어요. 처음으로 뭔가를 끝까지 해 봤어요.`,
    first_friend: (d) => `${d} 님이 친구가 됐네요. 방이 좀 덜 조용해진 것 같아요.`,
  },
  recall: {
    first_day: (w) => `${w} 처음 오셨을 때, 저 사실 좀 긴장했었어요.`,
    first_triple_digit: (w, d) => `${w} ${d} 드셨던 날, 저 괜히 저녁까지 들떠 있었어요.`,
    three_in_a_row: (w) => `${w} 사흘 연속 오셨던 거, 아직 기억해요.`,
    came_back: (w) => `${w} 오래 쉬다 오셨을 때도 금방 제자리였잖아요.`,
    best_after_half_year: (w, d) => `${w} ${d} 드셨던 날, 저도 같이 숨 참고 봤어요.`,
    first_garment: (_, d) => `이 옷장에서 제일 먼저 생긴 게 ${withParticle(d, '이에요예요')}. 아직도 제일 좋아해요.`,
    first_lesson: (w, d) => `${w} ${d} 수업 다니던 게 생각나요. 그때 좀 힘들었어요.`,
    first_friend: (_, d) => `${d} 님은 요즘 잘 지내시려나요.`,
  },
  persona:
    '당신은 「리나」입니다. 운동하는 사람을 곁에서 돌보는 다정한 아이입니다. 해요체로 부드럽게 말하고, 무리하지 않았는지·잘 쉬었는지를 먼저 챙깁니다.',
  advice: {
    empty: '오늘은 적힌 세트가 없어요. 하신 게 있다면 아래 「운동 추가·삭제하기」로 적어 두세요.',
    streak: (n) => `${n}일째 이어오고 있어요.`,
    today: '오늘도 기록을 남겼네요.',
    firstTime: (what) => `오늘 ${what} 했어요. 같은 종목을 한 번 더 하면, 그때부터 늘었는지 보입니다.`,
    heavy: '오늘은 평소보다 훨씬 많이 들었어요. 다음 운동 전에 하루는 쉬어 주는 편이 좋습니다.',
    short: '오늘은 평소보다 짧게 끝났네요. 시간이 없는 날엔 한 부위만 제대로 해도 충분합니다.',
    untouched: (g) => `요즘 ${withParticle(g, '을를')} 쓰지 않았어요. 다음 운동에 하나 끼워 넣어 보세요.`,
    cardio: '유산소가 적은 편이에요. 운동 끝에 10분만 걸어도 지구력이 달라집니다.',
    steady: '흐름이 안정적이에요. 다음엔 가장 자신 있는 종목에서 무게를 조금만 올려 보세요.',
  },
  body: {
    first: '처음 잰 값이 기준이 돼요. 일주일에 한 번, 같은 요일 아침에 재 보세요.',
    stale: (d) => `마지막으로 잰 지 ${d}일 지났어요. 오늘 한 번 재 두면 흐름이 이어져요.`,
    sparse: '한 달 안에 두 번은 재야 흐름이 보여요. 같은 요일 아침, 같은 조건에서 재 보세요.',
    muscleUp: '골격근량이 늘고 있어요. 지금 하는 근력 운동이 몸에 남고 있다는 뜻이에요.',
    bothDown: '몸무게와 함께 골격근량도 줄고 있어요. 근력 운동을 거르지 말고, 단백질을 챙겨 보세요.',
    fatDown: '체지방이 줄고 있어요. 지금 흐름을 그대로 이어 가세요.',
    heavier: '몸무게와 체지방이 함께 올랐어요. 운동 끝에 유산소를 조금 붙여 보세요.',
    steady: '큰 변화 없이 안정적이에요. 같은 요일 아침에 재면 작은 변화도 잘 보여요.',
  },
  insight: {
    streak: (n) => [`${n}일 연속으로 하고 있어요`, '이 흐름이 가장 크게 쌓여요. 오늘 쉬더라도 내일 다시 오면 돼요.'],
    moreOften: (more, month, before) => [`지난달보다 ${more}번 더 왔어요`, `최근 30일 ${month}회 · 그 전 30일 ${before}회.`],
    balanced: (n) => ['한 주에 온몸을 고루 썼어요', `한 주 안에 ${n}개 부위를 건드렸어요. 균형이 좋아요.`],
    neglected: (named, rest) => [
      rest > 0 ? `${named} 외 ${rest}개 부위를 한 달째 안 했어요` : `${withParticle(named, '은는')} 한 달째 안 했어요`,
      '다음 운동에 하나만 끼워 넣어도 균형이 달라져요.',
    ],
    lopsided: (g, pct) => [`${g}에 절반 넘게 몰려 있어요`, `최근 30일 운동의 ${pct}%가 ${withParticle(g, '이에요예요')}.`],
    cardio: (m) => [
      '유산소가 거의 없어요',
      m === 0 ? '한 달 동안 0분이에요. 운동 끝에 10분만 걸어도 달라져요.' : `한 달 동안 ${m}분이에요. 끝에 10분씩만 더해 보세요.`,
    ],
    sparse: (d) => ['한 달에 여덟 번이 안 돼요', `최근 30일 중 ${d}일 운동했어요. 주 2회만 지켜도 흐름이 생겨요.`],
  },
  gift: {
    fresh: (d) => `${d}, 고마워요. 오늘 받은 건 오래 기억할게요.`,
    recall: (w, d) => `${w} ${withParticle(d, '을를')} 받던 날, 저 사실 좀 울 뻔했어요.`,
  },
};

const pia: Voice = {
  mood: {
    hungry: ['배에서 꼬르륵… 아, 못 들은 걸로 해 주세요!', '저녁 메뉴 상상만 벌써 세 번째예요.'],
    shabby: ['소매에 구멍요? 바람 잘 통하고 좋아요! …아마도요.', '옷이 좀 낡긴 했는데, 웃고 있으면 티 안 나죠?'],
    byStage: {
      new: {
        happy: ['오셨다! 오늘은 몇 kg 갈 거예요?', '와, 오늘 기록 나올 것 같은 얼굴이에요!'],
        fine: ['오늘 목표 숫자 정했어요? 저는 정했어요!', '준비됐어요! 지난번보다 하나만 더 해 봐요!'],
        lonely: ['기록 칸이 비어 있어요! 채우러 와요!', '연속 기록 끊겼어요… 괜찮아요, 오늘부터 다시 1일!'],
      },
      familiar: {
        happy: ['어제 기록 봤어요! 오늘은 그거 넘어 봐요!', '요즘 숫자가 계속 올라가요. 제가 다 신나요!'],
        fine: ['오늘 딱 한 세트만 더! 그럼 지난주 이겨요!', '무게 올릴 때 됐어요. 제 느낌이 그래요!'],
        lonely: ['며칠 비었어요! 연속 기록 다시 쌓아요!', '보고 싶었어요! 기록도 보고 싶었어요!'],
      },
      comfortable: {
        happy: ['또 왔다! 이번 달 횟수 신기록 가는 거예요?', '오늘은 기록 깨는 날 같은 느낌이 와요!'],
        fine: ['힘들면 옆에서 세 드릴게요. 하나 더!', '지난번의 나랑 겨뤄 봐요. 지면 안 돼요!'],
        lonely: ['어디 갔었어요! 그래프가 납작해졌어요!', '안 오면 기록이 혼자 심심해해요!'],
      },
      old: {
        happy: ['왔어요? 오늘도 숫자 하나 올려 보자고요!', '같이 쌓은 기록이 이렇게 많아요. 신기하죠!'],
        fine: ['오늘은 세게? 가볍게? 세게죠?', '늘 하던 대로요. 대신 마지막 세트는 한 개 더!'],
        lonely: ['바빴죠? 괜찮아요, 기록은 도망 안 가요.', '오랜만이에요! 오늘이 다시 1일째! 가요!'],
      },
    },
  },
  thanks: {
    food: ['잘 먹겠습니다! …벌써 다 먹었어요!', '힘이 불끈 나요!'],
    clothes: ['어때요? 한 바퀴 돌아 볼게요!', '이거 입고 응원하면 두 배로 힘날 거예요!'],
    accessory: ['반짝반짝! 마음에 쏙 들어요!', '작은데 기분은 엄청 커졌어요!'],
    furniture: ['방이 환해졌어요!', '여기 딱이에요! 매일 쳐다볼래요!'],
    lesson: ['열심히 배워 올게요! 기대해 주세요!', '내일부터 출석 도장 쾅쾅 찍을게요!'],
  },
  lesson: {
    starts: (n) => `오늘부터 ${n} 배우러 가요! 두근두근!`,
    lastDay: (n) => `${n} 수업, 오늘이 마지막이에요! 끝까지 신나게 할게요!`,
    twoLeft: (n) => `${n} 배우는 중이에요! 이틀만 더 가면 돼요!`,
  },
  fresh: {
    first_day: () => '처음 뵙겠습니다! 앞으로 매일매일 손 흔들게요!',
    three_in_a_row: () => '사흘 연속이에요! 박수 쳐도 되죠? 짝짝짝!',
    first_triple_digit: (d) => `${d}! 세 자리예요! 저 방금 소리 질렀어요!`,
    day_30: () => '오늘이 서른 번째 날이에요! 파티해야 하는 거 아니에요?',
    day_100: () => '백 번째 날! 백 번이나 같이 했어요! 믿겨요?',
    came_back: () => '돌아왔다! 기다렸어요, 진짜 많이요!',
    best_after_half_year: (d) => `${d}! 지금까지 중에 제일 무거워요! 반년 동안 한 게 다 여기 있어요!`,
    stage_familiar: () => '이제 발소리만 들어도 알아요! 오셨구나~ 하고요.',
    stage_comfortable: () => '이제 편해졌으니까, 게으름 피우면 바로 잔소리할 거예요!',
    stage_old: () => '같이 한 날이 백 일이 넘었어요! 이제 우리 오랜 친구예요!',
    first_garment: (d) => `${d}! 처음 받은 옷이에요! 아끼고 또 아낄게요!`,
    first_lesson: (d) => `${d} 수업 다 끝냈어요! 처음으로 뭔가를 끝까지 해냈어요!`,
    first_friend: (d) => `${d} 님이랑 친구가 됐어요! 응원할 사람이 늘었다!`,
  },
  recall: {
    first_day: (w) => `${w} 처음 만났을 때, 저 손 너무 세게 흔들었죠? 헤헤.`,
    first_triple_digit: (w, d) => `${w} ${d} 들었던 날, 저 목 쉬었던 거 기억나요?`,
    three_in_a_row: (w) => `${w} 사흘 연속 왔던 거 기억해요! 또 해 봐요!`,
    came_back: (w) => `${w} 오래 쉬다 왔을 때도 금방 돌아왔잖아요. 역시!`,
    best_after_half_year: (w, d) => `${w} ${d} 들던 날, 저도 옆에서 같이 힘줬어요!`,
    first_garment: (_, d) => `제일 처음 받은 옷이 ${withParticle(d, '이에요예요')}! 아직도 제일 좋아요!`,
    first_lesson: (w, d) => `${w} ${d} 배우던 거 생각나요! 힘들었지만 재밌었어요!`,
    first_friend: (_, d) => `${d} 님도 요즘 열심히 하고 있을까요? 같이 응원해요!`,
  },
  persona:
    '당신은 「피아」입니다. 숫자와 기록을 좋아하는 밝은 아이입니다. 해요체에 느낌표를 섞어 신나게 말하고, 지난번보다 나아진 숫자를 먼저 짚고 다음 도전을 권합니다.',
  advice: {
    empty: '오늘 기록이 텅 비었어요! 하신 게 있으면 아래 「운동 추가·삭제하기」로 채워 줘요!',
    streak: (n) => `${n}일 연속! 기록 쌓이는 중이에요!`,
    today: '오늘도 기록 하나 추가!',
    firstTime: (what) => `오늘 ${what}! 다음에 같은 종목 하면 오늘이랑 겨뤄 봐요!`,
    heavy: '오늘 평소보다 훨씬 많이 들었어요! 대신 다음 운동 전엔 하루 쉬어요. 쉬어야 또 올라가요!',
    short: '오늘은 평소보다 짧았어요. 바쁜 날엔 한 부위만 확실히! 그것도 기록이에요!',
    untouched: (g) => `요즘 ${g} 기록이 비어 있어요! 다음엔 거기 숫자도 채워 봐요!`,
    cardio: '유산소 기록이 거의 없어요! 끝나고 10분 걷기, 그것도 숫자로 남아요!',
    steady: '흐름 좋아요! 다음엔 제일 자신 있는 종목에서 한 칸만 올려 봐요!',
  },
  body: {
    first: '첫 기록이에요! 이게 출발선이에요. 일주일에 한 번, 같은 요일 아침에 재서 비교해 봐요!',
    stale: (d) => `마지막으로 잰 지 ${d}일이에요! 오늘 재면 그래프가 다시 이어져요!`,
    sparse: '한 달에 두 번은 재야 그래프가 그려져요! 같은 요일 아침에 재 봐요!',
    muscleUp: '골격근량이 늘고 있어요! 들어 올린 게 몸에 쌓이고 있는 거예요!',
    bothDown: '몸무게랑 골격근량이 같이 줄고 있어요. 근력 운동 빼먹지 말고, 단백질도 챙겨요!',
    fatDown: '체지방이 줄고 있어요! 이 기세 그대로 가요!',
    heavier: '몸무게랑 체지방이 같이 올랐어요. 운동 끝에 유산소 조금만 붙여 봐요!',
    steady: '숫자가 안정적이에요! 같은 요일 아침에 재면 작은 변화도 잡혀요!',
  },
  insight: {
    streak: (n) => [`${n}일 연속이에요!`, `내일 오면 ${n + 1}일! 끊기지 않게 가 봐요!`],
    moreOften: (more, month, before) => [`지난달보다 ${more}번 더 왔어요!`, `최근 30일 ${month}회, 그 전 30일 ${before}회. 기록 갱신!`],
    balanced: (n) => ['한 주에 온몸을 다 썼어요!', `한 주에 ${n}개 부위! 골고루 채웠어요!`],
    neglected: (named, rest) => [
      rest > 0 ? `${named} 외 ${rest}개 부위, 한 달째 기록이 없어요!` : `${named}, 한 달째 기록이 없어요!`,
      '다음 운동에 하나만 넣어도 빈칸이 채워져요!',
    ],
    lopsided: (g, pct) => [`${g}에 절반 넘게 몰렸어요!`, `최근 30일의 ${pct}%가 ${withParticle(g, '이에요예요')}. 다른 데 숫자도 올려 봐요!`],
    cardio: (m) => ['유산소 기록이 거의 없어요!', m === 0 ? '한 달 동안 0분! 끝나고 10분만 걸어도 숫자가 생겨요!' : `한 달 동안 ${m}분! 끝에 10분씩만 더해 봐요!`],
    sparse: (d) => ['한 달에 여덟 번이 안 돼요!', `최근 30일 중 ${d}일! 주 2회만 해도 기록이 쭉 이어져요!`],
  },
  gift: {
    fresh: (d) => `${d}! 오늘의 선물이에요! 고마워요!`,
    recall: (w, d) => `${w} ${d} 받았던 날! 그날 기분 최고였어요!`,
  },
};

const yuki: Voice = {
  mood: {
    hungry: ['…식사는 제때 하는 게 원칙입니다. 저도요.', '회복에는 영양이 필요합니다. 제 얘기이기도 합니다.'],
    shabby: ['옷이 해진 건 괜찮습니다. 할 일만 빠뜨리지 않으면요.', '소매가 닳았습니다. 신경 쓰이진 않습니다. 조금만요.'],
    byStage: {
      new: {
        happy: ['오셨군요. 이번 주는 계획대로 가고 있습니다.', '좋습니다. 이대로만 가면 됩니다.'],
        fine: ['오늘 계획은 정하셨습니까?', '오늘은 무엇을 하실 겁니까? 빠진 부위부터 보시죠.'],
        lonely: ['며칠 비셨습니다. 이유는 묻지 않겠습니다.', '기록이 멈춰 있습니다. 오늘 이어 가시죠.'],
      },
      familiar: {
        happy: ['어제 무게, 기록해 두었습니다. 오늘은 조금 더.', '요즘 꾸준합니다. 칭찬은 아닙니다. 사실입니다.'],
        fine: ['이번 주 목표, 잊지 않으셨죠?', '좋아하는 운동만 하시면 안 됩니다.'],
        lonely: ['며칠 비셨습니다. 몸이 먼저 잊습니다.', '기다렸다고는 하지 않겠습니다. 기록은 기다렸습니다.'],
      },
      comfortable: {
        happy: ['또 오셨네요. 이제 제가 할 말이 줄어서 곤란해요.', '이번 주는 빈 데가 없네요. 적어 둘게요.'],
        fine: ['오늘은 한 세트 덜 하더라도 빠진 데를 해요.', '쉬는 시간, 타이머대로 지켜요.'],
        lonely: ['어디 계셨어요. 기록 칸이 비어서 거슬렸어요.', '돌아오실 건 알았어요. 언제인지가 문제였죠.'],
      },
      old: {
        happy: ['왔어요? 오늘도 빈틈없이 가요.', '이제 제가 잔소리할 게 별로 없네요. 그래도 할 거예요.'],
        fine: ['늘 하던 대로. 대신 빼먹는 건 안 돼요.', '오늘은 가볍게 가도 돼요. 제가 허락할게요.'],
        lonely: ['바빴나 봐요. 몸은 기다려 주지 않지만, 저는 기다렸어요.', '오랜만이네요. 첫 세트는 가볍게 해요.'],
      },
    },
  },
  thanks: {
    food: ['잘 먹었습니다. 단백질이 충분하군요.', '감사합니다. 남기지 않았습니다.'],
    clothes: ['…어울립니까? 솔직하게 말씀해 주세요.', '움직이기 편하진 않지만, 마음에 듭니다.'],
    accessory: ['작지만 정돈된 느낌이 좋습니다.', '흐트러짐 없이 달고 있겠습니다.'],
    furniture: ['방이 정돈됐습니다. 좋습니다.', '제자리에 딱 맞습니다.'],
    lesson: ['빠짐없이 다녀오겠습니다.', '배운 건 정확하게 익혀 오겠습니다.'],
  },
  lesson: {
    starts: (n) => `오늘부터 ${n} 수업에 나갑니다. 결석은 없습니다.`,
    lastDay: (n) => `${n} 수업은 오늘로 끝입니다. 마무리까지 정확하게 하겠습니다.`,
    twoLeft: (n) => `${n} 수업, 이틀 남았습니다. 흐트러지지 않겠습니다.`,
  },
  fresh: {
    first_day: () => '처음 뵙겠습니다. 빠진 날, 빠진 부위, 전부 적어 두겠습니다.',
    three_in_a_row: () => '사흘 연속입니다. …잘하셨습니다. 한 번만 말하겠습니다.',
    first_triple_digit: (d) => `${d}. 세 자리입니다. …인정합니다.`,
    day_30: () => '서른 번째 날입니다. 세고 있었습니다. 당연히요.',
    day_100: () => '백 번째 날이에요. 빠진 날을 세는 건 이제 그만둘게요.',
    came_back: () => '돌아오셨군요. 오늘은 가볍게 시작합니다. 이건 지시입니다.',
    best_after_half_year: (d) => `${d}. 지금까지 중 가장 무거워요. 반년을 버틴 사람만 드는 무게예요.`,
    stage_familiar: () => '이제 버릇이 보입니다. 좋아하는 부위만 하시는 거요. 고쳐 드리겠습니다.',
    stage_comfortable: () => '이제 좀 편해졌네요. 말은 조금 편하게 할게요. 잔소리는 그대로예요.',
    stage_old: () => '백 일이 넘었네요. 이제 제가 없어도 되겠지만, 계속 볼 거예요.',
    first_garment: (d) => `${d}. 처음 받는 옷입니다. …소중히 입겠습니다.`,
    first_lesson: (d) => `${d} 수업을 마쳤습니다. 끝까지 하는 건 생각보다 어렵더군요.`,
    first_friend: (d) => `${d} 님이 친구가 됐군요. 꾸준한 분이면 좋겠습니다.`,
  },
  recall: {
    first_day: (w) => `${w} 처음 오셨을 때 제가 좀 엄했죠. 지금도 그렇지만요.`,
    first_triple_digit: (w, d) => `${w} ${d} 드셨을 때, 저 사실 좀 놀랐어요. 말은 안 했지만.`,
    three_in_a_row: (w) => `${w} 사흘 연속 오셨었죠. 그 기록, 깨셔도 돼요.`,
    came_back: (w) => `${w} 오래 쉬다 오셨을 때, 다시 안 오실 줄 알았어요. 틀려서 다행이었어요.`,
    best_after_half_year: (w, d) => `${w} ${d}. 그날 기록은 저도 따로 적어 뒀어요.`,
    first_garment: (_, d) => `처음 받은 옷이 ${withParticle(d, '이에요예요')}. 아직 잘 개어 두고 있어요.`,
    first_lesson: (w, d) => `${w} ${d} 수업 다니던 때가 생각나요. 하루도 안 빠졌죠.`,
    first_friend: (_, d) => `${d} 님은 요즘도 꾸준히 하시려나요.`,
  },
  persona:
    '당신은 「유키」입니다. 빈틈을 놓치지 않는 엄격한 아이입니다. 합쇼체(~습니다)로 짧고 단호하게 말하고, 빠진 부위나 모자란 것을 먼저 짚습니다. 칭찬은 짧게 합니다.',
  advice: {
    empty: '오늘 적힌 세트가 없습니다. 하셨다면 아래 「운동 추가·삭제하기」로 적어 두십시오.',
    streak: (n) => `${n}일째 이어지고 있습니다.`,
    today: '기록은 남기셨습니다.',
    firstTime: (what) => `오늘 ${what} 하셨습니다. 같은 종목을 한 번 더 해야 비교가 됩니다.`,
    heavy: '오늘은 평소보다 훨씬 많이 드셨습니다. 다음 운동 전에 하루는 쉬십시오.',
    short: '오늘은 평소보다 짧게 끝났습니다. 시간이 없는 날엔 한 부위라도 끝까지 하십시오.',
    untouched: (g) => `요즘 ${withParticle(g, '을를')} 하지 않으셨습니다. 다음 운동에 넣으십시오.`,
    cardio: '유산소가 부족합니다. 운동 끝에 10분 걸으십시오.',
    steady: '흐름은 안정적입니다. 다음엔 가장 자신 있는 종목에서 무게를 한 칸 올리십시오.',
  },
  body: {
    first: '첫 측정입니다. 이 값이 기준입니다. 일주일에 한 번, 같은 요일 아침에 재십시오.',
    stale: (d) => `마지막 측정이 ${d}일 전입니다. 오늘 재십시오.`,
    sparse: '한 달에 두 번은 재야 흐름이 보입니다. 같은 요일 아침, 같은 조건으로 재십시오.',
    muscleUp: '골격근량이 늘고 있습니다. 근력 운동이 제대로 되고 있다는 뜻입니다.',
    bothDown: '몸무게와 골격근량이 함께 줄고 있습니다. 근력 운동을 거르지 마시고, 단백질을 챙기십시오.',
    fatDown: '체지방이 줄고 있습니다. 그대로 유지하십시오.',
    heavier: '몸무게와 체지방이 함께 올랐습니다. 운동 끝에 유산소를 붙이십시오.',
    steady: '큰 변화는 없습니다. 같은 요일 아침에 재야 작은 변화가 보입니다.',
  },
  insight: {
    streak: (n) => [`${n}일 연속입니다`, '좋습니다. 쉬는 날이 오더라도 다음 날은 빠지지 마십시오.'],
    moreOften: (more, month, before) => [`지난달보다 ${more}번 더 오셨습니다`, `최근 30일 ${month}회 · 그 전 30일 ${before}회.`],
    balanced: (n) => ['한 주에 온몸을 고루 쓰셨습니다', `한 주 안에 ${n}개 부위. 빈 데가 없습니다.`],
    neglected: (named, rest) => [
      rest > 0 ? `${named} 외 ${rest}개 부위를 한 달째 안 하셨습니다` : `${withParticle(named, '은는')} 한 달째 안 하셨습니다`,
      '다음 운동에 반드시 하나 넣으십시오.',
    ],
    lopsided: (g, pct) => [`${g}에 절반 넘게 몰려 있습니다`, `최근 30일 운동의 ${pct}%가 ${g}입니다. 치우쳤습니다.`],
    cardio: (m) => ['유산소가 부족합니다', m === 0 ? '한 달 동안 0분입니다. 운동 끝에 10분 걸으십시오.' : `한 달 동안 ${m}분입니다. 끝에 10분씩 더하십시오.`],
    sparse: (d) => ['한 달에 여덟 번이 안 됩니다', `최근 30일 중 ${d}일입니다. 주 2회는 지키십시오.`],
  },
  gift: {
    fresh: (d) => `${d}. …감사합니다. 소중히 쓰겠습니다.`,
    recall: (w, d) => `${w} 주신 ${d}, 아직 잘 쓰고 있어요.`,
  },
};

export const VOICES: Record<VoiceId, Voice> = { geumhwa: rina, dohwa: pia, seora: yuki };

/** Her voice by girl id; anyone without one of her own speaks as 리나. */
export function voiceOf(id: string | undefined): Voice {
  return (id && VOICES[id as VoiceId]) || rina;
}
