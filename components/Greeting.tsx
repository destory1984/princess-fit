import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Advisor } from "@/components/Advisor";
import { PaperDoll } from "@/components/PaperDoll";
import { colors, paper, radius, spacing } from "@/lib/theme";
import { useGirl } from '@/lib/girl';

const ROOM = require("../assets/room.png");

type Props = {
  /** Her face for this line, when the caller knows her mood. Her everyday one otherwise. */
  portrait?: number;
  /** What she has on. */
  worn: string[];
  /** What she says — the exact line that was tapped. */
  line: string;
  onDone: () => void;
};

/**
 * Her, full height, saying the thing that was tapped.
 *
 * No new art: the same doll the room draws, over the same room, at a size that
 * fills a phone. She breathes rather than posing — a greeting wave would mean
 * drawing her again, and drift costs nothing.
 */
export function Greeting({ worn, line, portrait, onDone }: Props) {
  const girl = useGirl();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const height = stage.height * 0.96;

  return (
    <View style={styles.screen}>
      <View
        style={styles.stage}
        onLayout={(e) => setStage(e.nativeEvent.layout)}
      >
        <Image source={ROOM} style={styles.room} resizeMode="cover" />
        <View style={styles.wash} />

        {stage.height > 0 && (
          <PaperDoll
            worn={worn}
            idle
            style={{ height, width: height * (1086 / 1448) }}
          />
        )}
      </View>

      <Advisor name={girl.name} portrait={portrait ?? girl.base}>
        {line}
      </Advisor>

      <Pressable style={styles.button} onPress={onDone}>
        <Text style={styles.buttonText}>오늘도 운동하러 가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stage: {
    flex: 1,
    backgroundColor: paper.bgAlt,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  room: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  wash: {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: paper.bg,
    opacity: 0.25,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
