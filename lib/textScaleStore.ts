import { useSyncExternalStore } from 'react';
import { getTextScale, setTextScale } from './prefs';
import { clampTextScale, DEFAULT_TEXT_SCALE } from './textScale';

/**
 * The chosen text size, held where every piece of text can read it.
 *
 * Not a context: text is drawn on every screen and in every sheet, and a value
 * that one module holds reaches all of it without a provider wrapped round the
 * app. Read from the phone once at start; until then it is 100, which is what
 * most people have anyway.
 */
let current = DEFAULT_TEXT_SCALE;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function set(next: number) {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

/** The percentage, re-rendering whoever asks when it changes. */
export function useTextScale() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => DEFAULT_TEXT_SCALE,
  );
}

/** Once, when the app starts. */
export function loadTextScale() {
  void getTextScale().then(set);
}

/** Change it now and remember it. A failed write keeps the size for this run. */
export function changeTextScale(percent: number) {
  const next = clampTextScale(percent);
  set(next);
  setTextScale(next).catch(() => {});
}
