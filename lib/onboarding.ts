import type { Level, Sex } from './profile.ts';
import { ROUTINE_PRESETS, type RoutinePreset } from './routinePresets.ts';

/**
 * The first five minutes, which decide whether there is a sixth.
 *
 * Before this, a new account landed on an empty room with an empty routine
 * list and a button. Everything the app needs in order to be useful — how
 * often you intend to come, where you train, what you are after — it already
 * had no way to ask, so it guessed, and its guesses were the same for
 * everybody.
 *
 * The questions are asked by her rather than by a form. That is not decoration:
 * "일주일에 몇 번 오실 건가요" from someone who is waiting is a promise, and
 * the same question in a settings row is data entry. It is also the honest
 * place to meet her, since she is who the gold is for.
 */

export type Goal = 'strength' | 'shape' | 'weight' | 'habit' | 'stamina';

export const GOALS: { id: Goal; label: string; detail: string }[] = [
  { id: 'strength', label: '힘을 키우고 싶어요', detail: '더 무겁게 드는 쪽으로' },
  { id: 'shape', label: '몸을 다듬고 싶어요', detail: '모양과 균형을 보는 쪽으로' },
  { id: 'weight', label: '체중을 줄이고 싶어요', detail: '오래, 자주 움직이는 쪽으로' },
  { id: 'habit', label: '꾸준히만 하고 싶어요', detail: '무리 없이 거르지 않는 쪽으로' },
  // From a review of a much larger app: 「운동 목적을 심폐 향상이나 민첩성
  // 향상에 두어도 그저 흔한 보디빌딩식 분할법 추천만 해주네요」. Four goals
  // that all answered with the same barbell is four goals pretending to be a
  // question. Someone who came to breathe better deserves a different answer.
  { id: 'stamina', label: '숨이 덜 차면 좋겠어요', detail: '심폐와 지구력을 올리는 쪽으로' },
];

export type Place = 'gym' | 'home';

export const PLACES: { id: Place; label: string; detail: string }[] = [
  { id: 'gym', label: '헬스장', detail: '기구와 덤벨이 있어요' },
  { id: 'home', label: '집', detail: '맨몸이나 가벼운 덤벨만 있어요' },
];

export const MIN_PER_WEEK = 1;
export const MAX_PER_WEEK = 7;

/**
 * Which ready-made routines to offer, given the answers.
 *
 * Twice a week is not enough days to split a body across, so those answers get
 * whole-body sessions however ambitious the goal; four or more has room for an
 * upper/lower pair and is wasted on repeating the same session. Training at
 * home skips the question entirely — there is only one routine that works
 * without a rack.
 *
 * Presets are returned rather than named so a caller that offers none can say
 * so, instead of building a routine out of a missing id.
 */
export function recommendPresets(
  place: Place,
  perWeek: number,
  goal: Goal | null = null,
  who: { sex?: Sex | null; level?: Level } = {}
): RoutinePreset[] {
  return fitted(byPlan(place, perWeek, goal), place, who);
}

/** How many are offered at once. More than this is a catalogue, not a suggestion. */
const OFFERED = 4;

/**
 * The same answer, bent toward who is asking (2026-10-06).
 *
 * Someone who has trained before is shown the barbell days ahead of the
 * machine ones: the machine split is where they have been. A woman is shown
 * the hips-and-legs day second — second and not first, because what goes first
 * is still decided by how often she comes and what for, and those she said
 * herself. Saying nothing about either leaves the list exactly as it was.
 *
 * Nothing is taken away, only put in front: a guess about someone from their
 * sex that removed a routine would be the app deciding for them.
 */
function fitted(
  base: RoutinePreset[],
  place: Place,
  who: { sex?: Sex | null; level?: Level }
): RoutinePreset[] {
  const pick = (...ids: string[]) =>
    ids.map((id) => ROUTINE_PRESETS.find((p) => p.id === id)).filter((p): p is RoutinePreset => !!p);
  let list = base;
  if (who.level === 'intermediate' && place === 'gym') {
    list = [...pick('upper-strength', 'lower-strength'), ...list];
  }
  if (who.level === 'intermediate' && place === 'home') {
    list = [...pick('home-strength'), ...list];
  }
  if (who.sex === 'female') {
    const hips = pick(place === 'home' ? 'home-glutes' : 'glutes');
    list = [...list.slice(0, 1), ...hips, ...list.slice(1)];
  }
  const seen = new Set<string>();
  return list.filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, OFFERED);
}

