import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GARMENTS,
  garmentById,
  layersOf,
  LAYER_ORDER,
  outfitCharm,
  outfitProgress,
  takingOff,
  wearing,
} from './outfit.ts';

test('an empty wardrobe leaves her in her gym clothes', () => {
  assert.deepEqual(layersOf([]), []);
  assert.equal(outfitCharm([]), 0);
});

test('layers come back back-to-front', () => {
  // One from every slot that has a garment, deliberately out of order going
  // in. Slots still waiting on art are skipped rather than faked.
  const worn = ['bouquet', 'blouse', 'ribbon', 'necklace', 'skirt_blue'];
  const slots = layersOf(worn).map((g) => g.slot);
  const filled = LAYER_ORDER.filter((slot) => slots.includes(slot));
  assert.deepEqual(slots, filled);
  assert.equal(slots.length, worn.length, 'a garment went missing');
});

test('a second skirt replaces the first rather than joining it', () => {
  const worn = wearing(wearing([], garmentById('skirt_blue')!), garmentById('skirt_orange')!);
  assert.deepEqual(worn, ['skirt_orange']);
  assert.equal(layersOf(worn).filter((g) => g.slot === 'bottom').length, 1);
});

test('the gown hides what would fight with it', () => {
  const worn = ['blouse', 'skirt_blue', 'trousers_orange', 'ribbon', 'bouquet', 'gown'];
  const shown = layersOf(worn).map((g) => g.id);
  assert.deepEqual([...shown].sort(), ['bouquet', 'gown', 'ribbon'].sort());
  assert.ok(!shown.includes('skirt_blue'), 'no skirt pokes out from under the gown');
  assert.ok(shown.includes('bouquet'), 'she can still carry flowers');
  assert.ok(shown.includes('ribbon'), 'a gown is not a reason to take a ribbon out');
});

test('a hidden garment stops counting toward charm', () => {
  const dressed = outfitCharm(['blouse', 'skirt_blue', 'gown']);
  assert.equal(dressed, garmentById('gown')!.charm);
});

test('taking something off leaves the rest alone', () => {
  assert.deepEqual(takingOff(['blouse', 'skirt_blue'], 'blouse'), ['skirt_blue']);
});

test('every garment is distinct, priced, and placed', () => {
  assert.equal(new Set(GARMENTS.map((g) => g.id)).size, GARMENTS.length);
  for (const g of GARMENTS) {
    assert.ok(g.price > 0, g.id);
    assert.ok(g.fit.w > 0 && g.fit.x + g.fit.w <= 1.001, `${g.id} fits the doll`);
    assert.ok(g.fit.y >= 0 && g.fit.y < 1, g.id);
  }
});

test('progress finishes only when every piece is owned', () => {
  assert.equal(outfitProgress([]).count, 0);
  const done = outfitProgress(GARMENTS.map((g) => g.id));
  assert.equal(done.complete, true);
  assert.equal(done.ratio, 1);
});
