import { Platform } from 'react-native';
import { DEFAULT_BELL, type BellKind } from './bellKind';

/**
 * The end of a rest, on the web.
 *
 * On a phone the bell is a notification booked with the system (lib/notify.ts),
 * which rings with the app shut. A browser has no such thing, so the web app
 * said nothing at all when a rest ran out — and the person it is for is
 * looking at a barbell, not at the countdown. This rings while the page is open,
 * which is the most a page can do.
 *
 * Two short tones, made here rather than loaded: no file to fetch, nothing to
 * fail on a gym's signal.
 */

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function context(): Ctx | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const Make = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Make) return null;
  ctx ??= new Make();
  return ctx;
}

/**
 * Call from a press. A browser lets a page make sound only after the person
 * has touched it, and on iOS only a context woken inside a touch stays awake —
 * so the rest's own start (finishing a set, pressing the rest bar) wakes it for
 * the ring that comes a minute later.
 */
export function wakeBell() {
  try {
    const audio = context();
    if (audio?.state === 'suspended') void audio.resume();
  } catch {
    // No sound is the same as before this existed.
  }
}

/** Tones as [seconds from now, pitch], each a quick swell and a tail. */
function play(
  tones: readonly (readonly [number, number])[],
  loudness: number,
  tail: number,
  wave: OscillatorType = 'sine',
) {
  try {
    const audio = context();
    if (!audio || audio.state !== 'running') return;
    const at = audio.currentTime;
    for (const [start, pitch] of tones) {
      const tone = audio.createOscillator();
      const loud = audio.createGain();
      tone.type = wave;
      tone.frequency.value = pitch;
      // A quick swell and a tail, so it reads as a bell and not a buzzer.
      loud.gain.setValueAtTime(0.0001, at + start);
      loud.gain.exponentialRampToValueAtTime(loudness, at + start + 0.02);
      loud.gain.exponentialRampToValueAtTime(0.0001, at + start + tail);
      tone.connect(loud).connect(audio.destination);
      tone.start(at + start);
      tone.stop(at + start + tail + 0.05);
    }
  } catch {
    // No sound is the same as before this existed.
  }
}

/** The same few notes again, `every` seconds apart. */
function repeated(notes: readonly (readonly [number, number])[], times: number, every: number) {
  return Array.from({ length: times }, (_, n) =>
    notes.map(([start, pitch]) => [start + n * every, pitch] as const),
  ).flat();
}

/**
 * Ring. Does nothing off the web, or where sound is not allowed.
 *
 * Three bells (lib/bellKind.ts). The soft one is the first that was made: two
 * sine notes, which a quiet room hears and a gym does not. The other two are
 * louder, last longer and say it more than once, and they are not sine waves:
 * a triangle or a square has overtones, and overtones are what a phone's small
 * speaker can actually put out.
 */
export function ringBell(kind: BellKind = DEFAULT_BELL) {
  if (kind === 'soft') {
    play([[0, 880], [0.22, 1175]], 0.25, 0.45);
  } else if (kind === 'loud') {
    play(repeated([[0, 1480], [0.16, 1480], [0.32, 1976]], 3, 0.75), 0.5, 0.14, 'square');
  } else {
    play(repeated([[0, 880], [0.2, 1175], [0.4, 1568]], 2, 0.95), 0.6, 0.55, 'triangle');
  }
}

/**
 * The warning that a rest is nearly over (lib/restWarning.ts). One low, short
 * note, quieter than the bell and below it in pitch, so the two cannot be
 * mistaken for each other: this one says 「get ready」, the bell says 「go」.
 * With the soft bell it stays as quiet as that bell is.
 */
export function ringSoon(kind: BellKind = DEFAULT_BELL) {
  if (kind === 'soft') play([[0, 587]], 0.14, 0.2);
  else play([[0, 587], [0.18, 587]], 0.35, 0.2, 'triangle');
}
