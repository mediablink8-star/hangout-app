import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { Gathering } from '../../lib/types';
import HangoutMap from '../../components/HangoutMap';

export default function MapTab() {
  const router = useRouter();
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try { setGatherings(await api.gatherings()); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.container}>
      <HangoutMap gatherings={gatherings} onSelect={(id) => router.push(`/g/${id}`)} />
      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headingIcon}><Ionicons name="map" size={19} color={Colors.dark.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Explore map</Text>
            <Text style={styles.subtitle}>Find your next hangout nearby</Text>
          </View>
          <View style={styles.countPill}><View style={styles.liveDot}/><Text style={styles.countText}>{gatherings.length} plans</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh map" style={styles.refresh} onPress={() => void load()}>
            <Ionicons name="refresh" size={18} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
        {loading && <View style={styles.status}><ActivityIndicator color={Colors.dark.primary}/><Text style={styles.statusText}>Finding plans…</Text></View>}
        {error && !loading && <TouchableOpacity style={styles.status} onPress={() => void load()}><Text style={styles.statusText}>Couldn’t load plans. Tap to retry.</Text></TouchableOpacity>}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  overlay: { ...StyleSheet.absoluteFillObject, pointerEvents: 'box-none' as any },
  header: { marginHorizontal: Spacing.md, marginTop: Spacing.xs, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(13,14,23,0.92)', borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  headingIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(231,138,215,0.14)' },
  title: { ...Typography.h3, color: Colors.dark.text },
  subtitle: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 2 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.dark.surface2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.dark.primary },
  countText: { color: Colors.dark.text, fontSize: 10, fontWeight: '700' },
  refresh: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.surface2 },
  status: { alignSelf: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: 'rgba(13,14,23,0.92)', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  statusText: { color: Colors.dark.text, fontSize: 12, fontWeight: '600' },
});
