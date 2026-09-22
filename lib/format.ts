const pad = (n: number) => String(n).padStart(2, '0');

export function localDayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 95 → "1분 35초", 1800 → "30분" */
export function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return '0분';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (!m) return `${s}초`;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

export function formatDate(iso: string, style: 'full' | 'short' = 'full') {
  const d = new Date(iso);
  return style === 'short'
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/**
 * A distance, written the way a person would say it.
 *
 * Distances are entered in tenths and then added up, and a tenth is not a
 * number a computer can hold exactly. Roughly one pair of tenths in five comes
 * out long — 1.4000000000000001km — and the app was printing whatever the sum
 * happened to be. From the reviews of the app this is measured against:
 * 「소숫점 너무 많이 나와요」.
 *
 * One decimal place, and no trailing zero: 5km rather than 5.0km, because
 * nobody writing it down by hand would add the zero.
 */
export function formatKm(km: number) {
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * How long ago a day was, in the old counting words — 사흘, 보름, 석 달 —
 * because the app dresses as a page from an old ledger and 「3일 전」 is a
 * phone talking.
 *
 * Counted in calendar days on this phone: yesterday evening is 「어제」 at one
 * in the morning, not 「오늘」 for being five hours ago. Past ten days the old
 * words count in 열흘, 보름 and months, which is as exact as anyone pictures
 * a gap that long anyway.
 */
const DAY_WORDS = ['', '', '이틀', '사흘', '나흘', '닷새', '엿새', '이레', '여드레', '아흐레', '열흘'];
const MONTH_WORDS = ['', '한', '두', '석', '넉', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'];

export function daysAgo(iso: string, now = new Date()) {
  const then = new Date(iso);
  const a = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((b - a) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days <= 10) return `${DAY_WORDS[days]} 전`;
  if (days < 15) return '열흘 남짓 전';
  if (days < 30) return '보름 남짓 전';
  const months = Math.floor(days / 30);
  if (months <= 12) return `${MONTH_WORDS[months]} 달 전`;
  return '해포 전';
}
