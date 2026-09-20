/**
 * Draw the rug, rather than asking somebody else for it.
 *
 * The one that came back from a design tool was drawn from too high an angle
 * to lie on this floor — 「나르는 양탄자야?」 — and every attempt to fix it by
 * resizing only made the ellipse more obviously a circle. The angle is the
 * thing that has to change, and here it is a number.
 *
 * Low-poly is geometry, which is why this is possible at all: an ellipse cut
 * into wedges and rings, each cell split into two triangles and filled flat,
 * with a little shade thrown across it so the facets read. No drawing, no
 * gradients, nothing that needs a hand.
 *
 * Writes a PNG with an alpha channel using nothing but zlib, so it runs
 * wherever node does.
 *
 *   node scripts/make-rug.mjs                 # the default rug
 *   node scripts/make-rug.mjs --tilt 0.22     # flatter still
 *   node scripts/make-rug.mjs --out other.png
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

/** How squashed the ellipse is. Lower is a shallower view: more floor, less plan. */
const DEFAULT_TILT = 0.3;

/*
  The room's palette, read off its own art: cream, dusty rose, sage, honey.
  Bands run from the middle outwards, and the last one is the bound edge.
*/
const BANDS = [
  { to: 0.18, rgb: [246, 238, 222] },
  { to: 0.42, rgb: [214, 160, 162] },
  { to: 0.62, rgb: [240, 229, 208] },
  { to: 0.86, rgb: [166, 190, 160] },
  // A bound edge, not a tray: narrow, and closer to the floor than to gold.
  { to: 1.0, rgb: [214, 170, 112] },
];

/*
  Few enough to see.

  Forty wedges drew a smooth ellipse with faint streaks on it — technically
  faceted and not low-poly to look at. The count has to be low enough that the
  outline is visibly a polygon and each face is a shape you could point at.
*/
const WEDGES = 22;
const RINGS = 5;

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : args[at + 1];
};

const tilt = Number(argOf('--tilt', DEFAULT_TILT));
const width = Number(argOf('--width', 1600));
const out = argOf('--out', 'assets/room/rug.png');
const SS = 3; // supersampling, because a faceted edge without it is a staircase

if (!(tilt > 0.05 && tilt <= 1)) {
  console.error('--tilt must be between 0.05 and 1');
  process.exit(2);
}

const rx = width * 0.47;
const ry = rx * tilt;
// Room for the bound edge's thickness underneath, and a little air around it.
const lip = Math.round(ry * 0.14);
const height = Math.round(ry * 2 + lip + width * 0.04);
const cx = width / 2;
const cy = (height - lip) / 2;

/*
  A repeatable jitter.

  Math.random would give a different rug every run, which makes the file
  churn in git for no reason and makes 「the same command」 a lie.
*/
function noise(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const shade = (rgb, k) => rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * k))));

/** Which band a point at this distance from the middle belongs to. */
function bandAt(r) {
  for (let i = 0; i < BANDS.length; i += 1) if (r <= BANDS[i].to) return i;
  return BANDS.length - 1;
}

/*
  The colour of one facet.

  Lit from the upper left, so the far side of the rug is a touch darker and
  the near side catches the light — the same direction the room is lit from.
  The jitter on top is what stops a band looking like one flat disc.
*/
function facetColour(ring, wedge, half) {
  const mid = (ring + 0.5) / RINGS;
  const band = BANDS[bandAt(mid)];
  const angle = ((wedge + 0.5) / WEDGES) * Math.PI * 2;
  const light = 1 + 0.1 * Math.cos(angle - Math.PI * 0.75);
  // The two halves of a cell are what makes it read as triangles rather than
  // as a quilt, so they are told apart more firmly than the jitter tells
  // neighbours apart.
  const split = half ? 1.045 : 0.955;
  const jitter = 0.96 + noise(ring * 97 + wedge * 13 + half * 3) * 0.08;
  return shade(band.rgb, light * jitter * split);
}

/*
  How far the edge reaches at this angle.

  A regular polygon rather than the ellipse itself: an outline that is
  perfectly smooth is the one thing that gives away a low-poly drawing that
  is not one.
*/
const STEP = (Math.PI * 2) / WEDGES;
const APOTHEM = Math.cos(STEP / 2);
function edgeAt(angle) {
  const within = ((angle % STEP) + STEP) % STEP;
  return APOTHEM / Math.cos(within - STEP / 2);
}

