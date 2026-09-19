/**
 * Which exercises you actually use.
 *
 * A picker of sixty-seven movements sorted by name asks you to remember what
 * yours are called. Most sessions reuse a handful, so those should be at the
 * top — by how recently for one list, by how often for another.
 */

export type Usage = { count: number; lastOn: string };

export type UsageMap = Map<string, Usage>;

export type Sort = 'all' | 'favourite' | 'recent' | 'often';

export const SORT_NAME: Record<Sort, string> = {
  all: '전체',
  favourite: '즐겨찾기',
  recent: '최근',
  often: '자주',
};

/**
 * Order a list for the chosen sort. 'all' keeps the caller's order — usually
 * alphabetical — because a list that reshuffles itself is hard to scan twice.
 */
export function sortByUsage<T extends { id: string; name: string; favourite?: boolean }>(
  items: T[],
  usage: UsageMap,
  sort: Sort
): T[] {
  if (sort === 'all') return items;

  // Starred is a choice, not a measurement: it keeps the caller's order rather
  // than ranking, so the list you curated stays the list you curated.
  if (sort === 'favourite') return items.filter((e) => e.favourite);

  const used = items.filter((e) => usage.has(e.id));
  if (sort === 'recent') {
    return [...used].sort((a, b) => {
      const byDay = usage.get(b.id)!.lastOn.localeCompare(usage.get(a.id)!.lastOn);
      return byDay !== 0 ? byDay : a.name.localeCompare(b.name);
    });
  }
  return [...used].sort((a, b) => {
    const byCount = usage.get(b.id)!.count - usage.get(a.id)!.count;
    return byCount !== 0 ? byCount : a.name.localeCompare(b.name);
  });
}

