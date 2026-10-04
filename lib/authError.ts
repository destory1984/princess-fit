/**
 * What went wrong at the door, in the language the door is written in.
 *
 * Supabase answers a failed sign-in in English — 「Invalid login credentials」
 * under the heading 로그인 실패 — and the first people to meet it are the ones
 * who have not got in yet. Only the handful that someone typing an email and a
 * password can actually cause are rewritten, each with what to do about it.
 * Anything else is shown as it came: an unfamiliar sentence is more use to
 * whoever is asked about it than 「알 수 없는 오류」.
 */
const KNOWN: [RegExp, string][] = [
  [/invalid login credentials/i, '이메일이나 비밀번호가 맞지 않아요. 처음이면 「회원가입」을 눌러 주세요.'],
  [/user already registered/i, '이미 가입한 이메일이에요. 「로그인」을 눌러 주세요.'],
  [/password should be at least (\d+)/i, '비밀번호는 $1자 이상이어야 해요.'],
  [/unable to validate email address|invalid format|email address .* is invalid/i, '이메일 주소를 다시 확인해 주세요.'],
  [/email not confirmed/i, '이메일 인증이 끝나지 않았어요. 메일의 링크를 누른 뒤 다시 로그인해 주세요.'],
  [/signups? not allowed|signup is disabled/i, '지금은 새로 가입할 수 없어요. 만든 사람에게 알려 주세요.'],
  [/rate limit|too many requests|for security purposes/i, '너무 자주 시도했어요. 1분쯤 뒤에 다시 해 주세요.'],
  [/failed to fetch|network request failed|networkerror/i, '서버에 닿지 못했어요. 인터넷을 확인하고 다시 해 주세요.'],
];

export function explainAuth(message: string | null | undefined): string {
  const raw = (message ?? '').trim();
  for (const [pattern, said] of KNOWN) {
    const found = raw.match(pattern);
    if (found) return said.replace('$1', found[1] ?? '');
  }
  return raw || '다시 시도해 주세요.';
}
