import { localDayKey } from './format.ts';
import { isEmptyWorkout, type WorkoutFact } from './gamification.ts';
import { computeStats, type Stats } from './character.ts';
import { conditionFactor, type Household } from './economy.ts';
import type { Culture } from './lessons.ts';
import { effectiveCulture } from './shop.ts';
import { isFestival, type Memory } from './companion.ts';
import { voiceOf } from './voices.ts';

export { isFestival };

/**
 * The festival at the end of every month. See docs/festival.md.
 *
 * Until this, nothing asked anything of what she had become. Five training
 * stats and three from school were printed on a plaque and read by no one,
 * and gold piled up with nowhere to go. A festival is where they are finally
 * put to use: once a month she enters one contest against three girls from
 * other houses, and how she does is decided by what you and she built.
 *
 * Everything here is worked out, not rolled. The same standing on the same
 * festival gives the same result however often it is judged — a result that
 * changes when the screen is reopened is a slot machine, not a contest.
 */

export type ContestId = 'tournament' | 'ball' | 'debate';

type Weights = Partial<Record<keyof Stats | keyof Culture | 'attire' | 'form', number>>;

export type Contest = {
  id: ContestId;
  name: string;
  /** What decides it, in words, for the screen. */
  hint: string;
  icon: string;
  /** Sum to 1, so a perfect standing is exactly 100. */
  weights: Weights;
};

export const CONTESTS: Contest[] = [
  {
    id: 'tournament',
    name: '기사 대회',
    hint: '요즘의 기세가 가장 크고, 근력·활력·지구력이 뒤를 받쳐요',
    icon: 'shield-outline',
    weights: { form: 0.4, strength: 0.3, vitality: 0.15, stamina: 0.15 },
  },
  {
    id: 'ball',
    name: '무도회',
    hint: '기품과 매력이 거의 전부예요. 차림새와 균형이 조금',
    icon: 'rose-outline',
    weights: { grace: 0.4, charm: 0.4, balance: 0.1, attire: 0.1 },
  },
  {
    id: 'debate',
    name: '문답 대회',
    hint: '교양이 가장 크고, 꾸준함이 뒤를 받쳐요',
    icon: 'book-outline',
    weights: { learning: 0.6, discipline: 0.4 },
  },
];

export function contestById(id: ContestId): Contest {
  return CONTESTS.find((c) => c.id === id)!;
}

// ---------------------------------------------------------------- calendar

const NAMES = [
  '눈꽃 축제',
  '촛불 축제',
  '새싹 축제',
  '꽃 축제',
  '장미 축제',
  '한여름 축제',
  '별빛 축제',
  '바다 축제',
  '수확제',
  '단풍 축제',
  '등불 축제',
  '겨울 축제',
];

export type Festival = {
  /** YYYY-MM, which names the memory it becomes. */
  key: string;
  /** YYYY-MM-DD, local. */
  day: string;
  month: number;
  name: string;
};

/**
 * The last Saturday of the month. A weekend, so it can be looked forward to
 * on a day off, and at the end of the month so a whole month counts.
 */
export function festivalDay(year: number, month: number): string {
  const last = new Date(year, month, 0, 12);
  last.setDate(last.getDate() - ((last.getDay() + 1) % 7));
  return localDayKey(last);
}

function festivalOf(year: number, month: number): Festival {
  return {
    key: `${year}-${String(month).padStart(2, '0')}`,
    day: festivalDay(year, month),
    month,
    name: NAMES[month - 1],
  };
}

/** The last festival held on or before today. */
export function latestFestival(today = new Date()): Festival {
  const key = localDayKey(today);
  const here = festivalOf(today.getFullYear(), today.getMonth() + 1);
  if (here.day <= key) return here;
  const before = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12);
  return festivalOf(before.getFullYear(), before.getMonth() + 1);
}

/** The festival the month before this one. */
export function previousFestival(festival: Festival): Festival {
  const before = new Date(`${festival.day}T12:00:00`);
  before.setDate(1);
  before.setMonth(before.getMonth() - 1);
  return festivalOf(before.getFullYear(), before.getMonth() + 1);
}

/** The next festival, which is today's when it is today. */
export function nextFestival(today = new Date()): Festival {
  const key = localDayKey(today);
  const here = festivalOf(today.getFullYear(), today.getMonth() + 1);
  if (here.day >= key) return here;
  const after = new Date(today.getFullYear(), today.getMonth() + 1, 1, 12);
  return festivalOf(after.getFullYear(), after.getMonth() + 1);
}

function dayNumber(key: string) {
  return Math.round(new Date(`${key}T00:00:00`).getTime() / 86_400_000);
}

