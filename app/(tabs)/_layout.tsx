import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors, HEADER_HEIGHT } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.chrome, height: HEADER_HEIGHT },
        headerTintColor: colors.chromeText,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.chrome,
          borderTopColor: colors.gold,
          borderTopWidth: 2,
          paddingTop: 6,
          paddingBottom: 6,
          // Tall enough for icon plus a Korean label with its descenders.
          height: 70,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.chromeDim,
        // Six tabs share the bar, so the labels sit tighter than before.
        tabBarLabelStyle: { fontSize: 12, lineHeight: 17 },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarAllowFontScaling: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
          // The bar says 집, the tab says 오늘. The screen is her room, and
          // 「오늘」 above a plaque already reading 「9월 20일」 got asked about
          // rather than read. Taking the bar away entirely left the room
          // sitting oddly against the top of the screen, so it stayed.
          headerTitle: '집',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: '루틴',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: '상점',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '기록',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '통계',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
