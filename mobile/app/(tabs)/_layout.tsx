import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Radius } from '../../constants/theme';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { api } from '../../lib/api';
import { useEffect, useRef, useState } from 'react';

const styles = StyleSheet.create({
  iconWrap: { width: 40, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  iconWrapActive: { backgroundColor: 'rgba(155,140,255,0.15)' },
  mapIconWrap: { width: 52, height: 52, marginTop: -20, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E78AD7', borderWidth: 4, borderColor: '#171321', ...Shadows.md, shadowColor: '#E78AD7', shadowOpacity: 0.2, shadowRadius: 12 },
  mapIconWrapActive: { backgroundColor: '#F0A5E2' },
});

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
          left: 16,
          right: 16,
          height: 76,
          borderRadius: Radius.xl,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(225,225,255,0.14)',
          paddingTop: 3,
          ...Shadows.lg,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: Radius.xl, overflow: 'hidden' }]}>
            <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,14,26,0.76)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(246,241,255,0.13)' }]} />
          </View>
        ),
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.15 },
        tabBarItemStyle: { paddingTop: 6, paddingBottom: 5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore', tabBarIcon: ({ color, focused }) => <View style={[styles.iconWrap, focused && styles.iconWrapActive]}><Ionicons name={focused ? "compass" : "compass-outline"} size={focused ? 21 : 20} color={color as string} /></View> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ color, focused }) => <View style={[styles.iconWrap, focused && styles.iconWrapActive]}><Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={focused ? 21 : 20} color={color as string} /></View>, tabBarBadge: badge }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 0 }, tabBarIcon: ({ focused }) => <View style={[styles.mapIconWrap, focused && styles.mapIconWrapActive]}><Ionicons name="map" size={23} color="#241421" /></View> }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: ({ color, focused }) => <View style={[styles.iconWrap, focused && styles.iconWrapActive]}><Ionicons name={focused ? "people" : "people-outline"} size={focused ? 21 : 20} color={color as string} /></View> }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: ({ color, focused }) => <View style={[styles.iconWrap, focused && styles.iconWrapActive]}><Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={focused ? 22 : 20} color={color as string} /></View> }} />
    </Tabs>
  );
}
