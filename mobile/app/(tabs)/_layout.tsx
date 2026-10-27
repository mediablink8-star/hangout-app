import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Radius } from '../../constants/theme';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { api } from '../../lib/api';
import { useEffect, useState } from 'react';

export default function TabLayout() {
  const c = Colors.dark;
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const convs = await api.conversations();
        if (alive) setUnread(convs.reduce((s: number, x: any) => s + (x.unread_count || 0), 0));
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const badge = unread > 99 ? '99+' : unread > 0 ? unread : undefined;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 22 : 12,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: Radius.xl,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          ...Shadows.lg,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: Radius.xl, overflow: 'hidden' }]}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,23,34,0.55)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }]} />
          </View>
        ),
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 1, letterSpacing: 0.2 },
        tabBarItemStyle: { paddingTop: 8, paddingBottom: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color as string} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color as string} />, tabBarBadge: badge }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: ({ color, size }) => <Ionicons name="images" size={size} color={color as string} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color as string} /> }} />
    </Tabs>
  );
}
