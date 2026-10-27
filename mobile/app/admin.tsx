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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[Typography.display, { color: Colors.dark.text }]}>Admin</Text>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.dark.primary }}>Close</Text></TouchableOpacity>
        </View>

        <Text style={[Typography.h2, { color: Colors.dark.text, marginTop: Spacing.lg }]}>Gatherings ({gatherings.length})</Text>
        {gatherings.map((g: any) => (
          <Text key={g.id} style={{ color: Colors.dark.textMuted, marginTop: Spacing.xs }}>{g.title} — {g.category}</Text>
        ))}

        <Text style={[Typography.h2, { color: Colors.dark.text, marginTop: Spacing.lg }]}>Inactive hosts ({hosts.length})</Text>
        {hosts.map((h: any) => (
          <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
            <Text style={{ color: Colors.dark.textMuted }}>{h.display_name}</Text>
            <TouchableOpacity onPress={async () => { try { await api.adminSetFoundingHost(h.id, true); Alert.alert('Granted'); load(); } catch (e: any) { Alert.alert('Error', e.message); } }}>
              <Text style={{ color: Colors.dark.primary }}>Grant pioneer</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={[Typography.h2, { color: Colors.dark.text, marginTop: Spacing.lg }]}>Reports ({reports.length})</Text>
        {reports.map((r: any) => (
          <Text key={r.id} style={{ color: Colors.dark.textMuted, marginTop: Spacing.xs }}>{r.target_type} — {r.reason}</Text>
        ))}

        <Text style={[Typography.h2, { color: Colors.dark.text, marginTop: Spacing.lg }]}>Cancellations ({cancellations.length})</Text>
        {cancellations.map((c: any) => (
          <Text key={c.id} style={{ color: Colors.dark.textMuted, marginTop: Spacing.xs }}>{c.title}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}