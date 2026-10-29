import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { api } from '../lib/api';

export default function FriendsScreen() {
  const router = useRouter();
  const [locs, setLocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setLocs(await api.sharedLocations()); } catch {}
    setLoading(false);
  };
  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View><View><Text style={styles.brandName}>Hangout</Text><Text style={styles.brandCaption}>PEOPLE YOU TRUST</Text></View></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close nearby people" style={styles.closeButton} onPress={() => router.back()}><Ionicons name="close" size={20} color={Colors.dark.text}/></TouchableOpacity>
      </View>
      <View style={styles.intro}><Text style={styles.pageTitle}>Friends nearby</Text><Text style={styles.subtitle}>See friends who have chosen to share their live location.</Text><View style={styles.privacyNote}><Ionicons name="shield-checkmark-outline" size={17} color={Colors.dark.primary}/><Text style={styles.privacyText}>Only people sharing their location appear here.</Text></View></View>
      {loading ? <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: Spacing.xl }} /> : (
        <FlatList
          data={locs}
          keyExtractor={(l) => l.user_id}
          contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="location-outline" size={24} color={Colors.dark.primary}/></View><Text style={styles.emptyTitle}>No one nearby just yet</Text><Text style={styles.emptyCopy}>When your friends choose to share their location, they’ll appear here.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(item.display_name || '?').charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.dark.text, fontWeight: '600' }}>{item.display_name}</Text>
                <Text style={{ color: Colors.dark.textMuted, fontSize: 12, marginTop: 3 }}>Location sharing is on</Text><Text style={{ color: Colors.dark.textDim, fontSize: 10, marginTop: 3 }}>Updated {new Date(item.updated_at).toLocaleTimeString()}</Text>
              </View>
              <View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveText}>Live</Text></View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: Colors.dark.background, fontSize: 19, fontWeight: '900' },
  brandName: { color: Colors.dark.text, fontSize: 17, fontWeight: '800' },
  brandCaption: { color: Colors.dark.textMuted, fontSize: 8, letterSpacing: 0.7, marginTop: 1 },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.surface },
  intro: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  pageTitle: { color: Colors.dark.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { color: Colors.dark.textMuted, fontSize: 13, lineHeight: 19, marginTop: Spacing.xs },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border },
  privacyText: { color: Colors.dark.textMuted, fontSize: 11, flex: 1 },
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.surface, marginBottom: Spacing.md },
  emptyTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: Colors.dark.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: Spacing.xs },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.dark.surface2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.dark.primary },
  liveText: { color: Colors.dark.primary, fontSize: 10, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.surface },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.dark.background, fontWeight: '800' },
});