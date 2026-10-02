/**
 * A line about the body readings — from the model when it answers, from the
 * rules when it does not.
 *
 * Bodies are a touchier subject than sets. A coach may say a lift went up; it
 * has no business calling anyone heavy, prescribing calories or naming a
 * target weight. So the model is given the readings and the trend and nothing
 * to judge them against, and the rules only ever talk about direction — which
 * way things moved, and whether the scale has been used often enough to say.
 */
import { askModel } from './advice.ts';
import { voiceOf } from './voices.ts';
import { BODY_METRICS, bmi, change, latest, type BodyLog, type BodyMetric } from './body.ts';

const TRACKED: BodyMetric[] = ['weight_kg', 'body_fat_pct', 'muscle_kg'];

/** How far a reading has to move in a month before it is called a move. */
const MOVE: Record<BodyMetric, number> = {
  weight_kg: 0.5,
  body_fat_pct: 0.5,
  muscle_kg: 0.3,
  height_cm: 1,
};

function daysBetween(from: string, to: Date) {
  const start = Date.parse(`${from}T00:00:00`);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((end - start) / 86400000);
}

type Direction = 'up' | 'down' | 'flat' | null;

function direction(logs: BodyLog[], metric: BodyMetric, today: Date): Direction {
  const moved = change(logs, metric, 30, today);
  if (!moved) return null;
  if (moved.delta >= MOVE[metric]) return 'up';
  if (moved.delta <= -MOVE[metric]) return 'down';
  return 'flat';
}

/** The facts handed to the model, and the only numbers it may say. */
export function describeBody(logs: BodyLog[], today = new Date()): string {
  if (logs.length === 0) return '기록 없음';
  const lines: string[] = [];
  const newest = [...logs].sort((a, b) => b.measured_on.localeCompare(a.measured_on))[0];
  lines.push(`마지막으로 잰 날: ${daysBetween(newest.measured_on, today)}일 전`);
  for (const key of TRACKED) {
    const value = latest(logs, key);
    if (value === null) continue;
    const { name, unit } = BODY_METRICS[key];
    const moved = change(logs, key, 30, today);
    lines.push(
      moved
        ? `${name}: 지금 ${value}${unit}, 최근 한 달 ${moved.delta > 0 ? '+' : ''}${moved.delta}${unit}`
        : `${name}: 지금 ${value}${unit}, 한 달 안의 비교 없음`
    );
  }
  const index = bmi(latest(logs, 'weight_kg'), latest(logs, 'height_cm'));
  if (index !== null) lines.push(`BMI: ${index}`);
  return lines.join('\n');
}

export function buildBodyPrompt(logs: BodyLog[], today = new Date(), girl?: string) {
  return [
    voiceOf(girl).persona,
    '아래 신체 기록을 보고 두 문장 이내로 말하세요.',
    '규칙: 달라진 흐름을 한 줄, 다음 운동이나 다음 측정에서 할 수 있는 한 가지를 한 줄.',
    // The things a coach does not say about someone's body.
    '몸매나 외모를 평가하지 마세요. 뚱뚱하다, 말랐다 같은 말은 쓰지 마세요.',
    '칼로리, 식단 처방, 목표 체중을 말하지 마세요. 진단이나 치료 이야기도 하지 마세요.',
    '아래에 없는 숫자는 쓰지 마세요.',
    '',
    describeBody(logs, today),
  ].join('\n');
}

/** Something true to say from the readings alone. */
export function bodyRuleAdvice(logs: BodyLog[], today = new Date(), girl?: string): string {
  const say = voiceOf(girl).body;
  if (logs.length === 0) {
    return say.first;
  }
  const newest = [...logs].sort((a, b) => b.measured_on.localeCompare(a.measured_on))[0];
  const gap = daysBetween(newest.measured_on, today);
  if (gap >= 14) {
    return say.stale(gap);
  }

  const weight = direction(logs, 'weight_kg', today);
  const fat = direction(logs, 'body_fat_pct', today);
  const muscle = direction(logs, 'muscle_kg', today);

  if (weight === null && fat === null && muscle === null) {
    return say.sparse;
  }
  if (muscle === 'up' && fat !== 'up') {
    return say.muscleUp;
  }
  if (weight === 'down' && muscle === 'down') {
    return say.bothDown;
  }
  if (fat === 'down') {
    return say.fatDown;
  }
  if (weight === 'up' && fat === 'up') {
    return say.heavier;
  }
  return say.steady;
}

/**
 * The model's line when `useModel` is on and it answers inside the facts;
 * the rules' line otherwise. Never throws.
 */
export async function requestBodyAdvice(
  logs: BodyLog[],
  signal?: AbortSignal,
  useModel = true,
  today = new Date(),
  girl?: string
): Promise<{ text: string; source: 'model' | 'rules' }> {
  // Nothing recorded is nothing to read; the rules say how to start.
  if (!useModel || logs.length === 0) return { text: bodyRuleAdvice(logs, today, girl), source: 'rules' };
  try {
    const text = await askModel(buildBodyPrompt(logs, today, girl), describeBody(logs, today), signal, 'body');
    return { text, source: 'model' };
  } catch {
    return { text: bodyRuleAdvice(logs, today, girl), source: 'rules' };
  }
}
