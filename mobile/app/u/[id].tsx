import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api } from '../../lib/api';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [u, setU] = useState<any>(null);
  useEffect(() => { (async () => { try { setU(await api.user(id!)); } catch (e: any) { Alert.alert('Error', e.message); } })(); }, [id]);
  if (!u) return <View style={styles.container}><Text style={{ color: Colors.dark.text }}>Loading...</Text></View>;
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {u.avatar_url ? <Image source={{ uri: u.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar} />}
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <Text style={[Typography.h1, { color: Colors.dark.text }]}>{u.display_name}</Text>
          {u.is_founding_host ? <Text style={[Typography.caption, { color: Colors.dark.primary }]}>✦ Founding host</Text> : null}
          <Text style={[Typography.body, { color: Colors.dark.textMuted }]}>{u.bio}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.primary, marginTop: Spacing.md }]} onPress={async () => { try { await api.followHost(id!); Alert.alert('Following'); } catch (e: any) { Alert.alert('Error', e.message); } }}>
        <Text style={styles.btnText}>Follow host</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.surface2, marginTop: Spacing.sm }]} onPress={async () => {
        try {
          const r = await api.createDirectConversation(id!);
          router.push(`/chat/${r.id}`);
        } catch (e: any) { Alert.alert('Error', e.message); }
      }}>
        <Text style={[styles.btnText, { color: Colors.dark.text }]}>Message</Text>
      </TouchableOpacity>
      {u.hosted && u.hosted.length > 0 && (
        <>
          <Text style={[Typography.h3, { color: Colors.dark.text, marginTop: Spacing.xl }]}>Hosting</Text>
          {u.hosted.map((g: any) => (
            <TouchableOpacity key={g.id} style={styles.card} onPress={() => router.push(`/g/${g.id}`)}>
              <Text style={[Typography.body, { color: Colors.dark.text }]}>{g.title}</Text>
              <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>{g.category} · {new Date(g.start_time).toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.danger, marginTop: Spacing.xl }]} onPress={async () => { try { await api.block(id!); Alert.alert('Blocked'); router.back(); } catch (e: any) { Alert.alert('Error', e.message); } }}>
        <Text style={styles.btnText}>Block user</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.surface, marginTop: Spacing.md }]} onPress={async () => { try { await api.report('user', id!, 'inappropriate'); Alert.alert('Reported'); } catch (e: any) { Alert.alert('Error', e.message); } }}>
        <Text style={[styles.btnText, { color: Colors.dark.text }]}>Report user</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  card: { backgroundColor: Colors.dark.glass, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  btn: { padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  btnText: { color: Colors.dark.background, fontWeight: '700' },
});
