import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLoginScreen = segments[0] === 'login';
    if (!session && !onLoginScreen) router.replace('/login');
    if (session && onLoginScreen) router.replace('/');
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>

    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.chrome },
        headerTintColor: colors.chromeText,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        // The web header has no back affordance of its own, and a screen opened
        // straight from a URL has nothing to go back to — send those home.
        headerLeft: () => (
          <Pressable
            hitSlop={10}
            style={{ paddingRight: 12, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <Ionicons name="chevron-back" size={24} color={colors.chromeText} />
          </Pressable>
        ),
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="workout/[id]" options={{ title: '운동 기록' }} />
      <Stack.Screen name="routine/[id]" options={{ title: '루틴' }} />
      <Stack.Screen name="achievements" options={{ title: '수련부' }} />
      <Stack.Screen name="exercise/[id]" options={{ title: '운동 종목' }} />
      <Stack.Screen name="summary/[id]" options={{ title: '오늘의 기록' }} />
      <Stack.Screen name="settings/advisor" options={{ title: '함께할 사람' }} />
      <Stack.Screen name="settings/exercises" options={{ title: '운동 종목' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
