import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateWorkoutSet } from './db';
import {
  drain,
  mergedPatch,
  parse,
  queue,
  settle,
  type PendingWrite,
  type SetPatch,
} from './outbox';

/**
 * The queue's life outside a single screen: on disk, and on the wire.
 *
 * Kept apart from `outbox.ts` so the rules can be tested under plain node,
 * where importing storage would be fatal. Everything with a decision in it
 * lives there; this file only remembers and sends.
 */

const KEY = 'refit.outbox';

let cache: PendingWrite[] | null = null;
// One flush at a time. Two would replay the same edits against each other,
// and the loser would put an already-settled write back on the queue.
let flushing: Promise<void> | null = null;

const listeners = new Set<(pending: PendingWrite[]) => void>();

async function read(): Promise<PendingWrite[]> {
  if (cache) return cache;
  try {
    cache = parse(await AsyncStorage.getItem(KEY));
  } catch {
    cache = [];
  }
  return cache;
}

async function write(next: PendingWrite[]) {
  cache = next;
  for (const listener of listeners) listener(next);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // The queue is still in memory, so the session is not lost — only its
    // survival across a restart is, and saying so would not help anyone
    // standing at a rack.
  }
}

/** Watch the queue. Fires immediately with what is already waiting. */
export function watchPending(listener: (pending: PendingWrite[]) => void) {
  listeners.add(listener);
  void read().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Save a set edit, and do not lose it if that fails.
 *
 * Returns whether it landed. The caller uses that to decide what to say — not
 * whether to keep the number, which is kept either way.
 */
export async function saveSet(setId: string, patch: SetPatch): Promise<boolean> {
  const waiting = await read();
  try {
    await updateWorkoutSet(setId, mergedPatch(waiting, setId, patch));
    if (waiting.some((p) => p.setId === setId)) await write(settle(waiting, [setId]));
    return true;
  } catch {
    await write(queue(waiting, setId, patch, new Date().toISOString()));
    return false;
  }
}

/**
 * Try the waiting writes again, oldest first.
 *
 * Stops at the first failure rather than pressing on. A failure here almost
 * always means no signal, and the rest would fail the same way — thirty
 * doomed requests would only spend the battery of someone mid-workout.
 */
export async function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const waiting = await read();
    const left = await drain(waiting, updateWorkoutSet);
    if (left.length !== waiting.length) await write(left);
  })();
  try {
    await flushing;
  } finally {
    flushing = null;
  }
}

/** Only for tests and the dev bench; the app never drops unsent work. */
export async function clearOutbox() {
  await write([]);
}
