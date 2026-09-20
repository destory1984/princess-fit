import type { Photo } from './photos';

/**
 * The web half of the photo store.
 *
 * Photos are a phone feature on purpose — they live in the phone's own
 * storage and nowhere else — so on the web there is nothing to read and
 * nothing to write. Saying so plainly beats importing native modules that
 * throw the moment they are required.
 */

const ONLY_ON_A_PHONE = '사진은 폰에서만 남길 수 있어요.';

export async function listPhotos(): Promise<Photo[]> {
  return [];
}

export async function addPhoto(): Promise<Photo | null> {
  throw new Error(ONLY_ON_A_PHONE);
}

export async function removePhoto(): Promise<void> {
  throw new Error(ONLY_ON_A_PHONE);
}

export async function setPhotoNote(): Promise<void> {
  throw new Error(ONLY_ON_A_PHONE);
}

export async function exportPhoto(): Promise<void> {
  throw new Error(ONLY_ON_A_PHONE);
}
