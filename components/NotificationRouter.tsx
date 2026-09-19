import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

/**
 * Sends a tapped message to her greeting.
 *
 * This lives in its own component because `useLastNotificationResponse` throws
 * on web, where there is no notification service at all. Mounting it only on a
 * phone keeps the hook out of the web build entirely, rather than calling it
 * conditionally inside a screen.
 */
export function NotificationRouter() {
  const router = useRouter();
  const tapped = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!tapped) return;
    // The line travels with the message so the screen repeats the very
    // sentence that was tapped, rather than guessing at her mood again.
    const line = tapped.notification.request.content.data?.line;
    router.push({
      pathname: '/greeting',
      params: typeof line === 'string' ? { line } : {},
    });
  }, [tapped, router]);

  return null;
}
