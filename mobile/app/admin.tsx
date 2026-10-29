import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { api } from '../lib/api';

export default function AdminScreen() {
  const router = useRouter();
  const [gatherings, setGatherings] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);

  const load = async () => {
    try {
      setGatherings(await api.adminGatherings());
      setHosts(await api.adminInactiveHosts());
      setReports(await api.adminReports());
      setCancellations(await api.adminCancellations());
    } catch (e: any) { Alert.alert('Error', e.message); }
  };
  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}><View style={styles.brandLockup}><View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View><View><Text style={styles.brandName}>Hangout</Text><Text style={styles.brandCaption}>OPERATIONS</Text></View></View><TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={() => router.back()}><Text style={styles.closeText}>Close</Text></TouchableOpacity></View>
        <Text style={styles.eyebrow}>PRIVATE WORKSPACE</Text>
        <Text style={styles.pageTitle}>Admin dashboard</Text>
        <Text style={styles.subtitle}>Keep the community healthy and welcoming.</Text>
        <View style={styles.statsRow}><View style={styles.statCard}><Text style={styles.statValue}>{gatherings.length}</Text><Text style={styles.statLabel}>Gatherings</Text></View><View style={styles.statCard}><Text style={styles.statValue}>{reports.length}</Text><Text style={styles.statLabel}>Reports</Text></View><View style={styles.statCard}><Text style={styles.statValue}>{hosts.length}</Text><Text style={styles.statLabel}>Inactive hosts</Text></View></View>

        <Text style={styles.sectionTitle}>Gatherings</Text>
        {gatherings.map((g: any) => (
          <View key={g.id} style={styles.itemCard}><Text style={styles.itemTitle}>{g.title}</Text><Text style={styles.itemCopy}>{g.category}</Text></View>
        ))}

        <Text style={styles.sectionTitle}>Inactive hosts</Text>
        {hosts.map((h: any) => (
          <View key={h.id} style={styles.itemCard}><Text style={styles.itemTitle}>{h.display_name}</Text><TouchableOpacity style={styles.actionButton} onPress={async () => { try { await api.adminSetFoundingHost(h.id, true); Alert.alert('Granted'); load(); } catch (e: any) { Alert.alert('Error', e.message); } }}><Text style={styles.actionText}>Grant pioneer</Text></TouchableOpacity></View>
        ))}

        <Text style={styles.sectionTitle}>Reports</Text>
        {reports.map((r: any) => (
          <View key={r.id} style={styles.itemCard}><Text style={styles.itemTitle}>{r.target_type}</Text><Text style={styles.itemCopy}>{r.reason}</Text></View>
        ))}

        <Text style={styles.sectionTitle}>Cancellations</Text>
        {cancellations.map((c: any) => (
          <View key={c.id} style={styles.itemCard}><Text style={styles.itemTitle}>{c.title}</Text></View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: Colors.dark.background, fontSize: 19, fontWeight: '900' },
  brandName: { color: Colors.dark.text, fontSize: 17, fontWeight: '800' },
  brandCaption: { color: Colors.dark.textMuted, fontSize: 8, letterSpacing: 0.8, marginTop: 1 },
  closeButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  closeText: { color: Colors.dark.textMuted, fontSize: 12, fontWeight: '700' },
  eyebrow: { color: Colors.dark.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  pageTitle: { color: Colors.dark.text, fontSize: 29, fontWeight: '900', letterSpacing: -0.8, marginTop: Spacing.xs },
  subtitle: { color: Colors.dark.textMuted, fontSize: 13, marginTop: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  statCard: { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  statValue: { color: Colors.dark.primary, fontSize: 23, fontWeight: '900' },
  statLabel: { color: Colors.dark.textMuted, fontSize: 10, marginTop: 3 },
  sectionTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '800', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.sm },
  itemTitle: { color: Colors.dark.text, fontSize: 13, fontWeight: '700', flex: 1 },
  itemCopy: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 3 },
  actionButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.primary },
  actionText: { color: Colors.dark.background, fontSize: 11, fontWeight: '800' },
});