import React, { createContext, useContext, useState } from 'react';
import { api, setToken } from './api';
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
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const signIn = async (email: string, password: string) => {
    const r = await api.signin({ email, password });
    setToken(r.token);
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
  const signOut = () => { setToken(null); setUser(null); };
  const refresh = async () => { try { setUser(await api.me()); } catch {} };
  return <Ctx.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>{children}</Ctx.Provider>;
}
export function useAuth() { return useContext(Ctx); }
