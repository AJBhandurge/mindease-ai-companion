import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { authAPI, chatAPI } from '../services/api';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import Button from '../components/Button';
import TextField from '../components/TextField';

type Mode = 'signin' | 'register';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth, setSession } = useStore();

  const isRegister = mode === 'register';

  const submit = async (u = username.trim(), p = password, m: Mode = mode) => {
    if (!u || !p) return setError('Please enter your username and password.');
    if (m === 'register' && p.length < 6) return setError('Use at least 6 characters for your password.');

    setError(null);
    setLoading(true);
    try {
      const res = await (m === 'register' ? authAPI.register : authAPI.login)(u, p);
      await setAuth(res.data.user_id, res.data.username, res.data.token, res.data.companion_id);
      const sessionRes = await chatAPI.startSession(res.data.user_id);
      setSession(sessionRes.data.session_id);
    } catch (err: any) {
      setError(
        err.response?.data?.detail
          || "We couldn't reach MindEase. Check that the server is running and you're on the same network.",
      );
    } finally {
      setLoading(false);
    }
  };

  const signInWithDemo = () => {
    setMode('signin');
    setUsername('demo');
    setPassword('demo123');
    submit('demo', 'demo123', 'signin');
  };

  const switchMode = (m: Mode) => { setMode(m); setError(null); };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Feather name="feather" size={28} color={colors.brand} />
              </View>
              <Text style={styles.wordmark}>MindEase</Text>
              <Text style={[type.bodyMuted, styles.center]}>
                A safe space to talk, reflect, and feel a little lighter.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.segment} accessibilityRole="tablist">
                {(['signin', 'register'] as Mode[]).map(m => {
                  const active = mode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => switchMode(m)}
                      style={[styles.segmentItem, active && styles.segmentActive]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {m === 'signin' ? 'Sign in' : 'Create account'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextField
                label="Username"
                icon="user"
                value={username}
                onChangeText={(t) => { setUsername(t); setError(null); }}
                placeholder="Your username"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                returnKeyType="next"
                error={!!error && !username}
              />
              <TextField
                label="Password"
                icon="lock"
                secure
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                returnKeyType="go"
                onSubmitEditing={() => submit()}
                error={!!error && !password}
              />

              {error && (
                <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
                  <Feather name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Button
                label={isRegister ? 'Create account' : 'Sign in'}
                onPress={() => submit()}
                loading={loading}
                style={{ marginTop: spacing.xs }}
              />

              <View style={styles.divider}>
                <View style={styles.rule} />
                <Text style={type.caption}>or</Text>
                <View style={styles.rule} />
              </View>

              <Button label="Try the demo account" variant="secondary" icon="play-circle" onPress={signInWithDemo} disabled={loading} />
            </View>

            <View style={styles.trust}>
              <Feather name="shield" size={14} color={colors.textSubtle} />
              <Text style={[type.caption, { flex: 1 }]}>
                Your conversations stay on your own server. MindEase is a wellbeing companion,
                not a substitute for professional care.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl },
  column: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.xxl },
  center: { textAlign: 'center' },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brandSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
    borderWidth: 1, borderColor: 'rgba(124,147,247,0.3)',
  },
  wordmark: { ...type.display },
  card: {
    backgroundColor: colors.bgElevated, borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: spacing.xl, gap: spacing.lg,
  },
  segment: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surfaceAlt },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textSubtle },
  segmentTextActive: { color: colors.text },
  error: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: spacing.md,
  },
  errorText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#FECACA' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  trust: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.xs },
});
