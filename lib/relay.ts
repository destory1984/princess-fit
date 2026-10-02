import type { SupabaseClient } from '@supabase/supabase-js';

// 모델에게 묻는 길: 폰 → Supabase의 model_requests 줄 → 전하의 PC(relay/worker.mjs)
// → Ollama(안 되면 ChatGPT CLI) → 같은 줄의 answer → 폰.
//
// 폰은 줄을 넣고 답이 적힐 때까지 들여다본다. 기다림에는 끝이 있다. 끝나도 답이
// 없으면 던지고, 부르는 쪽(askModel)이 규칙 기반 답으로 넘어간다 — 지금 Ollama가
// 꺼져 있을 때와 같은 길이다.

/** 폰이 답을 기다리는 가장 긴 시간. ChatGPT CLI로 넘어가면 20-40초가 걸린다. */
export const RELAY_WAIT_MS = 45_000;

/**
 * 이보다 오래 「대기」인 줄은 일꾼이 맡지 않고 「만료」로 닫는다. 폰은 이미 규칙의
 * 답을 보여 줬으니, 늦게 온 모델 답은 아무도 읽지 않는다. PC가 꺼져 있던 동안
 * 쌓인 줄을 켜자마자 한꺼번에 돌리지 않게 하는 것이기도 하다.
 */
export const STALE_AFTER_MS = RELAY_WAIT_MS + 15_000;

/**
 * 일꾼이 「살아 있음」을 적는 간격과, 폰이 그것을 믿는 시간.
 *
 * PC는 늘 켜져 있지 않다. 살아 있는지 모르고 물으면 꺼져 있는 동안 매번 45초를
 * 기다린다. 일꾼이 1분마다 적고, 폰은 2분 넘게 끊겼으면 묻지도 않는다 — 한 번
 * 놓친 것(인터넷이 잠깐 끊김)으로는 꺼졌다고 보지 않는다.
 */
export const HEARTBEAT_EVERY_MS = 60_000;
export const HEARTBEAT_STALE_MS = 2 * HEARTBEAT_EVERY_MS;

/** 마지막으로 적힌 「살아 있음」으로 보아 일꾼이 지금 받을 수 있는가. */
export function relayAlive(beatAt: string | null, now: number) {
  if (!beatAt) return false;
  const at = Date.parse(beatAt);
  // 폰 시계가 조금 늦어 앞날의 시각으로 보여도 살아 있는 것이다.
  return Number.isFinite(at) && now - at < HEARTBEAT_STALE_MS;
}

/**
 * 일꾼이 꺼져 있어 묻지 않았다. 「물었는데 답이 없었다」와 다르다 — 이쪽은 한순간도
 * 기다리지 않았으니, 부르는 쪽이 다른 길을 바로 써도 된다.
 */
export class RelayAsleep extends Error {
  constructor() {
    super('일꾼이 꺼져 있음');
    this.name = 'RelayAsleep';
  }
}

export type RelayRow = { status: string; answer: string | null; error: string | null };

export type RelayStore = {
  /** 줄을 넣고 그 id를 준다. */
  insert(kind: string, prompt: string): Promise<string>;
  read(id: string): Promise<RelayRow | null>;
  /**
   * 일꾼이 마지막으로 「살아 있음」을 적은 때. 모르면(표가 없음, 못 읽음) null이고,
   * 그것은 꺼진 것으로 친다. 이 함수가 없는 우체통은 살아 있는지 묻지 않고 넣는다.
   */
  lastBeat?(): Promise<string | null>;
};

export type RelayOutcome = { state: 'waiting' } | { state: 'answered'; text: string } | { state: 'failed'; reason: string };

/** 줄 하나가 지금 무엇을 말하는가. 빈 답은 답이 아니다. */
export function relayOutcome(row: RelayRow | null): RelayOutcome {
  if (!row) return { state: 'failed', reason: '줄이 사라짐' };
  if (row.status === 'queued' || row.status === 'working') return { state: 'waiting' };
  if (row.status === 'done') {
    const text = row.answer?.trim();
    return text ? { state: 'answered', text } : { state: 'failed', reason: '빈 응답' };
  }
  return { state: 'failed', reason: row.error || row.status };
}

/** 들여다보는 간격. 처음엔 촘촘히(Ollama가 데워져 있으면 1-2초에 끝난다), 갈수록 느슨히. */
export function pollDelay(attempt: number) {
  return Math.min(1000 + attempt * 250, 3000);
}

type Options = {
  waitMs?: number;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 묻고 답을 돌려준다. 답이 없으면(시간 끝, 실패, 끊김) 던진다 — 부르는 쪽이
 * 규칙으로 넘어갈 차례라는 뜻이다.
 */
export async function askRelay(store: RelayStore, kind: string, prompt: string, options: Options = {}) {
  const { waitMs = RELAY_WAIT_MS, signal, now = Date.now, sleep = defaultSleep } = options;
  if (store.lastBeat && !relayAlive(await store.lastBeat().catch(() => null), now())) {
    throw new RelayAsleep();
  }
  const deadline = now() + waitMs;
  const id = await store.insert(kind, prompt);
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw new Error('취소됨');
    const outcome = relayOutcome(await store.read(id));
    if (outcome.state === 'answered') return outcome.text;
    if (outcome.state === 'failed') throw new Error(outcome.reason);
    const left = deadline - now();
    if (left <= 0) throw new Error('시간 끝');
    await sleep(Math.min(pollDelay(attempt), left));
  }
}

type Ask = (kind: string, prompt: string, signal?: AbortSignal) => Promise<string>;

/**
 * 중계로 묻되, 일꾼이 꺼져 있을 때만 곧장 가는 길을 쓴다.
 *
 * 꺼져 있음은 묻기 전에 안다. 그때는 한순간도 기다리지 않았으니 곧장 가는 길
 * (같은 PC나 같은 집의 Ollama)을 바로 써 본다 — 중계를 켜기 전과 똑같이 돈다.
 * 물었는데 답이 없었던 것(시간 끝, 실패)은 다르다. 이미 45초를 썼고, 일꾼의
 * Ollama가 못 한 것을 곧장 가서 또 기다리게 하지 않는다. 그건 던지고, 부르는 쪽이
 * 규칙의 답을 쓴다.
 */
export function relayThenDirect(relay: Ask, direct: Ask): Ask {
  return async (kind, prompt, signal) => {
    try {
      return await relay(kind, prompt, signal);
    } catch (err) {
      if (err instanceof RelayAsleep) return direct(kind, prompt, signal);
      throw err;
    }
  };
}

/** 앱의 Supabase 클라이언트로 만든 우체통. */
export function supabaseRelayStore(client: SupabaseClient): RelayStore {
  return {
    async insert(kind, prompt) {
      const { data, error } = await client.from('model_requests').insert({ kind, prompt }).select('id').single();
      if (error || !data) throw new Error('중계에 줄을 못 넣음');
      return data.id;
    },
    async read(id) {
      const { data, error } = await client
        .from('model_requests')
        .select('status, answer, error')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('중계를 못 읽음');
      return data as RelayRow | null;
    },
    async lastBeat() {
      // relay.sql을 아직 안 돌린 DB에는 이 표가 없다. 그것도 「꺼져 있음」이다.
      const { data, error } = await client
        .from('relay_heartbeat')
        .select('beat_at')
        .eq('id', 1)
        .maybeSingle();
      return error || !data ? null : (data.beat_at as string);
    },
  };
}
