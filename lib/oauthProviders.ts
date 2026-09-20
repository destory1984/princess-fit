/**
 * Which sign-in doors this build offers.
 *
 * Kept apart from the signing-in itself so the list can be read under plain
 * node — the other half imports react-native, which a test runner cannot
 * load, and the default being empty is the part most worth a test.
 */

export type Provider = 'google' | 'apple';

export const PROVIDER_LABEL: Record<Provider, string> = {
  google: 'Google로 계속하기',
  apple: 'Apple로 계속하기',
};

const KNOWN: Provider[] = ['google', 'apple'];

/** Which providers this build offers, in the order they were listed. */
export function enabledProviders(): Provider[] {
  const raw = process.env.EXPO_PUBLIC_OAUTH_PROVIDERS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Provider => (KNOWN as string[]).includes(s));
}

