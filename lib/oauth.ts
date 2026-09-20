import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { Provider } from './oauthProviders';

export { enabledProviders, PROVIDER_LABEL, type Provider } from './oauthProviders';

/**
 * Signing in with somebody else's account.
 *
 * Off unless asked for. `EXPO_PUBLIC_OAUTH_PROVIDERS` lists what to offer and
 * is empty by default, so the login screen looks exactly as it did and none
 * of this runs — which is the point: it is here so that turning it on later
 * is one line rather than a week.
 *
 * The web half works today and can be tested today. The phone half cannot:
 * Supabase's own guidance for React Native is the native Google library, and
 * that is a native module — it needs a development build, and installing it
 * into a project that runs in Expo Go can stop Expo Go opening the app at
 * all. So it is not installed, and the phone says so plainly rather than
 * failing in a way nobody can read.
 *
 * One thing to settle before this is ever switched on: Supabase treats the
 * same person arriving by two different doors as two accounts unless identity
 * linking is enabled. Every record in Refit hangs off auth.uid(), so a second
 * account is an empty year. That is the exact shape of 「재로그인 후 루틴 다
 * 날아감」 in the reviews this app was measured against, and it is a setting,
 * not a feature — worth checking before the first person signs in, not after.
 */

/**
 * Hand off to the provider.
 *
 * Returns a message when it cannot, rather than throwing: not being able to
 * do this is an ordinary state on a phone right now, not a fault.
 */
export async function signInWith(provider: Provider): Promise<string | null> {
  if (Platform.OS !== 'web') {
    return (
      'Google·Apple 로그인은 개발 빌드에서만 돼요.\n\n' +
      '@react-native-google-signin/google-signin 을 설치하고 개발 빌드를 만든 뒤에 쓸 수 있어요.'
    );
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  return error ? error.message : null;
}
