#!/usr/bin/env node
/**
 * Work out where a garment's art belongs on the paper doll.
 *
 *   node scripts/garment-fit.mjs assets/outfit/shoes.png feet
 *   node scripts/garment-fit.mjs assets/outfit/tiara.png head
 *   node scripts/garment-fit.mjs assets/outfit/brooch.png --box 0.42 0.58 0.36
 *
 * Every garment carries a `fit` in `lib/outfit.ts` — where its picture sits
 * over the base, as fractions of the doll's box — because the art is drawn on
 * its own canvas rather than registered to hers. Sharing her canvas *size*
 * does not help: the ribbon did, and overlaid whole it landed on her shoulder.
 *
 * The placement is not a matter of taste, so it should not be done by eye.
 * Both facts it needs are measurable: where the art actually sits inside its
 * own transparent canvas, and where her head, neck, chest and feet are on the
 * base. This measures both and solves for the fit.
 *
 * Eyeballing it took three rounds on the first dress. This takes one, and what
 * is left to judge afterwards is only whether the region was the right one.
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const BASE = 'assets/outfit/base.png';

/**
 * Where things sit in the room, as [x0, x1, top] fractions of the scene.
 *
 * Read off the room art. The scene and the furniture art share the 3:2 of the
 * room painting, so the same solve works here as on the doll — only the field
 * it fills in is called `place` rather than `fit`.
 */
const ROOM = {
  // Measured off the arch in room.png rather than eyeballed: the frame runs
  // 0.456..0.768 and its crown sits at 0.117. The old numbers were wider and
  // higher than the window, which is exactly what 「커튼이 공중에 떠있는
  // 느낌인데」 looks like — a rod hung on the wall beside the glass.
  window: [0.415, 0.765, 0.1],
  wallLeft: [0.06, 0.3, 0.1],
  floorLeft: [0.04, 0.34, 0.66],
  floorRight: [0.62, 0.95, 0.62],
  ceiling: [0.4, 0.62, 0.0],
  // The open floor she stands on, between the bed and the mirror. A rug goes
  // here and nowhere else — floorLeft is the bed's corner and floorRight is
  // where the bookshelf stands.
  // Her feet land near 0.94, so a rug that stops above that is a rug she is
  // standing behind rather than on — 「나르는 양탄자야?」. It has to bracket
  // her feet, not sit between them and the window.
  floorMid: [0.22, 0.82, 0.72],
};

/**
 * Where each region sits on the base, as [x0, x1, top] fractions.
 *
 * Read off a row-by-row scan of the base's alpha — she is a chibi, so the head
 * is most of the upper third and the neck is barely a gap — then narrowed by
 * looking. `--box` overrides these when a piece does not belong to any of them.
 */
const REGIONS = {
  head: [0.55, 0.8, 0.06], // to one side, where a ribbon or clip sits
  crown: [0.34, 0.66, 0.03], // straight on top: a tiara
  neck: [0.425, 0.575, 0.405], // below the chin; the hair silhouette sits far above it
  chest: [0.36, 0.64, 0.4],
  // A top is not a chest. A blouse reaches past the shoulders and starts above
  // the collarbone, and fitting one to `chest` makes it a bib. Recovered by
  // solving backwards from the blouse's own placement, which was eye-fitted
  // long before this script existed and is right.
  shoulders: [0.283, 0.754, 0.409],
  // Waist down, and as wide as the hem actually is. A skirt flares past her
  // hips; trousers do not, so they take a narrower box and come out shorter
  // for it — the two drawings are not the same shape and should not pretend.
  skirt: [0.14, 0.86, 0.5],
  trousers: [0.275, 0.725, 0.53],
  // One garment covering top and bottom at once: a gown starts at the chest
  // and flares to the skirt's width. Neither `chest` nor `skirt` describes it.
  full: [0.152, 0.856, 0.433],
  // Held against her, stems down to where the folded arms meet — not floating
  // flat on her chest, which is what centring it there looked like.
  hand: [0.42, 0.68, 0.44],
  feet: [0.33, 0.67, 0.84],
};

