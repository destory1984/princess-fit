import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Advisor } from '@/components/Advisor';
import { PaperDoll } from '@/components/PaperDoll';
import { getLedger } from '@/lib/db';
import { messageFor, moodOf } from '@/lib/economy';
import { GIRL_NAME } from '@/lib/girl';
import { BASE_GIRL } from '@/lib/outfitArt';
import { listWorkoutFacts } from '@/lib/db';
import { colors, paper, radius, spacing } from '@/lib/theme';

/**
 * Where a tapped notification lands: her, full height, in what she is wearing,
 * saying the thing that was sent.
 *
 * No new art — the doll the room already draws, at a size that fills a phone.
 * The line comes in as a parameter so what the notification said and what she
 * says here are the same sentence; without one she falls back to her mood.
 */
export default function GreetingScreen() {
  const { line } = useLocalSearchParams<{ line?: string }>();
  const router = useRouter();
  const [worn, setWorn] = useState<string[]>([]);
  const [spoken, setSpoken] = useState(line ?? '');
  // Percentage sizing loses to the art's intrinsic size, as it has three times
  // over now; measure the stage and give the doll real pixels.
  const [stage, setStage] = useState({ width: 0, height: 0 });

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
    <View style={styles.screen}>
      <View style={styles.stage} onLayout={(e) => setStage(e.nativeEvent.layout)}>
        {stage.height > 0 && (
          <PaperDoll
            worn={worn}
            style={{
              height: stage.height * 0.94,
              width: stage.height * 0.94 * (1086 / 1448),
            }}
          />
        )}
      </View>

      <View style={styles.speech}>
        <Advisor name={GIRL_NAME} portrait={BASE_GIRL.source}>
          {spoken || '왔어요?'}
        </Advisor>
      </View>

      <Pressable style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>오늘도 운동하러 가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md },
  stage: {
    flex: 1,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  speech: { marginTop: spacing.xs },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
