import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Greeting } from '@/components/Greeting';
import { getLedger, listWorkoutFacts } from '@/lib/db';
import { messageFor, moodOf } from '@/lib/economy';

/**
 * Where a tapped message lands. The line travels on the notification so she
 * repeats the exact sentence that was tapped; without one — opened by hand —
 * she falls back to how she is doing today.
 */
export default function GreetingScreen() {
  const { line } = useLocalSearchParams<{ line?: string }>();
  const router = useRouter();
  const [worn, setWorn] = useState<string[]>([]);
  const [spoken, setSpoken] = useState(line ?? '');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getLedger(), listWorkoutFacts()])
        .then(([ledger, facts]) => {
          if (!alive) return;
          setWorn(ledger.worn);
          if (!line) setSpoken(messageFor(moodOf(ledger.house, facts), new Date()));
        })
        .catch(() => {
          // She still shows up; only the outfit and the fallback line are lost.
        });
      return () => {
        alive = false;
      };
    }, [line])
  );

  return (
    <Greeting worn={worn} line={spoken || '왔어요?'} onDone={() => router.replace('/')} />
  );
}
