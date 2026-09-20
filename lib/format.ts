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
