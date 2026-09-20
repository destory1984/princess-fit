import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Handing a file to the person who owns it.
 *
 * Two different acts wearing one name. On a phone the file is written into the
 * app's own folder and then offered to the share sheet, which is where it can
 * be sent to a mail, a drive, a computer — anywhere that is not this app, which
 * is the entire point. In a browser it is a download, because a browser has no
 * share sheet worth the name and `Sharing` refuses local files there.
 */
export async function saveAndShare(name: string, body: string, mime: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([body], { type: `${mime};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    // Freed on the next tick rather than immediately: revoking before the
    // browser has read the blob cancels the download it was just given.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const file = new File(Paths.document, name);
  // Overwrite: exporting twice on the same day is a person making sure, and
  // refusing the second one with an error would be punishing the caution.
  file.create({ overwrite: true });
  file.write(body);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(`이 기기에서는 공유를 열 수 없어요. 파일은 저장해 뒀어요 · ${name}`);
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: mime,
    dialogTitle: '기록 내보내기',
    UTI: mime === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
  });
}
