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
