import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/auth';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';

function DeepLinkHandler() {
  const router = useRouter();
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const path = parsed.path || '';
      const m = path.match(/g\/([^/]+)/);
      const u = path.match(/u\/([^/]+)/);
      const target = m ? `/g/${m[1]}` : (u ? `/u/${u[1]}` : null);
      if (!target) return;
      const { getToken } = require('../lib/api');
      if (!getToken()) {
        const { setPendingRedirect } = require('../lib/pendingRedirect');
        setPendingRedirect(target);
        router.push('/auth');
      } else {
        router.push(target as any);
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [router]);
  return null;
}

function PushRegistrar() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const Device = await import('expo-device');
        if (!Device.isDevice) return;
        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const t = await Notifications.getExpoPushTokenAsync();
        const { api } = await import('../lib/api');
        await api.registerPushToken(t.data, Platform.OS);
      } catch (e) {
        console.warn('push registration unavailable', e);
      }
    })();
  }, [user]);
  return null;
}
function LocationBroadcaster() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || !(user as any).share_location) return;
    let sub: any = null;
    (async () => {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const { api } = await import('../lib/api');
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20 },
          (loc) => { api.updateMyLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {}); }
        );
      } catch (e) { console.warn('location broadcast unavailable', e); }
    })();
    return () => { try { sub?.remove?.(); } catch {} };
  }, [user]);
  return null;
}
export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <AuthProvider>
      <DeepLinkHandler />
      <PushRegistrar />
      <LocationBroadcaster />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        <Stack.Screen name="g/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="host/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="host/[id]" />
        <Stack.Screen name="u/[id]" />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
      <Stack.Screen name="friends" options={{ presentation: 'modal' }} />
      <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
