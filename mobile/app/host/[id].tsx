import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { JoinRequest } from '../../lib/types';

export default function HostManage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reqs, setReqs] = useState<JoinRequest[]>([]);
  const load = async () => {
    try { setReqs(await api.requests(id!)); } catch (e: any) { Alert.alert('Error', e.message); }
  };
  useEffect(() => { load(); }, [id]);

  const decide = async (rid: string, status: 'approved' | 'declined') => {
    try { await api.decideRequest(id!, rid, status); load(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg }}>
      <Text style={[Typography.h1, { color: Colors.dark.text }]}>Manage gathering</Text>
      <Text style={[Typography.h3, { color: Colors.dark.text, marginTop: Spacing.lg }]}>Pending / all requests</Text>
      {reqs.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={[Typography.body, { color: Colors.dark.text }]}>{r.display_name || r.user_id}</Text>
          <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>Status: {r.status}</Text>
          {r.status === 'pending' && (
            <View style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
              <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: Spacing.sm }]} onPress={() => decide(r.id, 'approved')}>
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: Colors.dark.danger }]} onPress={() => decide(r.id, 'declined')}>
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
          {r.status === 'approved' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.danger, marginTop: Spacing.sm }]} onPress={async () => {
              try { await api.removeRequest(id!, r.id); load(); } catch (e: any) { Alert.alert('Error', e.message); }
            }}>
              <Text style={styles.btnText}>Remove guest</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.danger, marginTop: Spacing.xl }]} onPress={async () => {
        try { await api.updateGathering(id!, { cancelled: true }); Alert.alert('Cancelled'); router.back(); } catch (e: any) { Alert.alert('Error', e.message); }
      }}>
        <Text style={styles.btnText}>Cancel gathering</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: Colors.dark.background, fontSize: 19, fontWeight: '900' },
  brandName: { color: Colors.dark.text, fontSize: 17, fontWeight: '800' },
  brandCaption: { color: Colors.dark.textMuted, fontSize: 8, letterSpacing: 0.7, marginTop: 1 },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  backText: { color: Colors.dark.text, fontSize: 26, lineHeight: 28 },
  eyebrow: { color: Colors.dark.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  card: { backgroundColor: Colors.dark.surface, padding: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  btn: { backgroundColor: Colors.dark.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  btnText: { color: Colors.dark.background, fontWeight: '700' },
});
