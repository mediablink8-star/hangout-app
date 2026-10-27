import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[Typography.display, { color: Colors.dark.text }]}>Friends nearby</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.dark.primary }}>Close</Text></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: Spacing.xl }} /> : (
        <FlatList
          data={locs}
          keyExtractor={(l) => l.user_id}
          contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<Text style={{ color: Colors.dark.textMuted, textAlign: 'center', marginTop: Spacing.xl }}>No friends are sharing their location right now.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(item.display_name || '?').charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.dark.text, fontWeight: '600' }}>{item.display_name}</Text>
                <Text style={{ color: Colors.dark.textMuted, fontSize: 12 }}>Updated {new Date(item.updated_at).toLocaleTimeString()}</Text>
              </View>
              <Text style={{ color: Colors.dark.primary, fontSize: 12 }}>{item.lat.toFixed(3)}, {item.lng.toFixed(3)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.dark.background, fontWeight: '800' },
});