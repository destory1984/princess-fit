import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CHANGELOG } from '@/lib/changelog';
import { colors, radius, spacing } from '@/lib/theme';
import { APP_VERSION } from '@/lib/version';

const ICON = require('../../assets/icon.png');
const SOURCE = 'https://github.com/destory1984/princess-fit';

/**
 * What this is and which one it is.
 *
 * The version is the reason the screen exists: when someone says 「버피가
 * 이상해요」, the first question is whether they are looking at the build that
 * fixed it, and a web page that was left open for a week has no other way to
 * say.
 */
export default function AboutScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Image source={ICON} style={styles.face} />
        <Text style={styles.name}>프린세스 핏</Text>
        <Text style={styles.version}>
          버전 {APP_VERSION} · {CHANGELOG[0].day}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.line}>운동을 적으면 아이가 자라는 앱이에요.</Text>
        <Text style={styles.line}>돈을 받지 않고 광고도 없어요.</Text>
        <Text style={styles.dim}>
          아직 시험 중이라 고장이 날 수 있어요. 이상한 것을 보면 위의 버전 숫자와 함께 만든 사람에게
          알려 주세요.
        </Text>
      </View>

      <Pressable style={styles.card} onPress={() => router.push('/settings/changes')}>
        <Text style={styles.line}>바뀐 것들</Text>
        <Text style={styles.dim}>날마다 무엇이 달라졌는지 적어 두었어요.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => void Linking.openURL(SOURCE)}>
        <Text style={styles.line}>만든 과정 보기</Text>
        <Text style={styles.dim}>코드와 고친 기록이 모두 공개되어 있어요.</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  head: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  face: { width: 96, height: 96, borderRadius: 22 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  version: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  line: { color: colors.text, fontSize: 15, lineHeight: 22 },
  dim: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
