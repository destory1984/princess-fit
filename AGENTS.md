# Read NOTES.md first

`NOTES.md` holds the decisions that are already settled and the things that
were tried and thrown away, with the reason for each. Everything in it cost
something to learn and none of it is visible in the code that came out the
other side — so reading it first is how you avoid paying twice.

Add to it as you go. A decision that took an argument to reach, or an attempt
that failed for a reason worth remembering, belongs there before the session
ends.

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Checks

```bash
node --test lib/*.test.ts
npx tsc --noEmit
npx eslint .
```

A 200 from the dev server means the bundle builds, not that the app runs.
Open a **fresh** browser tab and read the console — an old tab keeps showing
the error you already fixed.
