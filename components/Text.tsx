import { createContext, useContext } from 'react';
import {
  StyleSheet,
  Text as PlainText,
  TextInput as PlainTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { scaledSize } from '@/lib/textScale';
import { useTextScale } from '@/lib/textScaleStore';

/**
 * Text that follows the size chosen in settings (lib/textScale.ts).
 *
 * Every screen imports `Text` and `TextInput` from here instead of from
 * react-native. The sizes written in the styles stay as they are — they are
 * the sizes at 100 — and are multiplied on the way to the screen.
 */

// React Native gives text with no size 14 points.
const UNSIZED = 14;

// Text inside text takes its parent's size. Giving it 14 of its own would
// shrink a bold word in the middle of a 17-point sentence.
const Inside = createContext(false);

function sized<S extends TextStyle>(style: unknown, percent: number, nested: boolean): S | undefined {
  if (percent === 100) return style as S | undefined;
  const flat = (StyleSheet.flatten(style as TextStyle) ?? {}) as TextStyle;
  const next: TextStyle = { ...flat };
  if (typeof flat.fontSize === 'number') next.fontSize = scaledSize(flat.fontSize, percent);
  else if (!nested) next.fontSize = scaledSize(UNSIZED, percent);
  if (typeof flat.lineHeight === 'number') next.lineHeight = scaledSize(flat.lineHeight, percent);
  // A label given a width is a column: 「포만감」 at 44 points wide. Left at 44
  // while its letters grew, it broke onto two lines at 125%.
  if (typeof flat.width === 'number') next.width = scaledSize(flat.width, percent);
  if (typeof flat.minWidth === 'number') next.minWidth = scaledSize(flat.minWidth, percent);
  return next as S;
}

export function Text({ style, ...rest }: TextProps) {
  const chosen = useTextScale();
  const nested = useContext(Inside);
  // `allowFontScaling={false}` is the way out, as it is for the system's own
  // setting: for words inside a button of fixed size (−2.5 on a 36-point
  // stepper), where growing the letters only cuts them off.
  const percent = rest.allowFontScaling === false ? 100 : chosen;
  return (
    <Inside.Provider value={true}>
      <PlainText {...rest} style={sized(style, percent, nested)} />
    </Inside.Provider>
  );
}

export function TextInput({
  style,
  ...rest
}: TextInputProps & { ref?: React.Ref<PlainTextInput> }) {
  const percent = useTextScale();
  return <PlainTextInput {...rest} style={sized(style, percent, false)} />;
}
