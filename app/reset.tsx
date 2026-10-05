import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import PasswordInput from '@/components/PasswordInput';
import { notify } from '@/lib/confirm';
import { explain } from '@/lib/dbError';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * Getting back in after forgetting the password.
 *
 * There was no way in at all before this: an account whose password was
 * forgotten was an account whose year of training was gone. That is a bigger
 * hole than any feature, and it was open the whole time.
 *
 * A six-digit code rather than a link. A link has to come back to the app
 * through a URL scheme, which does not work in Expo Go — the very place this
 * is tested — and needs a dev build to exist at all. A code is typed, works
 * on every platform including the web build, and has nothing to go wrong
 * between the mail and the phone.
 *
 * The send step never says whether the address exists. Supabase is careful
 * about that and so is this screen: an app that answers 「그런 계정 없어요」
 * will tell anyone who asks which addresses have accounts.
 */
export default function ResetScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'ask' | 'verify'>('ask');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!email.trim()) {
      notify('이메일을 입력해 주세요.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) {
      notify('보내지 못했어요', explain(error));
      return;
    }
    setStep('verify');
    notify(
      '메일을 보냈어요',
      '그 계정이 있다면 6자리 숫자가 도착해요. 한 시간 안에 입력해 주세요.'
    );
  }

  async function finish() {
    if (code.trim().length < 6) {
      notify('메일로 받은 6자리 숫자를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      notify('새 비밀번호는 6자 이상으로 해주세요.');
      return;
    }
    setBusy(true);

    // The code buys a session; the session is what lets the password be set.
    const { error: codeError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    if (codeError) {
      setBusy(false);
      notify('숫자가 맞지 않아요', '메일에 온 6자리를 다시 확인해 주세요.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      // The session is already theirs at this point, so this is recoverable
      // from inside the app rather than by starting the whole flow again.
      notify('비밀번호를 바꾸지 못했어요', explain(error));
      return;
    }
    notify('바꿨어요', '새 비밀번호로 들어왔어요.');
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>비밀번호 찾기</Text>
      <Text style={styles.lead}>
        {step === 'ask'
          ? '가입하신 이메일로 6자리 숫자를 보내 드려요.'
          : '메일에 온 6자리 숫자와, 새로 쓰실 비밀번호를 넣어 주세요.'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={step === 'ask'}
      />

      {step === 'verify' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="메일로 받은 6자리 숫자"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <PasswordInput
            style={styles.password}
            placeholder="새 비밀번호"
            value={password}
            onChangeText={setPassword}
          />
        </>
      )}

      <Pressable
        style={[styles.button, busy && styles.buttonOff]}
        disabled={busy}
        onPress={step === 'ask' ? sendCode : finish}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {step === 'ask' ? '숫자 받기' : '비밀번호 바꾸기'}
          </Text>
        )}
      </Pressable>

      {step === 'verify' && (
        <Pressable disabled={busy} onPress={sendCode}>
          <Text style={styles.link}>숫자를 못 받으셨나요? 다시 보내기</Text>
        </Pressable>
      )}

      <Pressable disabled={busy} onPress={() => router.back()}>
        <Text style={styles.link}>돌아가기</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  lead: {
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 23,
  },
  password: { marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonOff: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: colors.textDim, textAlign: 'center', marginTop: spacing.lg },
});