function byPlan(place: Place, perWeek: number, goal: Goal | null): RoutinePreset[] {
  const pick = (...ids: string[]) =>
    ids.map((id) => ROUTINE_PRESETS.find((p) => p.id === id)).filter((p): p is RoutinePreset => !!p);

  if (goal === 'stamina') {
    // The heart answers to minutes, not to plates — so the breathing day
    // leads, with the strength work behind it rather than instead of it.
    return place === 'home'
      ? pick('cardio', 'home', 'full-body')
      : pick('cardio', 'full-body', 'upper-lower-a');
  }
  if (place === 'home') return pick('home');
  if (perWeek >= 4) return pick('upper-lower-a', 'upper-lower-b', 'full-body');
  return pick('full-body', 'upper-lower-a', 'upper-lower-b');
}

/**
 * Who she is, said before she is chosen.
 *
 * The first thing asked, because everything after it is asked by her. Each is
 * told by what she will actually do — the three look at different records
 * (lib/notice.ts) — and then speaks one line herself, since how she talks is
 * half of what is being chosen. Keyed by advisor id.
 */
export const INTRODUCTIONS: Record<string, { temper: string; about: string; hello: string }> = {
  geumhwa: {
    temper: '자상한 아이',
    about: '쉬어도 나무라지 않아요. 잠은 잘 잤는지, 뭉친 데는 없는지를 먼저 물어요.',
    hello: '오래 쉬다 오셔도 괜찮아요. 여기서 기다릴게요.',
  },
  dohwa: {
    temper: '지기 싫어하는 아이',
    about: '숫자를 좋아해요. 최고 기록과 연속 일수를 세고, 어제의 나를 이겨 보자고 해요.',
    hello: '같이 기록 깨 봐요! 숫자는 제가 다 세어 둘게요!',
  },
  seora: {
    temper: '엄격한 아이',
    about: '빈틈을 그냥 넘기지 않아요. 오래 안 한 부위와 못 채운 목표를 짚어요. 말은 딱딱하지만 가까워지면 조금 풀려요.',
    hello: '빠뜨린 것은 제가 짚겠습니다. 하기로 한 것만 지키십시오.',
  },
};

/**
 * The first conversation, in each girl's own way of speaking. It was written
 * for Rina alone while she was the only one who could open the door; chosen
 * first, Yuki would have greeted in Rina's soft 해요체 and then turned formal
 * the moment the room appeared.
 */
type FirstWords = {
  meet: (name: string) => string;
  perWeek: [string, string, string, string];
  goal: string;
  place: Record<Place, string>;
  heard: string;
  /** Before asking who they are: sex, how long they have trained, what they weigh. */
  you: string;
  quiet: string;
  nudge: (hour: number) => string;
};

const FIRST_WORDS: Record<string, FirstWords> = {
  geumhwa: {
    meet: (name) => `저는 ${name}예요. 여기서 기다리고 있을게요. 몇 가지만 여쭤봐도 될까요?`,
    perWeek: [
      '한 번이라도 꾸준하면 그게 제일 좋아요.',
      '그 정도가 제일 오래 가요.',
      '꽤 자주 오시네요. 기다리는 보람이 있겠어요.',
      '거의 매일이네요. 쉬는 날도 하루쯤 두세요.',
    ],
    goal: '뭘 바라고 오셨는지 알면, 제가 드릴 말씀도 달라져요.',
    place: {
      home: '집이라면 기구 없이 할 수 있는 걸로 드릴게요.',
      gym: '기구가 있으면 고를 수 있는 게 많아져요.',
    },
    heard: '그렇게 알고 있을게요.',
    you: '어떤 분인지 알면 권해 드릴 게 달라져요. 말하기 싫은 건 비워 두셔도 괜찮아요.',
    quiet: '알겠어요. 조용히 기다릴게요.',
    nudge: (hour) => `그럼 ${hour}시쯤에 한 마디 보낼게요. 하루에 한 번만요.`,
  },
  dohwa: {
    meet: (name) => `저는 ${name}예요! 같이 기록 깨 봐요! 몇 가지만 물어볼게요!`,
    perWeek: [
      '한 번이라도 좋아요! 그 한 번을 꼭 지켜 봐요!',
      '딱 좋아요! 오래 가는 숫자예요!',
      '자주 오시네요! 기록이 금방 쌓이겠어요!',
      '거의 매일이네요! 그래도 쉬는 날이 하루는 있어야 숫자가 올라요!',
    ],
    goal: '뭘 바라는지 알면 어떤 숫자를 볼지 정할 수 있어요!',
    place: {
      home: '집이면 맨몸으로 하는 걸로 가요!',
      gym: '기구가 있으면 올릴 숫자가 많아요!',
    },
    heard: '좋아요, 그렇게 가요!',
    you: '어떤 분인지 알려 주세요! 시작 무게를 맞춰 드릴게요! 비워 둬도 돼요!',
    quiet: '알겠어요! 조용히 기다릴게요!',
    nudge: (hour) => `그럼 ${hour}시쯤에 한 마디 보낼게요! 하루에 한 번만요!`,
  },
  seora: {
    meet: (name) => `${name}입니다. 시작하기 전에 몇 가지 확인하겠습니다.`,
    perWeek: [
      '한 번이면 충분합니다. 거르지만 마십시오.',
      '적당합니다. 오래 지킬 수 있는 횟수입니다.',
      '많은 편입니다. 지키는지 보겠습니다.',
      '거의 매일이군요. 쉬는 날을 하루는 두십시오.',
    ],
    goal: '무엇을 바라는지 알아야 무엇을 짚을지 정할 수 있습니다.',
    place: {
      home: '집이라면 기구 없이 하는 종목으로 드리겠습니다.',
      gym: '기구가 있으면 고를 수 있는 종목이 많습니다.',
    },
    heard: '그렇게 적어 두겠습니다.',
    you: '맞는 루틴과 시작 무게를 정하려면 몇 가지가 필요합니다. 답하지 않으셔도 됩니다.',
    quiet: '알겠습니다. 보내지 않겠습니다.',
    nudge: (hour) => `${hour}시쯤에 한 번 보내겠습니다. 하루에 한 번입니다.`,
  },
};

