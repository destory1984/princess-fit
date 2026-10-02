import { useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationRouter } from "@/components/NotificationRouter";
import { askDirect, setModelTransport } from "@/lib/advice";
import { AuthProvider, useAuth } from "@/lib/auth";
import { GirlProvider } from "@/lib/girl";
import { listRoutines } from "@/lib/db";
import { getOnboardedAt, markOnboarded } from "@/lib/prefs";
import { askRelay, relayThenDirect, supabaseRelayStore } from "@/lib/relay";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

/*
  Every question to a model goes through the relay from here on: a row in
  Supabase, answered by the worker on the PC (docs/relay.md). Set at module
  load, before any screen can ask.

  While the worker is not running — and on a database where relay.sql has not
  been run at all — nothing changes: the question goes straight to Ollama as
  it always did, without waiting.
*/
setModelTransport(
  relayThenDirect(
    (kind, prompt, signal) => askRelay(supabaseRelayStore(supabase), kind, prompt, { signal }),
    askDirect,
  ),
);

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    // Both are doors, not rooms: the gate must let a signed-out person reach
    // them or forgetting a password is the end of the account.
    const onLoginScreen = segments[0] === "login" || segments[0] === "reset";
    const onOnboarding = segments[0] === "onboarding";
    // The development bench needs no account: it renders components against
    // made-up data, and sending it to the login screen would defeat it.
    const onPreview = __DEV__ && segments[0] === "preview";

    if (!session && !onLoginScreen && !onPreview) {
      router.replace("/login");
      return;
    }
    // Only the login screen sends a signed-in person away. Finishing a reset
    // signs them in, and bouncing them out of it mid-flow would look like the
    // new password did not take.
    if (session && segments[0] === "login") {
      router.replace("/");
      return;
    }
    if (!session || onOnboarding || onPreview) return;

    // She introduces herself before the empty room does. The flag is read here
    // rather than held in state on purpose: the greeting writes it on its way
    // out, and state read at mount would still say "not yet" at the moment it
    // lands home — sending it straight back into the greeting it just left.
    //
    // A missing flag is not the same as a newcomer. Anyone using the app
    // before the greeting existed has no flag either, and sending them to a
    // screen that looks at their routines and immediately bounces them home
    // is a visible round trip on launch — reported as a screen that "1초 정도
    // 보였다가 그냥 없어지고, 홈 화면으로" goes. So the account is asked here,
    // and the flag backfilled, without anyone being sent anywhere.
    let alive = true;
    (async () => {
      if ((await getOnboardedAt()) !== null) return;
      try {
        if ((await listRoutines()).length > 0) {
          await markOnboarded();
          return;
        }
      } catch {
        // Unreachable is not the same as new: better to greet them next
        // launch than to greet a stranger who is not one.
        return;
      }
      if (alive) router.replace("/onboarding");
    })();
    return () => {
      alive = false;
    };
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      {session && Platform.OS !== "web" && <NotificationRouter />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.chrome },
          headerTintColor: colors.chromeText,
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          // The web header has no back affordance of its own, and a screen opened
          // straight from a URL has nothing to go back to — send those home.
          headerLeft: () => (
            <Pressable
              hitSlop={10}
              style={{
                paddingRight: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.chromeText}
              />
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: "운동 기록" }} />
        <Stack.Screen name="routine/[id]" options={{ title: "루틴" }} />
        <Stack.Screen
          name="routine/presets"
          options={{ title: "짜여 있는 루틴" }}
        />
        <Stack.Screen name="achievements" options={{ title: "품계와 업적" }} />
        <Stack.Screen name="memories" options={{ title: "함께한 날들" }} />
        <Stack.Screen name="festival" options={{ title: "축제" }} />
        <Stack.Screen name="exercise/[id]" options={{ title: "운동 종목" }} />
        <Stack.Screen name="summary/[id]" options={{ title: "오늘의 기록" }} />
        <Stack.Screen name="greeting" options={{ title: "" }} />
        <Stack.Screen name="body" options={{ title: "신체 기록" }} />
        <Stack.Screen name="friends" options={{ title: "친구" }} />
        <Stack.Screen name="friend/[id]" options={{ title: "친구의 방" }} />
        <Stack.Screen name="sleep" options={{ title: "수면 기록" }} />
        <Stack.Screen name="recovery" options={{ title: "회복" }} />
        <Stack.Screen name="photos" options={{ title: "사진 기록" }} />
        <Stack.Screen name="onerm" options={{ title: "1RM 계산기" }} />
        <Stack.Screen name="settings/girl" options={{ title: "함께 지낼 아이" }} />
        <Stack.Screen name="settings/plan" options={{ title: "내 운동 계획" }} />
        <Stack.Screen name="reset" options={{ headerShown: false }} />
        <Stack.Screen name="settings/backup" options={{ title: "기록 백업" }} />
        <Stack.Screen name="settings/requests" options={{ title: "운동 넣어달라고 하기" }} />
        <Stack.Screen name="preview" options={{ title: "미리보기" }} />
        <Stack.Screen
          name="settings/exercises"
          options={{ title: "운동 종목" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GirlProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </GirlProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
