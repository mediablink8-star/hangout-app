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
  const [followingCount, setFollowingCount] = useState(0);
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
        const following = await api.following();
        setFollowingCount(Number(following?.count ?? following?.following?.length ?? 0));
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 132 }}>
      <View style={styles.brandRow}><View style={styles.brandLockup}><View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View><View><Text style={styles.brandName}>Hangout</Text><Text style={styles.brandCaption}>YOUR CIRCLE, YOUR WAY</Text></View></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Open notifications" style={styles.headerAction} onPress={() => router.push('/notifications')}><Text style={styles.headerActionText}>Notifications ↗</Text></TouchableOpacity></View>
      {editing ? (
        <View>
          <TouchableOpacity onPress={pickAvatar} style={{ alignSelf: 'center' }}>
            {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{name?.trim()?.charAt(0)?.toUpperCase() || '?'}</Text></View>}
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
          <View style={styles.profileHero}>
          <View style={styles.header}>
            {user.avatar_url ? <Image source={{ uri: user.avatar_url }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{user.display_name?.trim()?.charAt(0)?.toUpperCase() || '?'}</Text></View>}
            <View style={{ marginLeft: Spacing.md, flex: 1 }}>
              <Text style={[Typography.h2, { color: Colors.dark.text }]}>{user.display_name}</Text>
              {user.is_founding_host ? <Text style={[Typography.caption, { color: Colors.dark.primary }]}>✦ Founding host</Text> : null}
              <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>{user.bio}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={{ color: Colors.dark.primary, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileStats}><View style={styles.statItem}><Text style={styles.statValue}>{hosting.length}</Text><Text style={styles.statLabel}>Hosting</Text><View style={styles.statMeter}><View style={[styles.statMeterFill, { width: `${Math.min(hosting.length / 10, 1) * 100}%` }]} /></View></View><View style={styles.statDivider}/><View style={styles.statItem}><Text style={styles.statValue}>{attending.length}</Text><Text style={styles.statLabel}>Going</Text><View style={styles.statMeter}><View style={[styles.statMeterFill, { width: `${Math.min(attending.length / 10, 1) * 100}%` }]} /></View></View><View style={styles.statDivider}/><View style={styles.statItem}><Text style={styles.statValue}>{posts.length}</Text><Text style={styles.statLabel}>Posts</Text><View style={styles.statMeter}><View style={[styles.statMeterFill, { width: `${Math.min(posts.length / 10, 1) * 100}%` }]} /></View></View><View style={styles.statDivider}/><View style={styles.statItem}><Text style={styles.statValue}>{followingCount}</Text><Text style={styles.statLabel}>Following</Text><View style={styles.statMeter}><View style={[styles.statMeterFill, { width: `${Math.min(followingCount / 10, 1) * 100}%` }]} /></View></View></View>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: Colors.dark.background, fontSize: 19, fontWeight: '900' },
  brandName: { color: Colors.dark.text, fontSize: 17, fontWeight: '800' },
  brandCaption: { color: Colors.dark.textMuted, fontSize: 8, letterSpacing: 0.7, marginTop: 1 },
  headerAction: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.surface },
  headerActionText: { color: Colors.dark.primary, fontSize: 10, fontWeight: '700' },
  profileHero: { backgroundColor: Colors.dark.surface, borderRadius: 26, padding: 18, borderWidth: 1, borderColor: Colors.dark.borderStrong, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center' },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  statItem: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { color: Colors.dark.text, fontSize: 18, fontWeight: '900' },
  statLabel: { color: Colors.dark.textMuted, fontSize: 10 },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.dark.borderStrong },
  statMeter: { width: '54%', height: 3, marginTop: 4, borderRadius: 2, backgroundColor: Colors.dark.surface3, overflow: 'hidden' },
  statMeterFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.dark.primary },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.dark.glass, borderWidth: 2, borderColor: Colors.dark.primary },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#24263A' },
  avatarInitial: { color: Colors.dark.primary, fontSize: 26, fontWeight: '900' },
  card: { backgroundColor: Colors.dark.surface, padding: 16, borderRadius: Radius.xl, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  input: { backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  btn: { backgroundColor: Colors.dark.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  btnText: { color: Colors.dark.background, fontWeight: '700' },
});
