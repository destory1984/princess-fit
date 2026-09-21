# Devin brief — admin user list: search and paging

Read `NOTES.md` and `AGENTS.md` first.

## Done means

1. `public/adminList.js`: implement `filterUsers` and `pageOf` so that
   `node --test lib/adminList.test.ts` passes. Do not change the tests; if one
   looks wrong, say so instead.
2. `public/admin.html`, users tab (`usersView`):
   - import both from `./adminList.js`
   - a search box above the list; typing filters by email and goes back to
     page 1; the box keeps its text and focus across re-renders
   - 20 rows per page, 「이전 / 3 / 5 / 다음」 under the list, buttons disabled
     at the ends; show 「N명 중 M명」 when a search is on
   - fetch `admin_users()` once per visit to the tab, not on every keystroke
     or page change (keep the rows in a variable like `opened`)
   - no SQL change
3. `node --test lib/*.test.ts`, `npx tsc --noEmit`, `npx eslint .` all clean.
4. One commit, message says why, not what.
