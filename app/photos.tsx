import { useCallback, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { ScreenState } from '@/components/ScreenState';
import { confirmAction, notify } from '@/lib/confirm';
import { bookends, byMonth, spanDays, type Photo } from '@/lib/photos';
import { addPhoto, exportPhoto, listPhotos, removePhoto } from '@/lib/photoStore';
import { colors, paper, radius, spacing } from '@/lib/theme';

/**
 * Progress photos, kept on this phone and nowhere else.
 *
 * The comparison people actually want is the first one beside the latest, so
 * that pair sits at the top rather than being something you scroll to find.
 */
export default function PhotosScreen() {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listPhotos().then(setPhotos);
  }, []);

  useFocusEffect(load);

  async function add(source: 'camera' | 'library') {
    if (busy) return;
    setBusy(true);
    try {
      const added = await addPhoto(source);
      if (added) load();
    } catch (e: any) {
      notify('사진을 남기지 못했어요', e.message);
    } finally {
      setBusy(false);
    }
  }

  function open(photo: Photo) {
    confirmAction('사진첩으로 내보낼까요?', '폰 사진첩에 복사돼요.', async () => {
      try {
        await exportPhoto(photo);
        notify('사진첩에 저장했어요');
      } catch (e: any) {
        notify('내보내지 못했어요', e.message);
      }
    });
  }

  function remove(photo: Photo) {
    confirmAction(
      '사진 삭제',
      `${photo.takenOn} 사진을 지울까요?\n\n되돌릴 수 없어요.`,
      async () => {
        try {
          await removePhoto(photo.id);
          load();
        } catch (e: any) {
          notify('삭제 실패', e.message);
        }
      }
    );
  }

  if (!photos) return <ScreenState error={null} />;

  const ends = bookends(photos);
  const span = spanDays(photos);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.textDim} />
        <Text style={styles.privacyText}>
          이 사진은 이 폰에만 있어요. 서버로 올라가지 않아요.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.action} disabled={busy} onPress={() => add('camera')}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>찍기</Text>
        </Pressable>
        <Pressable
          style={[styles.action, styles.actionGhost]}
          disabled={busy}
          onPress={() => add('library')}>
          <Ionicons name="images-outline" size={18} color={colors.accent} />
          <Text style={[styles.actionText, styles.actionGhostText]}>사진첩에서</Text>
        </Pressable>
      </View>

      {ends && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>처음과 지금 · {span}일</Text>
          <View style={styles.pair}>
            {[ends.first, ends.latest].map((photo, i) => (
              <View key={photo.id} style={styles.pairItem}>
                <Image source={{ uri: photo.uri }} style={styles.pairImage} resizeMode="cover" />
                <Text style={styles.pairLabel}>
                  {i === 0 ? '처음' : '지금'} · {photo.takenOn.slice(5)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {byMonth(photos).map((group) => (
        <View key={group.month} style={styles.card}>
          <Text style={styles.cardTitle}>{group.month.replace('-', '년 ')}월</Text>
          <View style={styles.grid}>
            {group.photos.map((photo) => (
              <Pressable
                key={photo.id}
                style={styles.cell}
                onPress={() => open(photo)}
                onLongPress={() => remove(photo)}>
                <Image source={{ uri: photo.uri }} style={styles.cellImage} resizeMode="cover" />
                <Text style={styles.cellDay}>{photo.takenOn.slice(8)}일</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {photos.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={28} color={colors.textDim} />
          <Text style={styles.emptyText}>
            아직 사진이 없어요.{'\n'}같은 자리, 같은 조명에서 찍으면 변화가 잘 보여요.
          </Text>
        </View>
      )}

      {photos.length > 0 && (
        <Text style={styles.note}>
          눌러서 사진첩으로 내보내고, 길게 눌러서 지워요. 앱을 지우면 사진도 함께 사라지니,
          남기고 싶은 건 사진첩에 내보내 두세요.
        </Text>
      )}

      {Platform.OS === 'web' && (
        <Text style={styles.note}>사진은 폰에서만 남길 수 있어요.</Text>
      )}
    </ScrollView>
  );
}

const CELL = '31%';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  privacyText: { color: colors.textDim, fontSize: 12, flex: 1, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  actionGhost: { backgroundColor: 'transparent', borderColor: colors.accent, borderWidth: 1 },
  actionText: { color: '#fff', fontWeight: '800' },
  actionGhostText: { color: colors.accent },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  pair: { flexDirection: 'row', gap: spacing.sm },
  pairItem: { flex: 1, gap: 4 },
  pairImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.sm,
    backgroundColor: paper.bgAlt,
  },
  pairLabel: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: CELL, gap: 2 },
  cellImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.sm,
    backgroundColor: paper.bgAlt,
  },
  cellDay: { color: colors.textDim, fontSize: 10, textAlign: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { color: colors.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  note: { color: colors.textDim, fontSize: 11, lineHeight: 17 },
});