export function daysUntil(festival: Festival, today = new Date()) {
  return dayNumber(festival.day) - dayNumber(localDayKey(today));
}

// ---------------------------------------------------------------- her standing

/** Training days a month needs for full form: three a week, as the shop assumes. */
export const FULL_FORM_DAYS = 12;
const FORM_WINDOW = 28;

/**
 * How much she has been training lately, 0–100: the training days in the four
 * weeks up to the festival, twelve being full. The stats alone saturate within
 * a few weeks (a heavy session is a heavy session), so without this the first
 * month would decide every month after it.
 */
export function formOf(facts: WorkoutFact[], day: Date): number {
  return Math.min(100, Math.round((100 * formDays(facts, day)) / FULL_FORM_DAYS));
}

/** The training days in the four weeks up to `day`, which is what form counts. */
export function formDays(facts: WorkoutFact[], day: Date): number {
  const end = dayNumber(localDayKey(day));
  const days = new Set(
    facts
      .filter((f) => !isEmptyWorkout(f))
      .map((f) => localDayKey(new Date(f.started_at)))
      .filter((k) => {
        const n = dayNumber(k);
        return n <= end && n > end - FORM_WINDOW;
      })
  );
  return days.size;
}

export type Standing = {
  stats: Stats;
  culture: Culture;
  /** 0–100, how her clothes are holding up. */
  attire: number;
  form: number;
  /** How she is faring, 0.7–1 (conditionFactor). Hunger costs her here too. */
  factor: number;
  /** Weeks in the month before whose favour was met (lib/favour.ts). */
  favours: number;
};

/**
 * Points each met favour adds, in every contest. Four weeks at most is 8 —
 * nearly three months of a rival's improvement, which is enough to matter
 * and not enough to stand in for the training itself.
 */
export const FAVOUR_BONUS = 2;

export type Keeping = {
  house: Household;
  culture: Culture;
  wardrobe: string[];
  worn: string[];
};

/**
 * Where she stands on a given festival day. The training is read as of that
 * day, so a festival judged a few days late is not judged on sessions she
 * had not done yet. The household is read as it is now: nothing records how
 * hungry she was last Saturday, and the gap is at most RESOLVE_WITHIN_DAYS.
 */
export function standingAt(facts: WorkoutFact[], keeping: Keeping, day: Date, favours = 0): Standing {
  const end = dayNumber(localDayKey(day));
  const upTo = facts.filter(
    (f) => !isEmptyWorkout(f) && dayNumber(localDayKey(new Date(f.started_at))) <= end
  );
  return {
    stats: computeStats(upTo, day),
    culture: effectiveCulture(keeping.culture, keeping.wardrobe, keeping.worn),
    attire: keeping.house.attire,
    form: formOf(upTo, day),
    factor: conditionFactor(keeping.house),
    favours,
  };
}

/** Her score in a contest before the day's luck, 0–100. */
export function scoreOf(contest: ContestId, s: Standing): number {
  const values: Record<string, number> = { ...s.stats, ...s.culture, attire: s.attire, form: s.form };
  const raw = Object.entries(contestById(contest).weights).reduce(
    (sum, [k, w]) => sum + (values[k] ?? 0) * (w ?? 0),
    0
  );
  return Math.min(100, Math.round(raw * s.factor) + FAVOUR_BONUS * (s.favours ?? 0));
}

/** What she would enter if nobody chose: the one she scores best in. */
export function defaultEntry(s: Standing): ContestId {
  return CONTESTS.map((c) => c.id).reduce((best, id) => (scoreOf(id, s) > scoreOf(best, s) ? id : best));
}

// ---------------------------------------------------------------- rivals

type Rival = {
  id: string;
  name: string;
  from: string;
  start: number;
  cap: number;
  /** Said when she takes first place. */
  won: string;
  /** Said when she came second to ours. Graceful: a rival who sneers is not one anyone looks forward to. */
  lost: string;
};

/**
 * Three girls per contest: one to beat early, one to beat with work, and one
 * who is the reason to keep going. They improve by the month as she does, up
 * to a ceiling below perfect — so the very best standing can still win, and
 * nothing less can win forever.
 *
 * Named, from somewhere, and the same for everyone: rivals you come to know
 * are a story; strangers generated fresh each month are only numbers.
 */
