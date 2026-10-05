import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APP_VERSION } from './version.ts';

const read = (file: string) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));

test('the version is written the same way everywhere it is stated', () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(read('app.json').expo.version, APP_VERSION);
  assert.equal(read('package.json').version, APP_VERSION);
  // Only the app's own two lines of the lock file. Every package that happens
  // to be at the old number has it too, and rewriting those broke the install.
  const lock = read('package-lock.json');
  assert.equal(lock.version, APP_VERSION);
  assert.equal(lock.packages[''].version, APP_VERSION);
});
