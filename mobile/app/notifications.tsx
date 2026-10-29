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

  const markAll = async () => { try { await api.markAllNotificationsRead(); await load(); } catch {} };
  const toggle = async (key: string, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try { await api.updateNotificationPrefs({ [key]: val }); } catch { setPrefs((current) => ({ ...current, [key]: !val })); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}><Text style={styles.pageTitle}>Notifications</Text><Text style={styles.pageSubtitle}>Stay in the loop with your circle.</Text></View>
        <TouchableOpacity accessibilityRole="button" style={styles.markButton} onPress={markAll}><Text style={styles.markText}>Mark read</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {(['new_gathering', 'request_status', 'approaching'] as const).map((k) => (
          <View key={k} style={styles.prefRow}>
            <Text style={{ color: Colors.dark.text, flex: 1 }}>
              {k === 'new_gathering' ? 'Followed host creates a gathering' : k === 'request_status' ? 'Join request status changes' : 'Upcoming gathering approaching'}
            </Text>
            <Switch value={(prefs as any)[k]} onValueChange={(v) => toggle(k, v)} trackColor={{ true: Colors.dark.primary }} />
          </View>
        ))}
        <Text style={styles.sectionTitle}>Recent activity</Text>
        {items.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>You’re all caught up</Text><Text style={styles.emptyCopy}>New requests, plans and updates will show up here.</Text></View>}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  backText: { color: Colors.dark.text, fontSize: 26, lineHeight: 28 },
  pageTitle: { color: Colors.dark.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 2 },
  markButton: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.surface2 },
  markText: { color: Colors.dark.primary, fontSize: 10, fontWeight: '800' },
  sectionTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '800', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  empty: { padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center' },
  emptyTitle: { color: Colors.dark.text, fontWeight: '800', fontSize: 14 },
  emptyCopy: { color: Colors.dark.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: Spacing.xs },
  prefRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.lg, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border },
  card: { backgroundColor: Colors.dark.surface, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  unread: { borderColor: Colors.dark.primary },
});