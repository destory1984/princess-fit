import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { useRouter } from 'expo-router';
import PasswordInput from '@/components/PasswordInput';
import { explainAuth } from '@/lib/authError';
import { notify } from '@/lib/confirm';
import { forgetGreeting } from '@/lib/prefs';
import {
  enabledProviders,
  PROVIDER_LABEL,
  signInWith,
  type Provider,
} from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';

const ICON = require('../assets/icon.png');

/**
 * Whether a mail sent from here reaches anyone. Supabase's built-in sender is
 * for trying things out and does not deliver to testers, so this stays off
 * until the project has its own SMTP; then EXPO_PUBLIC_MAIL=on (in .env, and in
 * the repository's variables for the published site) brings the two links back.
 */
const MAIL_WORKS = process.env.EXPO_PUBLIC_MAIL === 'on';

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
    const restore = mode === 'signUp' ? await forgetGreeting() : null;
    const { data, error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    if (error) await restore?.();
    setBusy(false);
    if (error) notify(mode === 'signIn' ? '로그인 실패' : '가입 실패', explainAuth(error.message));
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
    if (error) notify('재발송 실패', explainAuth(error.message));
    else notify('인증 메일을 다시 보냈어요', '메일의 링크를 1시간 안에 눌러 주세요.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/*
        Her face and one sentence, before anything is asked for. The screen
        used to be a name and two boxes: nothing on it said this is a workout
        log with someone in it, and it is the first thing a new person sees.
      */}
      <Image source={ICON} style={styles.face} />
      <Text style={styles.logo}>프린세스 핏</Text>
      <Text style={styles.tagline}>어제보다 하나 더</Text>
      <Text style={styles.about}>운동을 기록하면 아이가 자라요.</Text>
      <Text style={[styles.about, styles.aboutMore]}>번 골드로 먹이고, 입히고, 가르쳐요.</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <PasswordInput
        style={styles.password}
        placeholder="비밀번호"
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

        Both ways back go through a mail. Until the project sends mail of its
        own (MAIL_WORKS), neither arrives, and two links that do nothing are
        worse than a sentence that says who to ask.
      */}
      {MAIL_WORKS ? (
        <>
          <Pressable disabled={busy} onPress={() => router.push('/reset')}>
            <Text style={styles.link}>비밀번호를 잊으셨나요?</Text>
          </Pressable>

          <Pressable disabled={busy} onPress={resendConfirmation}>
            <Text style={styles.link}>인증 메일 다시 보내기</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.forgot}>비밀번호를 잊으면 만든 사람에게 알려 주세요.</Text>
      )}
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
  face: { width: 96, height: 96, borderRadius: 22, alignSelf: 'center', marginBottom: spacing.md },
  logo: { color: colors.text, fontSize: 40, fontWeight: '800', textAlign: 'center' },
  tagline: {
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  about: {
    color: colors.text,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  aboutMore: { marginTop: 0, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  password: { marginBottom: spacing.md },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  forgot: { color: colors.textDim, textAlign: 'center', fontSize: 15, marginTop: spacing.lg },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
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