const RIVALS: Record<ContestId, Rival[]> = {
  tournament: [
    {
      id: 'cecile', name: '세실', from: '사냥꾼 집 딸', start: 28, cap: 72,
      won: '어? 제가 이긴 거예요? 활 말고 칼로요?',
      lost: '활이었으면 몰랐을 거예요! …다음 달에 또 해요.',
    },
    {
      id: 'martha', name: '마르타', from: '대장간 집 딸', start: 45, cap: 82,
      won: '쇠는 두드릴수록 단단해지는 법이지.',
      lost: '좋은 팔이네. 우리 대장간에서 일해 볼 생각 없어?',
    },
    {
      id: 'brienne', name: '브리엔', from: '붉은 사자 가문', start: 60, cap: 94,
      won: '붉은 사자는 물러서지 않아요. 다음 달에 또 봐요.',
      lost: '…졌네요. 이 이름, 기억해 둘게요.',
    },
  ],
  ball: [
    {
      id: 'nell', name: '넬', from: '꽃집 아이', start: 28, cap: 72,
      won: '꽃 냄새 덕분인가 봐요! 오늘은 제가 꽃이에요!',
      lost: '춤추는 거 정말 예뻤어요. 꽃 한 송이 드릴게요.',
    },
    {
      id: 'rosaline', name: '로잘린', from: '비단 상인 댁', start: 45, cap: 82,
      won: '옷감이 좋으면 발도 가벼운 법이에요.',
      lost: '그 몸가짐, 어디서 배우셨어요? 저도 좀 알려 주세요.',
    },
    {
      id: 'isabel', name: '이자벨', from: '공작 댁 영애', start: 60, cap: 94,
      won: '무도회는 태어날 때부터 배우는 거랍니다.',
      lost: '…오늘 밤은 당신 거예요. 오늘 밤만요.',
    },
  ],
  debate: [
    {
      id: 'mira', name: '미라', from: '책방 아이', start: 28, cap: 72,
      won: '책방에 있는 책은 다 읽었거든요!',
      lost: '그 대답, 어느 책에서 보셨어요? 알려 주세요!',
    },
    {
      id: 'theodora', name: '테오도라', from: '수도원 필경사', start: 45, cap: 82,
      won: '베껴 쓴 만큼 외워지는 법입니다.',
      lost: '훌륭한 답이었습니다. 기록해 두겠습니다.',
    },
    {
      id: 'ophelia', name: '오필리아', from: '학자 집안', start: 60, cap: 94,
      won: '질문을 고르는 것부터가 실력이에요.',
      lost: '흥미롭네요. 다음엔 제가 질문할게요.',
    },
  ],
};

/** Points a rival gains each festival, until her ceiling. */
const RIVAL_STEP = 3;

/** −3…+3, fixed by what it is for. The day's luck, the same on every reading. */
export function luck(seed: string) {
  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 7) - 3;
}

export type Entry = { name: string; from: string; score: number; her: boolean };

/** The rivals as they stand at her `index`-th festival. */
export function rivalsOf(contest: ContestId, index: number, key: string): Entry[] {
  return RIVALS[contest].map((r) => ({
    name: r.name,
    from: r.from,
    score: Math.min(r.cap, r.start + RIVAL_STEP * index) + luck(`${key}:${contest}:${r.id}`),
    her: false,
  }));
}

/**
 * What is said about a rival before the day: her level to the nearest five.
 * Near enough to aim at, and it does not give away the day's luck.
 */
export function rumourOf(contest: ContestId, index: number): { name: string; from: string; about: number }[] {
  return RIVALS[contest].map((r) => ({
    name: r.name,
    from: r.from,
    about: Math.round(Math.min(r.cap, r.start + RIVAL_STEP * index) / 5) * 5,
  }));
}

/**
 * Which of her festivals this is, from 0: the festivals held since the first
 * day she trained. The rivals are pitched at how long she has been at it, not
 * at the calendar — someone starting in year three meets the same first
 * festival as someone who started in year one.
 */
export function festivalIndex(facts: WorkoutFact[], festival: Festival): number {
  const first = facts
    .filter((f) => !isEmptyWorkout(f))
    .map((f) => localDayKey(new Date(f.started_at)))
    .sort()[0];
  if (!first) return 0;
  let n = 0;
  let cursor = festival;
  while (true) {
    const prev = previousFestival(cursor);
    if (prev.day < first) return n;
    n += 1;
    cursor = prev;
  }
}

// ---------------------------------------------------------------- judging

export type Place = 1 | 2 | 3 | 4;

export type Result = {
  key: string;
  day: string;
  festival: string;
  contest: ContestId;
  contestName: string;
  place: Place;
  /** Best first. Her own entry has an empty name; the screen fills in hers. */
  entries: Entry[];
};

