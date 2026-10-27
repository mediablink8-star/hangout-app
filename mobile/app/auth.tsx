import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
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
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp({ email, password, display_name: name, birth_date: birth, bio });
      console.log('auth success');
      router.replace('/');
    } catch (e: any) {
      console.error('auth error:', e);
      if (typeof window !== 'undefined' && window.alert) window.alert('Error: ' + (e?.message || 'failed'));
      else Alert.alert('Error', e?.message || 'failed');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg, paddingTop: 60 }}>
      <View style={styles.brand}>
        <Text style={styles.logo}>Hangout</Text>
        <Text style={[Typography.body, { color: Colors.dark.textMuted, marginTop: Spacing.xs }]}>
          Spontaneous hangouts for 18–29. Real people, real places.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={[Typography.h2, { color: Colors.dark.text, marginBottom: Spacing.md }]}>
          {mode === 'signin' ? 'Welcome back' : 'Join the map'}
        </Text>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.dark.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={Colors.dark.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        {mode === 'signup' && (
          <>
            <TextInput style={styles.input} placeholder="Display name" placeholderTextColor={Colors.dark.textMuted} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Birth date (YYYY-MM-DD)" placeholderTextColor={Colors.dark.textMuted} value={birth} onChangeText={setBirth} />
            <TextInput style={styles.input} placeholder="Short bio (optional)" placeholderTextColor={Colors.dark.textMuted} value={bio} onChangeText={setBio} />
          </>
        )}
        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.btnText}>{loading ? '...' : (mode === 'signin' ? 'Sign in' : 'Create account')}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={styles.switchRow}>
        <Text style={{ color: Colors.dark.textMuted }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        </Text>
        <Text style={{ color: Colors.dark.primary, fontWeight: '700' }}>
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  brand: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { fontSize: 42, fontWeight: '900', color: Colors.dark.primary, letterSpacing: -1 },
  card: { backgroundColor: Colors.dark.glassStrong, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border },
  input: { backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border, fontSize: 15 },
  btn: { backgroundColor: Colors.dark.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  btnText: { color: Colors.dark.background, fontWeight: '700', fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
});