/** Small six-petal flowers, scattered through the pale bands. */
const FLOWERS = [];
for (let i = 0; i < 14; i += 1) {
  const ring = i % 2 === 0 ? 0.26 : 0.62;
  const angle = (i / 14) * Math.PI * 2 + noise(i) * 0.4;
  FLOWERS.push({ r: ring + noise(i * 7) * 0.05, angle });
}

const W = width * SS;
const H = height * SS;
const px = new Uint8Array(W * H * 4);

for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const dx = (x / SS - cx) / rx;
    const dy = (y / SS - cy) / ry;
    const r = Math.hypot(dx, dy);
    const at = (y * W + x) * 4;

    /*
      The bound edge has thickness: below the ellipse, the same honey a shade
      darker, so the rug has a side and is lying on something rather than
      printed on the floor.
    */
    let angleRaw = Math.atan2(dy, dx);
    if (angleRaw < 0) angleRaw += Math.PI * 2;
    const edge = edgeAt(angleRaw);

    if (r > edge) {
      const lifted = (y / SS - cy - lip) / ry;
      const rLift = Math.hypot(dx, lifted);
      let liftAngle = Math.atan2(lifted, dx);
      if (liftAngle < 0) liftAngle += Math.PI * 2;
      if (rLift <= edgeAt(liftAngle) && y / SS > cy) {
        const [cr, cg, cb] = shade(BANDS[BANDS.length - 1].rgb, 0.78);
        px[at] = cr;
        px[at + 1] = cg;
        px[at + 2] = cb;
        px[at + 3] = 255;
      }
      continue;
    }

    // Measured against this angle's own edge, so the bands follow the polygon
    // rather than bulging past its corners.
    const t = r / edge;
    const wedgeF = (angleRaw / (Math.PI * 2)) * WEDGES;
    const wedge = Math.min(WEDGES - 1, Math.floor(wedgeF));
    const ringF = t * RINGS;
    const ring = Math.min(RINGS - 1, Math.floor(ringF));
    // Which triangle of this cell the point falls in.
    const half = ringF - ring + (wedgeF - wedge) > 1 ? 1 : 0;
    let [cr, cg, cb] = facetColour(ring, wedge, half);

    // Petals, drawn as a six-lobed blob so they stay faceted rather than round.
    for (const f of FLOWERS) {
      const fx = Math.cos(f.angle) * f.r;
      const fy = Math.sin(f.angle) * f.r;
      const d = Math.hypot(dx - fx, dy - fy);
      if (d < 0.05) {
        const petal = Math.atan2(dy - fy, dx - fx);
        const lobe = 0.032 + 0.022 * Math.abs(Math.cos(petal * 3));
        if (d < lobe) [cr, cg, cb] = d < 0.012 ? [208, 150, 70] : [250, 246, 236];
        else if (d < lobe + 0.012) [cr, cg, cb] = [150, 176, 142];
      }
    }

    px[at] = cr;
    px[at + 1] = cg;
    px[at + 2] = cb;
    px[at + 3] = 255;
  }
}

// Box-downsample the supersampled buffer, averaging colour weighted by alpha
// so the edges fade out to transparent instead of to black.
const outPx = Buffer.alloc(height * (width * 4 + 1));
for (let y = 0; y < height; y += 1) {
  const row = y * (width * 4 + 1);
  outPx[row] = 0; // filter: none
  for (let x = 0; x < width; x += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < SS; sy += 1) {
      for (let sx = 0; sx < SS; sx += 1) {
        const at = ((y * SS + sy) * W + (x * SS + sx)) * 4;
        const alpha = px[at + 3];
        r += px[at] * alpha;
        g += px[at + 1] * alpha;
        b += px[at + 2] * alpha;
        a += alpha;
      }
    }
    const n = SS * SS;
    const at = row + 1 + x * 4;
    outPx[at] = a ? Math.round(r / a) : 0;
    outPx[at + 1] = a ? Math.round(g / a) : 0;
    outPx[at + 2] = a ? Math.round(b / a) : 0;
    outPx[at + 3] = Math.round(a / n);
  }
}

// --- PNG, by hand ---------------------------------------------------------

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // truecolour with alpha
writeFileSync(
  out,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(outPx, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
);

console.log(`${out}  ${width}×${height}  tilt ${tilt}`);
