/**
 * Schooling: what gold buys that training never will.
 *
 * The five workout stats already answer "how strong is she". These three
 * answer "what has she become", and deliberately have no path through the gym —
 * otherwise the shop would just be a slower way to do push-ups.
 *
 * Lessons cost gold only. Princess Maker made classes and part-time work
 * compete for the same month, but here the part-time work *is* the workout, so
 * that tension would push against the one thing the app exists to encourage.
 */

export type CultureKey = 'grace' | 'learning' | 'charm';

export const CULTURE_META: Record<CultureKey, { name: string; hint: string; icon: string }> = {
  grace: { name: '기품', hint: '몸가짐과 예의', icon: 'rose-outline' },
  learning: { name: '교양', hint: '읽고 셈하고 생각한 것', icon: 'book-outline' },
  charm: { name: '매력', hint: '사람을 끄는 힘', icon: 'sparkles-outline' },
};

export const CULTURE_ORDER: CultureKey[] = ['grace', 'learning', 'charm'];

export type Culture = Record<CultureKey, number>;

export const EMPTY_CULTURE: Culture = { grace: 0, learning: 0, charm: 0 };

export const CULTURE_CAP = 100;

export type Lesson = {
  id: string;
  name: string;
  detail: string;
  price: number;
  /**
   * How many days of going every morning it takes.
   *
   * A lesson used to be paid for and learned in the same instant, while a
   * notification told you she had set off — the points were already banked
   * before she left the house. Time is what makes the choice a choice: while
   * she is learning one thing she is not learning another, and the longer
   * courses teach more for it.
   */
  days: number;
  /** Raw points, before the diminishing return near the cap. */
  teaches: Partial<Record<CultureKey, number>>;
  icon: string;
};

export const LESSONS: Lesson[] = [
  {
    id: 'etiquette',
    name: '예의범절',
    detail: '앉고 서고 인사하는 법부터',
    price: 120,
    days: 3,
    teaches: { grace: 8 },
    icon: 'hand-left-outline',
  },
  {
    id: 'dance',
    name: '무용',
    detail: '무도회에서 굳지 않으려면',
    price: 160,
    days: 4,
    teaches: { grace: 5, charm: 5 },
    icon: 'musical-notes-outline',
  },
  {
    id: 'voice',
    name: '성악',
    detail: '목소리도 차림새예요',
    price: 160,
    days: 4,
    teaches: { charm: 8 },
    icon: 'mic-outline',
  },
  {
    id: 'painting',
    name: '회화',
    detail: '보는 눈이 먼저 자라요',
    price: 190,
    days: 5,
    teaches: { learning: 5, charm: 4 },
    icon: 'color-palette-outline',
  },
  {
    id: 'literature',
    name: '문학',
    detail: '남의 삶을 한 권씩',
    price: 210,
    days: 5,
    teaches: { learning: 8 },
    icon: 'book-outline',
  },
  {
    id: 'mathematics',
    name: '수학',
    detail: '셈이 밝으면 속지 않아요',
    price: 210,
    days: 6,
    teaches: { learning: 9 },
    icon: 'calculator-outline',
  },
  {
    id: 'theology',
    name: '신학',
    detail: '묻기를 배우는 시간',
    price: 260,
    days: 7,
    teaches: { grace: 6, learning: 6 },
    icon: 'moon-outline',
  },
];

export function lessonById(id: string) {
  return LESSONS.find((l) => l.id === id) ?? null;
}

/**
 * Later lessons in the same subject teach less, so nobody buys 예의범절 forty
 * times and calls it a personality. Always at least 1, so a lesson is never
 * a pure waste of gold.
 */
export function gainFor(current: number, raw: number) {
  const room = Math.max(0, CULTURE_CAP - current);
  if (room === 0) return 0;
  return Math.max(1, Math.min(room, Math.round(raw * (room / CULTURE_CAP))));
}

export function attend(lesson: Lesson, culture: Culture): Culture {
  const next = { ...culture };
  for (const key of CULTURE_ORDER) {
    const raw = lesson.teaches[key];
    if (raw) next[key] = Math.min(CULTURE_CAP, next[key] + gainFor(next[key], raw));
  }
  return next;
}

