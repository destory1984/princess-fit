/*
  Search and paging for the admin user list.

  Lives in public/ rather than lib/ because admin.html is a static page with
  no bundler: it can import a plain .js file next to it, not a .ts one. The
  rules are still tested from lib/adminList.test.ts.

  The whole list comes back from admin_users() in one call and is cut up here.
  Server-side paging is not worth it until there are thousands of people.
*/

/**
 * Keeps the users whose email contains every word of the query, ignoring
 * case and surrounding space. An empty query keeps everyone. A user with no
 * email only matches the empty query. Order is kept.
 *
 * @template {{ email?: string | null }} T
 * @param {T[]} users
 * @param {string} query
 * @returns {T[]}
 */
export function filterUsers(users, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return users.slice();
  return users.filter((u) => {
    const email = (u.email ?? '').toLowerCase();
    return email !== '' && words.every((w) => email.includes(w));
  });
}

/**
 * One page of the list. `page` is 1-based and clamped into range, so a page
 * that no longer exists after a search shows the last one instead of nothing.
 * An empty list is page 1 of 1.
 *
 * @template T
 * @param {T[]} items
 * @param {number} page
 * @param {number} size  rows per page, at least 1
 * @returns {{ rows: T[], page: number, pages: number, total: number }}
 */
export function pageOf(items, page, size) {
  const per = Math.max(1, Math.floor(size));
  const pages = Math.max(1, Math.ceil(items.length / per));
  const at = Math.min(pages, Math.max(1, Math.floor(page) || 1));
  return { rows: items.slice((at - 1) * per, at * per), page: at, pages, total: items.length };
}
