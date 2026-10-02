// 모델 중계 일꾼. 전하의 PC에서 돈다.
//
//   node --env-file=relay/.env relay/worker.mjs
//
// Supabase의 model_requests에서 「대기」 줄을 하나씩 가져와 Ollama에 묻고, 안 되면
// ChatGPT CLI(codex exec)에 묻고, 답을 그 줄에 적는다. 한 번에 하나씩만 한다 —
// PC의 그래픽 카드는 하나다.
//
// 모든 줄은 relay/logs/YYYY-MM-DD.jsonl에 한 줄씩 남는다: 받은 글, 돌려준 답,
// 누가 몇 초에 했는지, 실패했으면 왜. 규칙은 lib/relayWorker.ts에 있다.

import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { cleanAnswer, codexPrompt, isStale, logEntry, logFileName, providersFor, shortError } from '../lib/relayWorker.ts';

const env = process.env;
const need = (name) => {
  if (!env[name]) {
    console.error(`relay/.env에 ${name}이 없습니다. relay/.env.example을 보십시오.`);
    process.exit(1);
  }
  return env[name];
};

const config = {
  supabaseUrl: need('SUPABASE_URL'),
  serviceKey: need('SUPABASE_SERVICE_ROLE_KEY'),
  ollamaUrl: env.OLLAMA_URL || 'http://localhost:11434/api/generate',
  ollamaModel: env.OLLAMA_MODEL || 'qwen3.8:27b',
  ollamaEnabled: env.OLLAMA_ENABLED !== 'false',
  ollamaTimeoutMs: Number(env.OLLAMA_TIMEOUT_MS || 25_000),
  codexScope: env.CODEX_SCOPE || 'admins',
  codexModel: env.CODEX_MODEL || '',
  codexTimeoutMs: Number(env.CODEX_TIMEOUT_MS || 60_000),
  pollMs: Number(env.POLL_MS || 1500),
};
if (!['none', 'admins', 'all'].includes(config.codexScope)) {
  console.error('CODEX_SCOPE는 none · admins · all 중 하나입니다.');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const logDir = join(here, 'logs');
mkdirSync(logDir, { recursive: true });

function writeLog(entry) {
  try {
    appendFileSync(join(logDir, logFileName(new Date())), JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.error('로그를 못 씀:', shortError(err));
  }
}
const event = (what, detail) => {
  writeLog({ at: new Date().toISOString(), event: what, detail: detail ?? null });
  console.log(`[${new Date().toLocaleTimeString('ko-KR')}] ${what}${detail ? ' — ' + detail : ''}`);
};

const db = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false } });

// 관리자 목록. 5분마다 새로 읽는다 — 줄마다 묻기엔 잦고, 하루에 한 번은 드물다.
let admins = new Set();
let adminsReadAt = 0;
async function isAdmin(userId) {
  if (Date.now() - adminsReadAt > 5 * 60_000) {
    const { data, error } = await db.from('admins').select('user_id');
    if (!error && data) {
      admins = new Set(data.map((r) => r.user_id));
      adminsReadAt = Date.now();
    }
  }
  return admins.has(userId);
}

