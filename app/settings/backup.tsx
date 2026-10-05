import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { backupWord, fileNameFor, toCsv, toJson } from '@/lib/backup';
import { explain } from '@/lib/dbError';
import { confirmAction, notify } from '@/lib/confirm';
import { listBackup, restoreBackup } from '@/lib/db';
import { saveAndShare } from '@/lib/exportFile';
import { readPickedText } from '@/lib/pickFile';
import { read, restoreWord } from '@/lib/restore';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * The copy that leaves with you, and the way back in.
 *
 * Two formats because they are for two different days. CSV is for looking —
 * a spreadsheet opens it and the numbers are yours to sort and chart. JSON is
 * for the bad day: it keeps the shape, so this screen can put it back.
 *
 * Both come back in, though. Being told the wrong file was kept, a year later,
 * is the sentence this whole screen exists to prevent.
 *
 * Given its own screen rather than a row in settings because the difference
 * between those two files is worth one sentence, and a row has no room for a
 * sentence. Someone who picks the wrong one finds out months later.
 */
export default function BackupScreen() {
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  async function save(format: 'csv' | 'json') {
    setBusy('모으는 중…');
    setSaid(null);
    try {
      const workouts = await listBackup();
      if (workouts.length === 0) {
        notify('내보낼 기록이 없어요', '운동을 한 번 마치고 나면 받아 두실 수 있어요.');
        return;
      }
      const body = format === 'csv' ? toCsv(workouts) : toJson(workouts);
      await saveAndShare(
        fileNameFor(format),
        body,
        format === 'csv' ? 'text/csv' : 'application/json'
      );
      setSaid(backupWord(workouts));
    } catch (e: any) {
      notify('내보내지 못했어요', explain(e));
    } finally {
      setBusy(null);
    }
  }

  /**
   * The file is read and checked before anything is written, so a bad file is
   * refused with nothing half-imported behind it — and the count is shown
   * before the question, because 「1년치를 넣을까요」 and 「3일을 넣을까요」 are
   * not the same question.
   */
  async function restore() {
    setSaid(null);
    let text: string;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      text = await readPickedText(picked.assets[0]);
    } catch (e: any) {
      notify('파일을 열지 못했어요', explain(e));
      return;
    }

    let found: ReturnType<typeof read>;
    try {
      found = read(text);
    } catch (e: any) {
      notify('가져오지 못했어요', explain(e));
      return;
    }
    if (found.workouts.length === 0) {
      notify('가져올 기록이 없어요', '이 파일 안에서 읽을 수 있는 운동을 찾지 못했어요.');
      return;
    }

    confirmAction(
      '기록 가져오기',
      `운동 ${found.workouts.length}일이 들어 있어요.\n\n` +
        '이미 있는 날은 건드리지 않고, 없는 날만 넣어요. 골드는 다시 드리지 않아요 — ' +
        '가져오기는 이미 받으신 걸 되찾는 거니까요.',
      async () => {
        setBusy('넣는 중…');
        try {
          const { added, already } = await restoreBackup(found.workouts);
          setSaid(restoreWord(added, already, found.skipped));
        } catch (e: any) {
          notify('넣지 못했어요', explain(e));
        } finally {
          setBusy(null);
        }
      }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        기록은 이 앱이 아니라 전하 것이에요. 받아 두시면 계정에 무슨 일이 생겨도 남아요.
      </Text>

      <Pressable style={styles.row} disabled={!!busy} onPress={() => save('csv')}>
        <View style={styles.icon}>
          <Ionicons name="grid-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>보기용으로 받기 · CSV</Text>
          <Text style={styles.sub}>엑셀이나 구글 시트에서 바로 열려요. 이것도 다시 넣을 수 있어요.</Text>
        </View>
        <Ionicons name="download-outline" size={20} color={colors.textDim} />
      </Pressable>

      <Pressable style={styles.row} disabled={!!busy} onPress={() => save('json')}>
        <View style={styles.icon}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>복구용으로 받기 · JSON</Text>
          <Text style={styles.sub}>빠짐없이 담겨요. 나중에 아래에서 그대로 넣을 수 있어요.</Text>
        </View>
        <Ionicons name="download-outline" size={20} color={colors.textDim} />
      </Pressable>

      <Pressable style={styles.row} disabled={!!busy} onPress={restore}>
        <View style={styles.icon}>
          <Ionicons name="cloud-upload-outline" size={22} color={colors.gold} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>가져오기</Text>
          <Text style={styles.sub}>받아 두신 .json 이나 .csv 파일을 고르세요.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </Pressable>

      {(busy || said) && <Text style={styles.said}>{busy ?? said}</Text>}

      <Text style={styles.note}>
        가져오기는 이미 있는 날을 덮어쓰지 않아요. 같은 파일을 두 번 넣어도 기록이 두 배가
        되지는 않으니, 걱정되시면 그냥 한 번 더 넣으셔도 돼요.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  hint: { color: colors.textDim, fontSize: 15, lineHeight: 23 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  icon: { width: 32, alignItems: 'center' },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  said: { color: colors.text, fontSize: 15, lineHeight: 23, paddingHorizontal: spacing.sm },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 21 },
});
