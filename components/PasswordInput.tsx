import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '@/lib/theme';

type Props = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
};

/*
  A password typed blind is a password typed twice. Signing up asks for it
  once, with no second box to catch a slip, so the eye is the only way to
  see what is about to become the key to the account.
*/
export default function PasswordInput({ placeholder, value, onChangeText, style }: Props) {
  const [shown, setShown] = useState(false);

  return (
    <View style={[styles.box, style]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!shown}
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable
        style={styles.eye}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={shown ? '비밀번호 숨기기' : '비밀번호 보기'}
        onPress={() => setShown((was) => !was)}>
        <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textDim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  input: { flex: 1, color: colors.text, padding: spacing.lg },
  eye: { paddingHorizontal: spacing.lg },
});
