import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { api } from '../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [prefs, setPrefs] = useState({ new_gathering: true, request_status: true, approaching: true });

  const load = async () => {
    try { setItems(await api.notifications()); } catch {}
    try { setPrefs(await api.notificationPrefs()); } catch {}
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.markAllNotificationsRead(); load(); };
  const toggle = async (key: string, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    await api.updateNotificationPrefs({ [key]: val });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.dark.primary, fontSize: 16 }}>‹ Back</Text></TouchableOpacity>
        <Text style={[Typography.h2, { color: Colors.dark.text }]}>Notifications</Text>
        <TouchableOpacity onPress={markAll}><Text style={{ color: Colors.dark.primary, fontSize: 13 }}>Mark all read</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={[Typography.h3, { color: Colors.dark.text, marginBottom: Spacing.sm }]}>Preferences</Text>
        {(['new_gathering', 'request_status', 'approaching'] as const).map((k) => (
          <View key={k} style={styles.prefRow}>
            <Text style={{ color: Colors.dark.text, flex: 1 }}>
              {k === 'new_gathering' ? 'Followed host creates a gathering' : k === 'request_status' ? 'Join request status changes' : 'Upcoming gathering approaching'}
            </Text>
            <Switch value={(prefs as any)[k]} onValueChange={(v) => toggle(k, v)} trackColor={{ true: Colors.dark.primary }} />
          </View>
        ))}
        <Text style={[Typography.h3, { color: Colors.dark.text, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>Recent</Text>
        {items.length === 0 && <Text style={{ color: Colors.dark.textMuted }}>No notifications yet.</Text>}
        {items.map((n) => (
          <TouchableOpacity key={n.id} style={[styles.card, !n.read && styles.unread]} onPress={async () => { if (!n.read) await api.markNotificationRead(n.id); if (n.data?.gathering_id) router.push(`/g/${n.data.gathering_id}`); load(); }}>
            <Text style={{ color: Colors.dark.text, fontWeight: '600' }}>{n.title}</Text>
            {n.body && <Text style={{ color: Colors.dark.textMuted, marginTop: 2 }}>{n.body}</Text>}
            <Text style={{ color: Colors.dark.textMuted, fontSize: 11, marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  card: { backgroundColor: Colors.dark.glass, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  unread: { borderColor: Colors.dark.primary },
});