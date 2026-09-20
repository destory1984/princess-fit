import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Directory, File, Paths } from 'expo-file-system';
import { localDayKey } from './format';
import { newPhotoId, sortPhotos, type Photo } from './photos';

/**
 * Where progress photos are kept: this phone, and nowhere else.
 *
 * The image is copied into the app's own directory rather than referenced
 * where the picker found it — a camera-roll uri stops resolving the moment
 * that photo is deleted or the phone reboots on iOS. The index is a list in
 * AsyncStorage; neither ever reaches the server.
 *
 * The trade is that they do not follow you to a new phone, so exporting to
 * the camera roll is offered explicitly rather than done behind your back.
 *
 * This file is the phone's half. expo-media-library throws the instant it is
 * required on web, and the router knows about every route whether or not it
 * is open — so the web build gets `photoStore.web.ts` instead, and neither
 * half needs a Platform check inside it.
 */

const INDEX = 'refit.photos';
const FOLDER = 'progress';

function folder() {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export async function listPhotos(): Promise<Photo[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX);
    return raw ? sortPhotos(JSON.parse(raw) as Photo[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(photos: Photo[]) {
  await AsyncStorage.setItem(INDEX, JSON.stringify(sortPhotos(photos)));
}

/** Ask for one, copy it in, and remember it. Returns null if nothing was picked. */
export async function addPhoto(source: 'camera' | 'library'): Promise<Photo | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(source === 'camera' ? '카메라 권한이 필요해요.' : '사진 권한이 필요해요.');
  }

  const picked =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (picked.canceled || !picked.assets?.length) return null;

  const id = newPhotoId();
  const copy = new File(folder(), `${id}.jpg`);
  new File(picked.assets[0].uri).copy(copy);

  const photo: Photo = { id, uri: copy.uri, takenOn: localDayKey(new Date()) };
  await writeIndex([...(await listPhotos()), photo]);
  return photo;
}

/** Forget it and delete the file. Both, or the folder grows forever. */
export async function removePhoto(id: string) {
  const photos = await listPhotos();
  const gone = photos.find((p) => p.id === id);
  await writeIndex(photos.filter((p) => p.id !== id));

  if (gone) {
    const file = new File(gone.uri);
    if (file.exists) file.delete();
  }
}

export async function setPhotoNote(id: string, note: string) {
  const photos = await listPhotos();
  await writeIndex(photos.map((p) => (p.id === id ? { ...p, note } : p)));
}

/**
 * Copy one out to the camera roll, so it survives losing the app.
 *
 * Deliberately a separate step: putting body photos in the gallery by default
 * would put them in front of anyone who scrolls it.
 */
export async function exportPhoto(photo: Photo) {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) throw new Error('사진첩에 저장할 권한이 필요해요.');
  await MediaLibrary.saveToLibraryAsync(photo.uri);
}
