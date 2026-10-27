import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { useAuth } from '../lib/auth';

export default function Auth() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [bio, setBio] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError('Password must be between 8 and 128 characters.');
      return;
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Add a display name to continue.');
        return;
      }
      const parsedBirth = new Date(`${birth}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || Number.isNaN(parsedBirth.getTime()) || parsedBirth.toISOString().slice(0, 10) !== birth) {
        setError('Enter your birth date as YYYY-MM-DD.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp({ email: normalizedEmail, password, display_name: name.trim(), birth_date: birth, bio: bio.trim() });
      router.replace('/');
    } catch (e: any) {
      setError(e?.message || 'We couldn’t complete that request. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSignIn = mode === 'signin';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.brand}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View>
            <Text style={styles.logo}>Hangout</Text>
            <Text style={styles.tagline}>Make the plan. Meet your people.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.eyebrowRow}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrow}>YOUR CITY, A LITTLE CLOSER</Text>
            </View>
            <Text style={styles.title}>{isSignIn ? 'Welcome back' : 'Find your people'}</Text>
            <Text style={styles.subtitle}>
              {isSignIn ? 'Sign in to see what’s happening around you.' : 'Create an account to discover local hangouts.'}
            </Text>

            {error ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {mode === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Display name</Text>
                <TextInput
                  accessibilityLabel="Display name"
                  style={styles.input}
                  placeholder="How friends will see you"
                  placeholderTextColor={Colors.dark.textDim}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  maxLength={60}
                  returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                accessibilityLabel="Email address"
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.dark.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  accessibilityLabel="Password"
                  style={styles.passwordInput}
                  placeholder="8 characters or more"
                  placeholderTextColor={Colors.dark.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  textContentType={isSignIn ? 'password' : 'newPassword'}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  maxLength={128}
                  returnKeyType="done"
                  onSubmitEditing={submit}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                  style={styles.showPassword}
                >
                  <Text style={styles.showPasswordText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'signup' && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Date of birth</Text>
                  <TextInput
                    accessibilityLabel="Date of birth in year, month, day format"
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.dark.textDim}
                    value={birth}
                    onChangeText={setBirth}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    returnKeyType="next"
                  />
                  <Text style={styles.fieldHint}>Hangout is for people ages 18–29.</Text>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>A little about you <Text style={styles.optional}>OPTIONAL</Text></Text>
                  <TextInput
                    accessibilityLabel="Short bio, optional"
                    style={[styles.input, styles.bioInput]}
                    placeholder="What do you like doing?"
                    placeholderTextColor={Colors.dark.textDim}
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    maxLength={280}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={Colors.dark.background} /> : (
                <Text style={styles.btnText}>{isSignIn ? 'Sign in' : 'Create your account'} <Text style={styles.btnArrow}>→</Text></Text>
              )}
            </TouchableOpacity>
            <Text style={styles.ageNote}>A safer space to meet up. You must be 18–29 to join.</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => { setMode(isSignIn ? 'signup' : 'signin'); setError(''); }}
            style={styles.switchRow}
          >
            <Text style={styles.switchPrompt}>{isSignIn ? 'New to Hangout? ' : 'Already have an account? '}</Text>
            <Text style={styles.switchAction}>{isSignIn ? 'Create an account' : 'Sign in'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.dark.background },
  keyboard: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
  brand: { alignItems: 'center', marginBottom: Spacing.xl },
  brandMark: { width: 54, height: 54, borderRadius: Radius.lg, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm, ...{ shadowColor: Colors.dark.primary, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 5 } },
  brandMarkText: { color: Colors.dark.background, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -2 },
  logo: { color: Colors.dark.text, fontSize: 29, fontWeight: '800', letterSpacing: -0.9 },
  tagline: { color: Colors.dark.textMuted, fontSize: 14, marginTop: Spacing.xs },
  card: { backgroundColor: Colors.dark.surface, padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.border, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  liveDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.dark.primary },
  eyebrow: { color: Colors.dark.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { ...Typography.h1, color: Colors.dark.text },
  subtitle: { ...Typography.body, color: Colors.dark.textMuted, marginTop: Spacing.xs, marginBottom: Spacing.lg },
  fieldGroup: { marginTop: Spacing.md },
  label: { color: Colors.dark.text, fontSize: 13, fontWeight: '700', marginBottom: Spacing.xs },
  optional: { color: Colors.dark.textDim, fontSize: 10, letterSpacing: 0.8 },
  input: { minHeight: 52, backgroundColor: Colors.dark.background, color: Colors.dark.text, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.borderStrong, fontSize: 15 },
  passwordRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.background, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  passwordInput: { flex: 1, height: 50, color: Colors.dark.text, paddingHorizontal: Spacing.md, fontSize: 15 },
  showPassword: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  showPasswordText: { color: Colors.dark.primary, fontSize: 12, fontWeight: '700' },
  bioInput: { minHeight: 88, paddingTop: Spacing.md },
  fieldHint: { color: Colors.dark.textDim, fontSize: 12, marginTop: Spacing.xs },
  errorBox: { backgroundColor: 'rgba(255,77,90,0.10)', borderColor: 'rgba(255,77,90,0.32)', borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  errorText: { color: Colors.dark.danger, fontSize: 13, lineHeight: 19 },
  btn: { minHeight: 54, backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: Colors.dark.background, fontWeight: '800', fontSize: 15 },
  btnArrow: { fontSize: 19 },
  ageNote: { color: Colors.dark.textDim, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: Spacing.md },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: Spacing.xl, paddingVertical: Spacing.sm },
  switchPrompt: { color: Colors.dark.textMuted, fontSize: 13 },
  switchAction: { color: Colors.dark.primary, fontWeight: '700', fontSize: 13 },
});