/** What a lesson would actually add right now, for showing before buying. */
export function previewOf(lesson: Lesson, culture: Culture) {
  const after = attend(lesson, culture);
  return CULTURE_ORDER.filter((k) => after[k] !== culture[k]).map((k) => ({
    key: k,
    name: CULTURE_META[k].name,
    gain: after[k] - culture[k],
  }));
}

/** Her standing, as one number, for the year-end picture. */
export function refinementOf(culture: Culture) {
  return Math.round(CULTURE_ORDER.reduce((s, k) => s + culture[k], 0) / CULTURE_ORDER.length);
}

/** A title for how far she has come, shown beside the culture bars. */
export function refinementTitle(culture: Culture) {
  const score = refinementOf(culture);
  if (score >= 90) return '왕궁에 들어도 손색없는';
  if (score >= 70) return '어디에 내놓아도 좋은';
  if (score >= 45) return '제법 배운 티가 나는';
  if (score >= 20) return '이제 막 배우기 시작한';
  return '아직 배운 것이 없는';
}

/** When she leaves for a lesson and when she is back. */
export type Trip = { leaves: Date; returns: Date };

const LEAVE_HOUR = 9;
const LESSON_HOURS = 6;

/**
 * A lesson is a day out, not a purchase. She sets off the next morning that
 * has not already gone — pay at eight and she leaves within the hour, pay at
 * midnight and she goes when the sun is up, never at one in the morning.
 */
export function tripTimes(now = new Date()): Trip {
  const leaves = new Date(now);
  leaves.setHours(LEAVE_HOUR, 0, 0, 0);
  if (leaves <= now) leaves.setDate(leaves.getDate() + 1);

  const returns = new Date(leaves);
  returns.setHours(returns.getHours() + LESSON_HOURS);
  return { leaves, returns };
}

/**
 * A course she is part-way through.
 *
 * Kept as two day keys rather than timestamps: a lesson is measured in
 * mornings she went, and "three days" should mean the same whether it was
 * bought at eight in the morning or at midnight.
 */
export type Enrolment = {
  lessonId: string;
  /** Local YYYY-MM-DD. */
  startedOn: string;
  /** Local YYYY-MM-DD, inclusive: the last morning she goes. */
  endsOn: string;
};

function dayKeyOf(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDays(key: string, days: number) {
  const at = new Date(`${key}T00:00:00`);
  at.setDate(at.getDate() + days);
  return dayKeyOf(at);
}

/** Sign her up, starting today. */
export function enrol(lesson: Lesson, today = new Date()): Enrolment {
  const startedOn = dayKeyOf(today);
  return {
    lessonId: lesson.id,
    startedOn,
    // Inclusive, so a one-day course starts and ends on the same morning.
    endsOn: shiftDays(startedOn, Math.max(1, lesson.days) - 1),
  };
}

/** Mornings still to go, counting today. Zero once the course is over. */
export function daysLeft(enrolment: Enrolment, today = new Date()) {
  const from = new Date(`${dayKeyOf(today)}T00:00:00`).getTime();
  const to = new Date(`${enrolment.endsOn}T00:00:00`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000) + 1);
}

/**
 * Whether the course has run its course.
 *
 * Checked against the day rather than the hour, so what she learned lands on
 * the morning after the last lesson however late the app is opened.
 */
export function isFinished(enrolment: Enrolment, today = new Date()) {
  return dayKeyOf(today) > enrolment.endsOn;
}

/** How long a course takes, in words for the shelf. */
export function lengthWord(lesson: Lesson) {
  if (lesson.days % 7 === 0) return `${lesson.days / 7}주`;
  return `${lesson.days}일`;
}

/** What she is doing and until when, for the banner above the shelf. */
export function enrolmentWord(enrolment: Enrolment, today = new Date()) {
  const lesson = lessonById(enrolment.lessonId);
  const left = daysLeft(enrolment, today);
  const until = enrolment.endsOn.slice(5).replace('-', '월 ');
  const name = lesson?.name ?? '수업';
  return left <= 1
    ? `${name} · 오늘이 마지막 날이에요`
    : `${name} · ${until}일까지, ${left}일 남았어요`;
}
