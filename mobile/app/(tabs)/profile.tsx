import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Gathering } from '../../lib/types';

export default function Profile() {
  const router = useRouter();
  const { user, signOut, refresh } = useAuth();
  const [hosting, setHosting] = useState<Gathering[]>([]);
  const [attending, setAttending] = useState<Gathering[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);
  const [shareLocation, setShareLocation] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.myGatherings();
        setHosting(r.hosting || []);
        setAttending(r.attending || []);
        if (user?.id) {
          const p = await api.feed(user.id);
          setPosts(p || []);
        }
      } catch {}
    })();
  }, [user]);

  useEffect(() => {
    if (user) { setName(user.display_name); setBio(user.bio || ''); setAvatar(user.avatar_url || null); setUsername((user as any).username || ''); setProfilePublic((user as any).profile_public !== 0); setShareLocation(!!(user as any).share_location); }
  }, [user]);

  const pickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      if (!asset?.base64) {
        Alert.alert('Couldn’t attach this photo', 'Choose another image and try again.');
        return;
      }
      const approximateBytes = asset.fileSize ?? Math.ceil(asset.base64.length * 0.75);
      if (approximateBytes > 10 * 1024 * 1024) {
        Alert.alert('Photo is too large', 'Choose an image under 10 MB.');
        return;
      }
      setAvatar('data:image/jpeg;base64,' + asset.base64);
    } catch {
      Alert.alert('Couldn’t open your library', 'Check photo access in your device settings and try again.');
    }
  };

  const save = async () => {
    try {
      await api.updateMe({ display_name: name, bio, avatar_url: avatar, username: username || null, profile_public: profilePublic, share_location: shareLocation });
      if (refresh) await refresh();
      setEditing(false);
      Alert.alert('Saved');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[Typography.h2, { color: Colors.dark.text }]}>Not signed in</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/auth')}>
          <Text style={styles.btnText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>
      {editing ? (
        <View>
          <TouchableOpacity onPress={pickAvatar} style={{ alignSelf: 'center' }}>
            {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatar} />}
            <Text style={[Typography.caption, { color: Colors.dark.primary, textAlign: 'center', marginTop: Spacing.sm }]}>Change photo</Text>
          </TouchableOpacity>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={Colors.dark.textMuted} />
          <TextInput style={[styles.input, { height: 80 }]} value={bio} onChangeText={setBio} placeholder="Bio" placeholderTextColor={Colors.dark.textMuted} multiline />
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username (public profile URL)" placeholderTextColor={Colors.dark.textMuted} autoCapitalize="none" />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md }}>
            <Text style={{ color: Colors.dark.text, flex: 1 }}>Public profile</Text>
            <TouchableOpacity onPress={() => setProfilePublic((p) => !p)} style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.md, backgroundColor: profilePublic ? Colors.dark.primary : Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border }}>
              <Text style={{ color: profilePublic ? Colors.dark.background : Colors.dark.text, fontWeight: '600' }}>{profilePublic ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md }}>
            <Text style={{ color: Colors.dark.text, flex: 1 }}>Share live location</Text>
            <TouchableOpacity onPress={() => setShareLocation((p) => !p)} style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.md, backgroundColor: shareLocation ? Colors.dark.primary : Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border }}>
              <Text style={{ color: shareLocation ? Colors.dark.background : Colors.dark.text, fontWeight: '600' }}>{shareLocation ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', marginTop: Spacing.lg }}>
            <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: Spacing.sm }]} onPress={save}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: Colors.dark.surface2 }]} onPress={() => setEditing(false)}><Text style={[styles.btnText, { color: Colors.dark.text }]}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            {user.avatar_url ? <Image source={{ uri: user.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar} />}
            <View style={{ marginLeft: Spacing.md, flex: 1 }}>
              <Text style={[Typography.h2, { color: Colors.dark.text }]}>{user.display_name}</Text>
              {user.is_founding_host ? <Text style={[Typography.caption, { color: Colors.dark.primary }]}>✦ Founding host</Text> : null}
              <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>{user.bio}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={{ color: Colors.dark.primary, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={[Typography.h3, { color: Colors.dark.text, marginTop: Spacing.xl }]}>Hosting</Text>
          {hosting.map((g) => (
            <TouchableOpacity key={g.id} style={styles.card} onPress={() => router.push(`/host/${g.id}`)}>
              <Text style={[Typography.body, { color: Colors.dark.text }]}>{g.title}</Text>
              <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>{g.category} · {new Date(g.start_time).toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[Typography.h3, { color: Colors.dark.text, marginTop: Spacing.xl }]}>Posts</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm }}>
            {posts.map((p) => (
              <View key={p.id} style={{ width: '32%', aspectRatio: 1, margin: '0.5%', backgroundColor: Colors.dark.glass, borderRadius: Radius.sm, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                {p.media_url ? (
                  <Image source={{ uri: p.media_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={{ color: Colors.dark.textMuted, fontSize: 11, textAlign: 'center', padding: 4 }} numberOfLines={4}>{p.body}</Text>
                )}
              </View>
            ))}
          </View>
          {posts.length === 0 && <Text style={[Typography.caption, { color: Colors.dark.textMuted, marginTop: Spacing.xs }]}>No posts yet.</Text>}
          <Text style={[Typography.h3, { color: Colors.dark.text, marginTop: Spacing.xl }]}>Attending</Text>
          {attending.map((g) => (
            <TouchableOpacity key={g.id} style={styles.card} onPress={() => router.push(`/g/${g.id}`)}>
              <Text style={[Typography.body, { color: Colors.dark.text }]}>{g.title}</Text>
              <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>{g.category} · {new Date(g.start_time).toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
          {user?.is_admin ? (
        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.surface2, marginTop: Spacing.sm }]} onPress={() => router.push('/admin')}>
          <Text style={[styles.btnText, { color: Colors.dark.text }]}>Admin panel</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.danger, marginTop: Spacing.xxl }]} onPress={signOut}>
            <Text style={styles.btnText}>Sign out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  card: { backgroundColor: Colors.dark.glass, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  input: { backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  btn: { backgroundColor: Colors.dark.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  btnText: { color: Colors.dark.background, fontWeight: '700' },
});
