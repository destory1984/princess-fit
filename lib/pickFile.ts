import { Platform } from 'react-native';
import { File } from 'expo-file-system';

type Picked = { uri: string; name?: string | null; file?: unknown };

/**
 * The text inside a file the person just chose.
 *
 * Two paths again. On a phone the picker has copied the file into the cache
 * and handed over a uri, which `File` reads directly. In a browser the uri is
 * a blob url that the filesystem knows nothing about, so it is fetched — the
 * picker also hands over the real `File` object there, and using it avoids
 * asking the browser to go and get something it is already holding.
 */
export async function readPickedText(asset: Picked): Promise<string> {
  if (Platform.OS === 'web') {
    const native = asset.file as Blob | undefined;
    if (native && typeof native.text === 'function') return native.text();
    const response = await fetch(asset.uri);
    return response.text();
  }
  return new File(asset.uri).textSync();
}
