import assert from 'node:assert/strict';
import test from 'node:test';

// Read through a fresh import each time, since the list is read from the
// environment at call time and the default matters as much as any value.
async function providersFor(value: string | undefined) {
  process.env.EXPO_PUBLIC_OAUTH_PROVIDERS = value;
  const { enabledProviders } = await import(`./oauthProviders.ts?v=${Math.random()}`);
  return enabledProviders();
}

test('nothing is offered unless this build asks for it', async () => {
  // The default has to be empty: the login screen should look exactly as it
  // did, and none of this should run, until someone turns it on.
  assert.deepEqual(await providersFor(undefined), []);
  assert.deepEqual(await providersFor(''), []);
  assert.deepEqual(await providersFor('   '), []);
});

test('the listed providers are offered, in the order listed', async () => {
  assert.deepEqual(await providersFor('apple,google'), ['apple', 'google']);
  assert.deepEqual(await providersFor('google'), ['google']);
});

test('spacing and case are forgiven; nonsense is dropped', async () => {
  assert.deepEqual(await providersFor(' Google , APPLE '), ['google', 'apple']);
  // A typo silently offering nothing beats a button that cannot work.
  assert.deepEqual(await providersFor('gogle,facebook'), []);
});
