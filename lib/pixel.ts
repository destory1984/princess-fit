import { Platform, type ImageStyle } from 'react-native';

/**
 * Keeps dot art's edges hard when the browser scales it.
 *
 * Only the web has a switch for this. On a phone React Native smooths every image it
 * scales and offers no nearest-neighbour mode, which is why the files are shipped eight
 * times the size of their dots (`scripts/girl-assets.py`): shrinking a big hard-edged
 * picture blurs each dot's rim by under a pixel, where enlarging a small one smears it.
 */
export const crisp: ImageStyle =
  Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle) : {};
