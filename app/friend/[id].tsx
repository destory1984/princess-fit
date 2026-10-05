import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/Text';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { ScreenState } from '@/components/ScreenState';
import { TrainingHall } from '@/components/TrainingHall';
import { getFriendRoom, type FriendRoom } from '@/lib/db';
import { explain } from '@/lib/dbError';
import { displayName } from '@/lib/friends';
import { girlOf } from '@/lib/girl';
import { colors, spacing } from '@/lib/theme';

/**
 * A friend's room, as they have it: their girl, what she has on, what they
 * have bought for her. Her plaque of numbers is left off — a visit is to see
 * the room, not to be measured against it.
 */
export default function FriendRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [room, setRoom] = useState<FriendRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    getFriendRoom(id)
      .then((r) => {
        setRoom(r);
        navigation.setOptions({ title: `${displayName(r.name)}의 방` });
      })
      .catch((e) => setError(explain(e)));
  }, [id, navigation]);

  useFocusEffect(load);

  if (!room) return <ScreenState error={error} onRetry={load} />;

  const girl = girlOf(room.girl);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TrainingHall today={new Date()} furniture={room.furniture} worn={room.worn} girl={girl} />
      <Text style={styles.caption}>
        {girl.name} · 옷 {room.worn.length}벌 입고 있어요 · 가구 {room.furniture.length}점
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  caption: { color: colors.textDim, textAlign: 'center', fontSize: 15 },
});
