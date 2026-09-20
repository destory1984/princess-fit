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
import { notify } from '@/lib/confirm';
import {
  enabledProviders,
  PROVIDER_LABEL,
  signInWith,
  type Provider,
} from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const providers = enabledProviders();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(mode: 'signIn' | 'signUp') {
    if (!email.trim() || !password) {
      notify('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    const { data, error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) notify(mode === 'signIn' ? '로그인 실패' : '가입 실패', error.message);
    else if (mode === 'signUp' && !data.session)
      notify('가입 완료', '이메일로 온 인증 링크를 누른 뒤 로그인해 주세요.');
  }

  async function social(provider: Provider) {
    setBusy(true);
    const problem = await signInWith(provider);
    setBusy(false);
    if (problem) notify('로그인 실패', problem);
  }

  async function resendConfirmation() {
    if (!email.trim()) {
      notify('이메일을 입력해 주세요.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setBusy(false);
    if (error) notify('재발송 실패', error.message);
    else notify('인증 메일을 다시 보냈어요', '메일의 링크를 1시간 안에 눌러 주세요.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>Refit</Text>
      <Text style={styles.tagline}>어제보다 하나 더</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        placeholderTextColor={colors.textDim}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        disabled={busy}
        onPress={() => submit('signIn')}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>로그인</Text>}
      </Pressable>

      <Pressable disabled={busy} onPress={() => submit('signUp')}>
        <Text style={styles.link}>처음이신가요? 회원가입</Text>
      </Pressable>

      {/*
        Shown only when this build offers any. Empty by default, so the screen
        is the one it has always been and none of the code behind it runs.
      */}
      {providers.map((provider) => (
        <Pressable
          key={provider}
          style={[styles.social, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={() => social(provider)}>
          <Text style={styles.socialText}>{PROVIDER_LABEL[provider]}</Text>
        </Pressable>
      ))}

      {/*
        There was no way back in before this. An account whose password was
        forgotten was a year of training gone, and nothing on this screen
        admitted it.
      */}
      <Pressable disabled={busy} onPress={() => router.push('/reset')}>
        <Text style={styles.link}>비밀번호를 잊으셨나요?</Text>
      </Pressable>

      <Pressable disabled={busy} onPress={resendConfirmation}>
        <Text style={styles.link}>인증 메일 다시 보내기</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: { color: colors.text, fontSize: 40, fontWeight: '800', textAlign: 'center' },
  tagline: {
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  social: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  socialText: { color: colors.text, fontWeight: '700' },
  link: { color: colors.textDim, textAlign: 'center', marginTop: spacing.lg, padding: spacing.xs },
});
