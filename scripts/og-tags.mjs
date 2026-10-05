#!/usr/bin/env node
// Writes the link-preview tags into the exported page.
//
//   node scripts/og-tags.mjs dist/index.html https://destory1984.github.io/princess-fit
//
// A messenger that is sent the address reads the HTML and nothing else: it does
// not run the app, so tags added from app/_layout.tsx as the app starts are never
// seen. The single-page export has one HTML file and this puts the tags in it.
// The address has to be whole (og:image does not take a relative path), which is
// why it is passed in rather than read from the base path.
import { readFileSync, writeFileSync } from 'node:fs';

const [file, site] = process.argv.slice(2);
if (!file || !site) {
  console.error('usage: og-tags.mjs <index.html> <site address without a trailing slash>');
  process.exit(2);
}

const TITLE = '프린세스 핏';
const WORDS = '운동을 기록하면 아이가 자라요. 번 골드로 먹이고, 입히고, 가르치고, 방을 꾸며요.';

const tags = [
  ['property', 'og:type', 'website'],
  ['property', 'og:site_name', TITLE],
  ['property', 'og:title', TITLE],
  ['property', 'og:description', WORDS],
  ['property', 'og:url', `${site}/`],
  ['property', 'og:image', `${site}/og.jpg`],
  ['property', 'og:image:width', '1200'],
  ['property', 'og:image:height', '630'],
  ['name', 'twitter:card', 'summary_large_image'],
  ['name', 'description', WORDS],
]
  .map(([key, name, content]) => `<meta ${key}="${name}" content="${content}">`)
  .join('');

const html = readFileSync(file, 'utf8');
if (html.includes('og:image')) process.exit(0);
if (!html.includes('</head>')) {
  console.error(`${file}: no </head> to put the tags before`);
  process.exit(1);
}
writeFileSync(file, html.replace('</head>', `${tags}</head>`));
console.log(`${file}: link preview tags added`);
