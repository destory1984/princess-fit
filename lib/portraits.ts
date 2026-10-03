import { girlArt } from './outfitArt';
import { DEFAULT_ADVISOR_ID } from './advisors';

/**
 * Roster portraits for the picker: the same dot girl the doll draws, whole.
 *
 * These used to be separate full-body illustrations in the girls' own outfits
 * (`assets/advisors/`). The picker showing one girl and the room another is the
 * mismatch the dots were ordered to end, so both now come from one drawing. The
 * three not-yet-playable girls have only the old illustrations and no entry.
 */
export function portraitOf(advisorId: string): number {
  try {
    return girlArt(advisorId).whole;
  } catch {
    return girlArt(DEFAULT_ADVISOR_ID).whole;
  }
}
