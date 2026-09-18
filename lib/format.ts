const pad = (n: number) => String(n).padStart(2, '0');

export function localDayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(iso: string, style: 'full' | 'short' = 'full') {
  const d = new Date(iso);
  return style === 'short'
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
