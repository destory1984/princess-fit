import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Greeting } from '@/components/Greeting';
import { getBond, getLedger, listWorkoutFacts } from '@/lib/db';
import { messageFor, moodOf } from '@/lib/economy';
import { faceArt } from '@/lib/outfitArt';
import { useGirl } from '@/lib/girl';
import { adorned } from '@/lib/shop';

/**
 * Where a tapped message lands. The line travels on the notification so she
 * repeats the exact sentence that was tapped; without one — opened by hand —
 * she falls back to how she is doing today.
 */
export default function GreetingScreen() {
  const { line } = useLocalSearchParams<{ line?: string }>();
  const router = useRouter();
  const girl = useGirl();
  const [worn, setWorn] = useState<string[]>([]);
  const [spoken, setSpoken] = useState(line ?? '');
  const [portrait, setPortrait] = useState<number | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      // The bond is how she speaks at this stage. Without it she speaks as at
      // the first, which is what this screen always did until 2026-10-04.
      Promise.all([getLedger(), listWorkoutFacts(), getBond(girl.id).catch(() => null)])
        .then(([ledger, facts, bond]) => {
          if (!alive) return;
          setWorn(adorned(ledger.worn, ledger.wardrobe));
          // A tapped message was written yesterday, in a mood nobody kept; only
          // the line she makes up now has a face that is known to go with it.
          if (!line) {
            const mood = moodOf(ledger.house, facts);
            setSpoken(messageFor(mood, new Date(), bond?.stage ?? 'new', girl.id));
            setPortrait(faceArt(girl.id, mood));
          }
        })
        .catch(() => {
          // She still shows up; only the outfit and the fallback line are lost.
        });
      return () => {
        alive = false;
      };
    }, [line, girl.id])
  );

  return (
    <Greeting worn={worn} line={spoken || '왔어요?'} portrait={portrait} onDone={() => router.replace('/')} />
  );
}
