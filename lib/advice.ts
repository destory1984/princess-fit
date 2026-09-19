import { withParticle } from './exerciseCopy.ts';
import { formatDuration } from './format.ts';
import type { WorkoutFact } from './gamification.ts';
import type { Stats } from './character.ts';

export type AdviceContext = {
  /** The session just finished. */
  today: WorkoutFact;
  /** Earlier finished sessions, newest first. */
  history: WorkoutFact[];
  stats: Stats;
  streak: number;
};

function averageOf(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** The facts an adviser needs, in one short block. */
export function describeContext(c: AdviceContext) {
  const past = c.history.filter((w) => w.id !== c.today.id).slice(0, 8);
  const avgVolume = Math.round(averageOf(past.map((w) => w.volume)));
  const avgSets = Math.round(averageOf(past.map((w) => w.doneSets)));

  const lines = [
    `오늘 운동: ${c.today.groups.join(', ') || '부위 미상'}`,
    `오늘 세트 ${c.today.doneSets}개, 총 무게 ${Math.round(c.today.volume).toLocaleString()}kg`,
  ];
  if (c.today.durationSec > 0) {
    lines.push(
      `오늘 유산소 ${formatDuration(c.today.durationSec)}` +
        (c.today.distanceKm > 0 ? `, ${c.today.distanceKm}km` : '')
    );
  }
  if (past.length) {
    lines.push(`최근 ${past.length}회 평균: 세트 ${avgSets}개, 총 무게 ${avgVolume.toLocaleString()}kg`);
    lines.push(`최근 쓴 부위: ${[...new Set(past.flatMap((w) => w.groups))].join(', ') || '없음'}`);
  } else {
    lines.push('이전 기록 없음 (첫 운동)');
  }
  lines.push(`연속 운동 ${c.streak}일`);
  lines.push(
    `능력치 — 근력 ${c.stats.strength}, 지구력 ${c.stats.stamina}, 활력 ${c.stats.vitality}, ` +
      `균형 ${c.stats.balance}, 꾸준함 ${c.stats.discipline}`
  );
  return lines.join('\n');
}

export function buildPrompt(c: AdviceContext) {
  return [
    '당신은 한국어로 말하는 침착한 운동 코치입니다.',
    '아래 기록을 보고 세 문장 이내로 조언하세요.',
    '규칙: 칭찬 한 줄, 다음에 바꿀 점 한 줄. 진단이나 치료 이야기는 하지 마세요.',
    '통증이나 부상 이야기가 있으면 병원에 가보라고만 하세요.',
    '',
    describeContext(c),
  ].join('\n');
}

/**
 * Advice without a model: compares this session to recent ones and picks the
 * most useful thing to say. Also the fallback when no model is configured.
 */
export function localRuleAdvice(c: AdviceContext): string {
  const past = c.history.filter((w) => w.id !== c.today.id).slice(0, 8);
  const praise = c.streak > 1 ? `${c.streak}일째 이어오고 있어요.` : '오늘도 기록을 남겼네요.';

  if (past.length === 0) {
    // Nothing to compare against, so say what today actually was. "비교할 것이
    // 없어요" alone reads as an apology for having no opinion.
    const what = c.today.groups.length
      ? `${withParticle(c.today.groups.join(', '), '을/를')} ${c.today.doneSets}세트`
      : `${c.today.doneSets}세트`;
    return `${praise} 오늘 ${what} 했어요. 같은 종목을 한 번 더 하면, 그때부터 늘었는지 보입니다.`;
  }

  const avgVolume = averageOf(past.map((w) => w.volume));
  const avgSets = averageOf(past.map((w) => w.doneSets));
  const recentGroups = new Set(past.slice(0, 3).flatMap((w) => w.groups));
  const untouched = ['가슴', '등', '어깨', '하체', '팔', '복근'].filter(
    (g) => !recentGroups.has(g) && !c.today.groups.includes(g)
  );

  if (c.today.volume > avgVolume * 1.3 && avgVolume > 0) {
    return `${praise} 오늘은 평소보다 훨씬 많이 들었어요. 다음 운동 전에 하루는 쉬어 주는 편이 좋습니다.`;
  }
  if (c.today.doneSets < avgSets * 0.6 && avgSets > 0) {
    return `${praise} 오늘은 평소보다 짧게 끝났네요. 시간이 없는 날엔 한 부위만 제대로 해도 충분합니다.`;
  }
  if (untouched.length >= 3) {
    const missing = untouched.slice(0, 2);
    return `${praise} 요즘 ${withParticle(missing.join(', '), '을/를')} 쓰지 않았어요. 다음 운동에 하나 끼워 넣어 보세요.`;
  }
  if (c.stats.stamina < 30 && c.today.durationSec === 0) {
    return `${praise} 유산소가 적은 편이에요. 운동 끝에 10분만 걸어도 지구력이 달라집니다.`;
  }
  return `${praise} 흐름이 안정적이에요. 다음엔 가장 자신 있는 종목에서 무게를 조금만 올려 보세요.`;
}

type Provider = { url: string; model: string };

// Matches the local Ollama server already running on this machine. A phone
// cannot reach "localhost", so point EXPO_PUBLIC_ADVICE_URL at the PC's LAN IP
// when testing on a device.
const DEFAULT_URL = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'qwen3.8:27b';

function configuredProvider(): Provider {
  return {
    url: process.env.EXPO_PUBLIC_ADVICE_URL || DEFAULT_URL,
    model: process.env.EXPO_PUBLIC_ADVICE_MODEL || DEFAULT_MODEL,
  };
}

// A large model can take minutes to load from cold, so the UI must not wait on it.
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * Loads the model into memory so it is ready later. Call this when a workout
 * starts; by the time it ends the request below answers in about a second.
 * Failures are ignored — the server is often deliberately off.
 */
export function warmUpAdvice() {
  const provider = configuredProvider();
  fetch(provider.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: provider.model, prompt: '.', stream: false, think: false, keep_alive: '30m' }),
  }).catch(() => {});
}

/**
 * Asks the configured model, falling back to the rule-based advice when none is
 * set up, the call fails, or it takes too long. Swapping providers means
 * changing this one function.
 */
export async function requestAdvice(
  c: AdviceContext,
  signal?: AbortSignal
): Promise<{ text: string; source: 'model' | 'rules' }> {
  const provider = configuredProvider();
  // AbortSignal.any/timeout are not on every runtime this ships to.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    // Ollama's /api/generate shape; other local servers accept the same fields.
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.model,
        prompt: buildPrompt(c),
        stream: false,
        think: false,
        keep_alive: '10m',
        options: { temperature: 0.4 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const body = (await res.json()) as { response?: string };
    const text = body.response?.trim();
    if (!text) throw new Error('빈 응답');
    return { text, source: 'model' };
  } catch {
    return { text: localRuleAdvice(c), source: 'rules' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