/** Her first words; an unknown girl speaks as the first one does. */
export function firstWords(girl?: string): FirstWords {
  return FIRST_WORDS[girl ?? ''] ?? FIRST_WORDS.geumhwa;
}

/**
 * Her word on the plan just described, said back in her own words so the
 * answers read as heard rather than stored.
 */
export function planWord(goal: Goal, place: Place, perWeek: number, girl?: string) {
  const where = place === 'home' ? '집에서' : '헬스장에서';
  const aim: Record<Goal, string> = {
    strength: '힘을 키우는 쪽으로',
    shape: '몸을 다듬는 쪽으로',
    weight: '체중을 줄이는 쪽으로',
    habit: '거르지 않는 쪽으로',
    stamina: '숨이 덜 차는 쪽으로',
  };
  return `${where} 일주일에 ${perWeek}번, ${aim[goal]}. ${firstWords(girl).heard}`;
}

/**
 * What she says about how often you intend to come.
 *
 * Nobody is talked out of an ambitious answer — it is their week, not the
 * app's. But seven days a week is a plan that fails in its second week, and
 * saying so once, gently, before it has failed is kinder than the streak
 * counter saying it afterwards.
 */
export function perWeekWord(perWeek: number, girl?: string): string {
  const said = firstWords(girl).perWeek;
  if (perWeek <= 1) return said[0];
  if (perWeek <= 3) return said[1];
  if (perWeek <= 5) return said[2];
  return said[3];
}

// 'who' comes first: the rest is asked by whoever is chosen there.
/**
 * Said once someone who started as a beginner has trained long enough to be
 * offered the barbell days (`levelUpDue`, lib/profile.ts). An offer: the level
 * is changed by the person, on the button under these words.
 */
const LEVEL_UP: Record<string, string> = {
  geumhwa: '이제 꽤 익숙해지셨어요. 바벨을 쓰는 루틴도 한번 보실래요? 지금 것이 편하시면 그대로 두셔도 돼요.',
  dohwa: '벌써 이만큼 했어요! 이제 바벨 루틴으로 올라가 봐요! 더 큰 숫자가 기다려요!',
  seora: '기록이 충분히 쌓였습니다. 바벨 루틴으로 올릴 때입니다. 정하는 것은 직접 하십시오.',
};

export function levelUpWord(girl?: string) {
  return LEVEL_UP[girl ?? ''] ?? LEVEL_UP.geumhwa;
}

// 'you' sits just before 'routine': what is offered there depends on its answers.
export const STEPS = ['who', 'meet', 'often', 'goal', 'place', 'you', 'routine', 'nudge'] as const;
export type Step = (typeof STEPS)[number];

/**
 * The steps this device can actually walk.
 *
 * A browser cannot deliver the daily word, so asking what hour to send it is a
 * question whose answer does nothing. Settings already hides the same card on
 * the web; this is the first screen a tester sees, and it was still asking.
 */
export function stepsFor(canNudge: boolean): readonly Step[] {
  return canNudge ? STEPS : STEPS.filter((s) => s !== 'nudge');
}

export function nextStep(step: Step, steps: readonly Step[] = STEPS): Step | null {
  const i = steps.indexOf(step);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
}

export function previousStep(step: Step, steps: readonly Step[] = STEPS): Step | null {
  const i = steps.indexOf(step);
  return i > 0 ? steps[i - 1] : null;
}

/** How far along, for the bar at the top. 0–1. */
export function progressOf(step: Step, steps: readonly Step[] = STEPS) {
  return (steps.indexOf(step) + 1) / steps.length;
}