async function askOllama(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ollamaTimeoutMs);
  try {
    const res = await fetch(config.ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt,
        stream: false,
        think: false,
        // 일꾼이 도는 동안은 모델을 내려놓지 않는다. 처음 싣는 데 몇 분이 걸린다.
        keep_alive: '24h',
        options: { temperature: 0.4 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const body = await res.json();
    const text = cleanAnswer(body.response ?? '');
    if (!text) throw new Error('Ollama 빈 응답');
    return { text, model: config.ollamaModel };
  } catch (err) {
    if (controller.signal.aborted) throw new Error(`Ollama ${config.ollamaTimeoutMs / 1000}초 넘김`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Codex는 빈 임시 폴더에서, 읽기 전용 상자로 돌린다. 사용자 글은 인자가 아니라
// 표준 입력으로만 넘긴다 — 명령줄에 남의 글이 섞이지 않게.
function askCodex(prompt) {
  return new Promise((resolve, reject) => {
    const dir = mkdtempSync(join(tmpdir(), 'refit-relay-'));
    const args = ['exec', '--skip-git-repo-check', '-s', 'read-only', '-C', dir, '-o', 'answer.txt'];
    if (config.codexModel) args.push('-m', config.codexModel);
    args.push('-');
    const child = spawn('codex', args, { cwd: dir, shell: process.platform === 'win32', windowsHide: true });
    let output = '';
    child.stdout.on('data', (d) => (output = (output + d).slice(-4000)));
    child.stderr.on('data', (d) => (output = (output + d).slice(-4000)));
    const timer = setTimeout(() => child.kill(), config.codexTimeoutMs);
    const finish = (fn) => {
      clearTimeout(timer);
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // 임시 폴더는 남아도 해가 없다.
      }
      fn();
    };
    child.on('error', (err) => finish(() => reject(new Error(`codex를 못 띄움: ${err.message}`))));
    child.on('close', (code) => {
      let text = '';
      try {
        text = cleanAnswer(readFileSync(join(dir, 'answer.txt'), 'utf8'));
      } catch {
        // 아래에서 까닭과 함께 던진다.
      }
      finish(() => {
        if (text) resolve({ text, model: config.codexModel || 'codex' });
        else reject(new Error(`codex 실패 (code ${code}): ${shortError(output.slice(-300))}`));
      });
    });
    child.stdin.end(codexPrompt(prompt), 'utf8');
  });
}

const hands = { ollama: askOllama, codex: askCodex };

async function handle(row) {
  const queuedMs = Date.now() - Date.parse(row.created_at);

  if (isStale(row.created_at, Date.now())) {
    await db.from('model_requests').update({ status: 'expired', finished_at: new Date().toISOString() })
      .eq('id', row.id).eq('status', 'queued');
    writeLog(logEntry({ id: row.id, userId: row.user_id, kind: row.kind, prompt: row.prompt, attempts: [], status: 'expired', queuedMs, at: new Date() }));
    return;
  }

  // 차지한다. 일꾼이 둘 떠 있어도 한 줄을 두 번 하지 않는다.
  const { data: claimed } = await db.from('model_requests')
    .update({ status: 'working', started_at: new Date().toISOString() })
    .eq('id', row.id).eq('status', 'queued').select('id');
  if (!claimed?.length) return;

  const order = providersFor({ isAdmin: await isAdmin(row.user_id), codexScope: config.codexScope, ollamaEnabled: config.ollamaEnabled });
  const attempts = [];
  let result = null;
  let used = null;
  for (const provider of order) {
    const started = Date.now();
    try {
      result = await hands[provider](row.prompt);
      attempts.push({ provider, ok: true, ms: Date.now() - started });
      used = provider;
      break;
    } catch (err) {
      attempts.push({ provider, ok: false, ms: Date.now() - started, error: shortError(err) });
    }
  }

  const finished_at = new Date().toISOString();
  const status = result ? 'done' : 'failed';
  const error = result ? null : attempts.map((a) => `${a.provider}: ${a.error}`).join(' / ') || '맡을 손이 없음';
  const { error: writeError } = await db.from('model_requests').update({
    status,
    answer: result?.text ?? null,
    provider: used,
    model: result?.model ?? null,
    error,
    finished_at,
  }).eq('id', row.id);

  writeLog(logEntry({
    id: row.id, userId: row.user_id, kind: row.kind, prompt: row.prompt, attempts, status,
    answer: result?.text, provider: used ?? undefined, model: result?.model, queuedMs, at: new Date(),
  }));
  if (writeError) event('답을 DB에 못 적음', `${row.id}: ${shortError(writeError.message)}`);
  const took = attempts.reduce((s, a) => s + a.ms, 0);
  console.log(`[${new Date().toLocaleTimeString('ko-KR')}] ${row.kind} ${status} ${used ?? '-'} ${(took / 1000).toFixed(1)}초`);
}

// 일꾼이 일하다 꺼졌으면 「작업 중」으로 남은 줄이 있다. 폰은 이미 포기했으니 닫는다.
async function closeOrphans() {
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await db.from('model_requests')
    .update({ status: 'failed', error: '일꾼이 도중에 꺼짐', finished_at: new Date().toISOString() })
    .eq('status', 'working').lt('started_at', cutoff).select('id');
  if (data?.length) event('끊긴 줄을 닫음', `${data.length}건`);
}

let running = true;
process.on('SIGINT', () => {
  running = false;
  event('멈춤 요청');
});

async function main() {
  event('일꾼 시작', `ollama=${config.ollamaEnabled ? config.ollamaModel : '끔'} codex=${config.codexScope}`);
  await closeOrphans();
  if (config.ollamaEnabled) askOllama('.').catch((err) => event('Ollama 예열 실패', shortError(err)));

  let quietErrors = 0;
  while (running) {
    try {
      const { data, error } = await db.from('model_requests')
        .select('id, user_id, kind, prompt, created_at')
        .eq('status', 'queued').order('created_at').limit(5);
      if (error) throw new Error(error.message);
      quietErrors = 0;
      for (const row of data ?? []) {
        if (!running) break;
        await handle(row);
      }
      if (!data?.length) await new Promise((r) => setTimeout(r, config.pollMs));
    } catch (err) {
      // 인터넷이 끊겨도 일꾼은 죽지 않는다. 같은 오류를 1초마다 적지 않게 점점 늦춘다.
      quietErrors++;
      if (quietErrors <= 3 || quietErrors % 20 === 0) event('줄을 못 읽음', shortError(err));
      await new Promise((r) => setTimeout(r, Math.min(config.pollMs * quietErrors, 30_000)));
    }
  }
  event('일꾼 멈춤');
}

main();
