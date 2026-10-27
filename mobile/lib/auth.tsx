import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api, restoreToken, setToken } from './api';
import { Colors } from '../constants/theme';
import { Profile } from './types';
import { useRouter } from 'expo-router';
import { consumePendingRedirect } from './pendingRedirect';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (b: any) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState>({} as any);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const savedToken = await restoreToken();
        if (!savedToken) return;
        try {
          const restoredUser = await api.me();
          if (active) setUser(restoredUser);
        } catch (e: any) {
          if (e?.message === 'unauthorized') await setToken(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, []);
  const signIn = async (email: string, password: string) => {
    const r = await api.signin({ email, password });
    await setToken(r.token);
    const u = await api.me();
    setUser(u);
    const redir = consumePendingRedirect();
    if (redir) router.push(redir as any);
  };
  const signUp = async (b: any) => {
    const r = await api.signup(b);
    setToken(r.token);
    const u = await api.me();
    setUser(u);
    const redir = consumePendingRedirect();
    if (redir) router.push(redir as any);
  };
  const signOut = () => { void setToken(null).catch(() => {}); setUser(null); };
  const refresh = async () => { try { setUser(await api.me()); } catch {} };
  return (
    <Ctx.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.dark.primary} />
        </View>
      ) : children}
    </Ctx.Provider>
  );
}
export function useAuth() { return useContext(Ctx); }