function readPng(path) {
  const d = readFileSync(path);
  let pos = 8;
  let width, height, depth, colour;
  const idat = [];
  while (pos < d.length) {
    const len = d.readUInt32BE(pos);
    const type = d.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = d.readUInt32BE(pos + 8);
      height = d.readUInt32BE(pos + 12);
      depth = d[pos + 16];
      colour = d[pos + 17];
    } else if (type === 'IDAT') {
      idat.push(d.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  return { width, height, depth, colour, raw: inflateSync(Buffer.concat(idat)) };
}

/** Un-filter the scanlines and hand each one's alpha channel to `onRow`. */
function scan(path, onRow) {
  const { width, height, depth, colour, raw } = readPng(path);
  if (depth !== 8 || colour !== 6) {
    throw new Error(`${path}: expected 8-bit RGBA, got depth ${depth} colour type ${colour}`);
  }
  const bpp = 4;
  const stride = width * bpp;
  let prev = Buffer.alloc(stride);
  let at = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[at];
    at += 1;
    const line = Buffer.from(raw.subarray(at, at + stride));
    at += stride;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      if (filter === 1) line[x] = (line[x] + a) & 255;
      else if (filter === 2) line[x] = (line[x] + b) & 255;
      else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    onRow(y, line, width, height);
    prev = line;
  }
  return { width, height };
}

/** The box the visible pixels occupy, as fractions of the canvas. */
function alphaBox(path) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  const { width, height } = scan(path, (y, line, w) => {
    for (let x = 0; x < w; x += 1) {
      // A soft edge is not the garment; 16 skips the antialiasing halo.
      if (line[x * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  });
  if (maxX < 0) throw new Error(`${path}: every pixel is transparent`);
  return [minX / width, minY / height, (maxX + 1) / width, (maxY + 1) / height];
}

/**
 * Solve for the fit.
 *
 * The image is drawn at (W·x, H·y) with width W·w and height W·w/aspect. The
 * doll's box has the same aspect as the art, so the vertical term collapses to
 * the same `w` the horizontal one uses — which is why this is two lines rather
 * than a page.
 */
function solve([bx0, by0, bx1], tx0, tx1, ty0) {
  const w = (tx1 - tx0) / (bx1 - bx0);
  return { x: tx0 - w * bx0, y: ty0 - w * by0, w };
}

const round = (n) => Math.round(n * 1000) / 1000;

function main(argv) {
  const [file, ...rest] = argv;
  if (!file) {
    console.error(
      'usage: garment-fit.mjs <art.png> <region|--box x0 x1 top|--stand x0 x1 bottom> [--room]'
    );
    console.error(`regions: ${Object.keys(REGIONS).join(', ')}`);
    process.exit(2);
  }

  const room = rest.includes('--room');
  const regions = room ? ROOM : REGIONS;

  const art0 = alphaBox(file);

  let target;
  if (rest[0] === '--box') {
    target = rest.slice(1, 4).map(Number);
    if (target.length !== 3 || target.some(Number.isNaN)) {
      console.error('--box needs three numbers: x0 x1 top');
      process.exit(2);
    }
  } else if (rest[0] === '--stand') {
    // Furniture is placed by where it meets the floor, not by where its top
    // happens to fall — a wardrobe hovering two inches up is the kind of thing
    // that looks wrong without anyone being able to say why.
    const [x0, x1, bottom] = rest.slice(1, 4).map(Number);
    if ([x0, x1, bottom].some(Number.isNaN)) {
      console.error('--stand needs three numbers: x0 x1 bottom');
      process.exit(2);
    }
    const w = (x1 - x0) / (art0[2] - art0[0]);
    target = [x0, x1, bottom - w * (art0[3] - art0[1])];
  } else {
    const region = rest[0];
    if (!(region in regions)) {
      console.error(`unknown region ${region}; try one of ${Object.keys(regions).join(', ')}`);
      process.exit(2);
    }
    target = regions[region];
  }

  const art = art0;
  const base = room ? null : alphaBox(BASE);
  const fit = solve(art, ...target);
  const bottom = target[2] + fit.w * (art[3] - art[1]);

  console.log(`art      ${file}`);
  console.log(`  fills  x ${round(art[0])}..${round(art[2])}  y ${round(art[1])}..${round(art[3])} of its canvas`);
  if (base) {
    console.log(`base     x ${round(base[0])}..${round(base[2])}  y ${round(base[1])}..${round(base[3])}`);
  }
  console.log(`target   x ${target[0]}..${target[1]}  from y ${target[2]}`);
  console.log(`  lands  y ${round(target[2])}..${round(bottom)} on the ${room ? 'room' : 'doll'}`);
  console.log('');
  const field = room ? 'place' : 'fit';
  console.log(`    ${field}: { x: ${round(fit.x)}, y: ${round(fit.y)}, w: ${round(fit.w)} },`);

  if (bottom > 1.02) console.log('\n  note: this runs off the bottom of the doll.');
  if (fit.w > 1.2) console.log('\n  note: the art is mostly empty canvas; it will be scaled up a lot.');
}

main(process.argv.slice(2));
