import { localDayKey } from './format.ts';

/**
 * Progress photos, which live only on this phone.
 *
 * They are the most private thing the app holds, so nothing about them goes
 * to the server — not the image, not even the fact that one exists. The cost
 * is that they do not follow you to a new phone, which is why exporting to
 * the camera roll is offered rather than assumed.
 */

export type Photo = {
  id: string;
  /** A file inside the app's own directory, not a camera-roll reference. */
  uri: string;
  takenOn: string;
  /** Front, back, side — whatever the shot is of. */
  note?: string;
};

export type PhotoGroup = { month: string; photos: Photo[] };

export function newPhotoId(now = new Date()) {
  return `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Newest first, which is the order anyone opens this screen wanting. */
export function sortPhotos(photos: Photo[]) {
  return [...photos].sort((a, b) => b.takenOn.localeCompare(a.takenOn) || b.id.localeCompare(a.id));
}

/**
 * Grouped by month, because progress is a monthly thing to look at — a flat
 * grid of ninety photos tells you nothing about when anything changed.
 */
export function byMonth(photos: Photo[]): PhotoGroup[] {
  const groups = new Map<string, Photo[]>();
  for (const photo of sortPhotos(photos)) {
    const month = photo.takenOn.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), photo]);
  }
  return [...groups.entries()].map(([month, list]) => ({ month, photos: list }));
}

/** The oldest and newest, which is the comparison people actually want. */
export function bookends(photos: Photo[]) {
  const sorted = sortPhotos(photos);
  if (sorted.length < 2) return null;
  return { first: sorted[sorted.length - 1], latest: sorted[0] };
}

/** How long the record spans, in days. */
export function spanDays(photos: Photo[], today = new Date()) {
  const sorted = sortPhotos(photos);
  if (sorted.length === 0) return 0;
  const first = new Date(`${sorted[sorted.length - 1].takenOn}T00:00:00`);
  const last = new Date(`${localDayKey(today)}T00:00:00`);
  return Math.max(0, Math.round((last.getTime() - first.getTime()) / 86_400_000));
}