export function judge(contest: ContestId, s: Standing, festival: Festival, index: number): Result {
  const hers: Entry = {
    name: '',
    from: '',
    score: Math.max(0, scoreOf(contest, s) + luck(`${festival.key}:${contest}:her`)),
    her: true,
  };
  // A tie goes to her. Nobody remembers the girl who came second on a count-back.
  const entries = [hers, ...rivalsOf(contest, index, festival.key)].sort(
    (a, b) => b.score - a.score || Number(b.her) - Number(a.her)
  );
  return {
    key: festival.key,
    day: festival.day,
    festival: festival.name,
    contest,
    contestName: contestById(contest).name,
    place: (entries.findIndex((e) => e.her) + 1) as Place,
    entries,
  };
}

/**
 * Gold for each place. Small on purpose: the shop is priced against a year
 * of training (shop.test.ts), and a festival that paid like a week of it would
 * quietly pull that apart. What a festival gives is the day itself.
 */
const PRIZES: Record<Place, number> = { 1: 150, 2: 80, 3: 40, 4: 20 };

export function prizeFor(place: Place) {
  return PRIZES[place];
}

/**
 * One rival's word after the results, or null: the winner's, if a rival
 * won, or the runner-up's, if she did. Looked up by name so a result kept
 * from months ago still finds who said it.
 */
export function rivalRemark(result: Pick<Result, 'contest' | 'entries'>): { name: string; line: string } | null {
  const [first, second] = result.entries;
  const speaker = first?.her ? second : first;
  const rival = RIVALS[result.contest]?.find((r) => r.name === speaker?.name);
  if (!rival) return null;
  return { name: rival.name, line: first?.her ? rival.lost : rival.won };
}

// ---------------------------------------------------------------- which festival

/** How late a festival may still be judged. Later, it is not that month any more. */
export const RESOLVE_WITHIN_DAYS = 14;

/**
 * The festival waiting to be judged, or null. The last one held, from the
 * day after it — so a session on the festival day itself still counts — if
 * it is recent, and if she had trained at all in the month before it.
 *
 * Someone back after a long break is not greeted with a contest lost while
 * they were away — coming back is already hard enough (docs/companion.md).
 */
export function unresolved(facts: WorkoutFact[], today = new Date()): Festival | null {
  const festival = latestFestival(today);
  const since = -daysUntil(festival, today);
  if (since < 1 || since > RESOLVE_WITHIN_DAYS) return null;
  if (formOf(facts, new Date(`${festival.day}T12:00:00`)) === 0) return null;
  return festival;
}

// ---------------------------------------------------------------- talk

/** Days before a festival she starts to mention it, and days after she still does. */
export const TALK_BEFORE = 3;
export const TALK_AFTER = 2;

/**
 * What she says about the festival today, or null: in the few days before
 * it, where she is going, and in the two days after, how it went — if it
 * was she who went. The rest of the month she has other things to say; a
 * girl who talks about the festival every day for a month is a poster.
 */
export function festivalTalk(
  girl: string | undefined,
  memories: Memory[],
  contestName: string | null,
  today = new Date()
): string | null {
  const said = voiceOf(girl).festival;
  const latest = latestFestival(today);
  const since = -daysUntil(latest, today);
  if (since >= 1 && since <= TALK_AFTER) {
    const r = parseResult(memories.find((m) => m.kind === `festival:${latest.key}`)?.detail ?? null);
    if (r) return said.place[r.place](r.contestName, r.entries[0]?.name ?? '');
  }
  const left = daysUntil(nextFestival(today), today);
  if (contestName && left <= TALK_BEFORE) return said.ahead(contestName, left);
  return null;
}

// ---------------------------------------------------------------- memory

const PLACED: Record<Place, string> = {
  1: '에서 우승한 날',
  2: '에서 2등을 한 날',
  3: '에서 3등을 한 날',
  4: '에 나간 날',
};

/**
 * The festival as she keeps it. The whole result goes into `detail` so the
 * day can be shown again exactly as it was, whatever has changed since.
 */
export function festivalMemory(result: Result): Memory {
  return {
    kind: `festival:${result.key}`,
    day: result.day,
    line: `${festivalTitle(result)} ${result.contestName}${PLACED[result.place]}`,
    detail: JSON.stringify(result),
  };
}

export function festivalTitle(r: Pick<Result, 'key' | 'festival'>) {
  return `${Number(r.key.slice(5))}월 ${r.festival}`;
}

export function parseResult(detail: string | null): Result | null {
  if (!detail) return null;
  try {
    const r = JSON.parse(detail) as Result;
    return r && typeof r.place === 'number' && Array.isArray(r.entries) ? r : null;
  } catch {
    return null;
  }
}
