import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import VideoPlayer from '../../components/VideoPlayer';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface Post {
  id: string;
  user_id: string;
  body: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  author: { id: string; display_name: string; avatar_url: string };
  likes: number;
  liked: boolean;
}

export default function Feed() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try { setPosts(await api.feed()); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pickMedia = async (kind: 'image' | 'video') => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        quality: 0.6,
        base64: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      if (!asset?.base64) {
        Alert.alert('Couldn’t attach this file', 'Choose another photo or video and try again.');
        return;
      }
      const approximateBytes = asset.fileSize ?? Math.ceil(asset.base64.length * 0.75);
      if (approximateBytes > 10 * 1024 * 1024) {
        Alert.alert('File is too large', 'Choose a photo or video under 10 MB.');
        return;
      }
      const type = kind === 'image' ? 'image/jpeg' : 'video/mp4';
      setMedia({ url: `data:${type};base64,${asset.base64}`, type: kind });
    } catch {
      Alert.alert('Couldn’t open your library', 'Check photo access in your device settings and try again.');
    }
  };

  const submit = async () => {
    if (!body.trim() && !media) return;
    setPosting(true);
    try {
      await api.createPost({ body: body.trim(), media_url: media?.url || null, media_type: media?.type || null });
      setBody(''); setMedia(null);
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    setPosting(false);
  };

  const toggleLike = async (p: Post) => {
    try {
      if (p.liked) await api.unlikePost(p.id); else await api.likePost(p.id);
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (p.liked ? -1 : 1) } : x));
    } catch {}
  };

  const del = async (id: string) => {
    try { await api.deletePost(id); setPosts((prev) => prev.filter((p) => p.id !== id)); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[Typography.h2, { color: Colors.dark.text }]}>Sign in to see the feed</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>
      <View style={styles.pageHeader}>
        <View style={styles.kickerRow}><View style={styles.liveDot} /><Text style={styles.kicker}>YOUR HANGOUT CIRCLE</Text></View>
        <Text style={[Typography.h1, { color: Colors.dark.text }]}>Community</Text>
        <Text style={styles.pageSubtitle}>Good plans start with a little conversation.</Text>
      </View>
      <View style={styles.composer}>
        <Text style={styles.composerTitle}>Share a moment</Text>
        <TextInput accessibilityLabel="Write a post" style={styles.input} placeholder="What’s on your mind?" placeholderTextColor={Colors.dark.textMuted} value={body} onChangeText={setBody} multiline maxLength={1000} />
        <Text style={styles.charCount}>{body.length}/1000</Text>
        {media && (
          <View style={styles.preview}>
            {media.type === 'image' ? <Image source={{ uri: media.url }} style={styles.previewImg} /> : <Text style={{ color: Colors.dark.text }}>Video attached</Text>}
            <TouchableOpacity onPress={() => setMedia(null)}><Text style={{ color: Colors.dark.danger, marginTop: 4 }}>Remove</Text></TouchableOpacity>
          </View>
        )}
        <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 8 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a photo" style={styles.mediaBtn} onPress={() => pickMedia('image')}><Text style={styles.mediaBtnText}>▧  Photo</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a video" style={styles.mediaBtn} onPress={() => pickMedia('video')}><Text style={styles.mediaBtnText}>▷  Video</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Publish post" style={[styles.postBtn, (posting || (!body.trim() && !media)) && { opacity: 0.5 }]} onPress={submit} disabled={posting || (!body.trim() && !media)}>
            {posting ? <ActivityIndicator color={Colors.dark.background} size="small" /> : <Text style={styles.postBtnText}>Share</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {loading && <View accessibilityLiveRegion="polite" style={styles.stateCard}><ActivityIndicator color={Colors.dark.primary} /><Text style={styles.stateText}>Loading the latest posts…</Text></View>}
      {loadError && !loading && <View accessibilityLiveRegion="polite" style={styles.errorCard}><Text style={styles.stateTitle}>Couldn’t refresh the feed</Text><Text style={styles.stateText}>Check your connection and try again.</Text><TouchableOpacity accessibilityRole="button" style={styles.retryBtn} onPress={load}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>}
      {posts.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.authorRow}>
            {p.author.avatar_url ? <Image source={{ uri: p.author.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar} />}
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <Text style={[Typography.body, { color: Colors.dark.text, fontWeight: '600' }]}>{p.author.display_name}</Text>
              <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>{new Date(p.created_at).toLocaleString()}</Text>
            </View>
            {p.user_id === user.id && (
              <TouchableOpacity onPress={() => del(p.id)}><Text style={{ color: Colors.dark.danger }}>Delete</Text></TouchableOpacity>
            )}
          </View>
          {p.body ? <Text style={[Typography.body, { color: Colors.dark.text, marginTop: Spacing.sm }]}>{p.body}</Text> : null}
          {p.media_url && p.media_type === 'image' && <Image source={{ uri: p.media_url }} style={styles.media} resizeMode="cover" />}
          {p.media_url && p.media_type === 'video' && <VideoPlayer uri={p.media_url} style={styles.media} />}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => toggleLike(p)}>
              <Text style={{ color: p.liked ? Colors.dark.primary : Colors.dark.textMuted, fontWeight: '600' }}>
                {p.liked ? '♥' : '♡'} {p.likes}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {posts.length === 0 && !loading && !loadError && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyMark}>✦</Text>
          <Text style={styles.stateTitle}>A fresh start</Text>
          <Text style={[Typography.body, { color: Colors.dark.textMuted, textAlign: 'center', marginTop: Spacing.xs }]}>
          No posts yet. Share something and start the conversation.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  pageHeader: { marginBottom: Spacing.lg },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  liveDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.dark.primary },
  kicker: { color: Colors.dark.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  pageSubtitle: { color: Colors.dark.textMuted, fontSize: 14, marginTop: Spacing.xs },
  composerTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700', marginBottom: Spacing.sm },
  charCount: { color: Colors.dark.textDim, fontSize: 11, textAlign: 'right', marginTop: Spacing.xs },
  stateCard: { alignItems: 'center', backgroundColor: Colors.dark.glass, padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.md, gap: Spacing.sm },
  errorCard: { alignItems: 'center', backgroundColor: Colors.dark.glass, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.md },
  stateTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  stateText: { color: Colors.dark.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.sm },
  retryText: { color: Colors.dark.background, fontWeight: '700', fontSize: 13 },
  emptyCard: { alignItems: 'center', backgroundColor: Colors.dark.glass, padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, marginTop: Spacing.sm },
  emptyMark: { color: Colors.dark.primary, fontSize: 28, marginBottom: Spacing.sm },
  composer: { backgroundColor: Colors.dark.glassStrong, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.lg },
  input: { backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.dark.border },
  preview: { marginTop: Spacing.sm },
  previewImg: { width: '100%', height: 160, borderRadius: Radius.md },
  mediaBtn: { backgroundColor: Colors.dark.glass, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border },
  mediaBtnText: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' },
  postBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md, marginLeft: 'auto' },
  postBtnText: { color: Colors.dark.background, fontWeight: '700' },
  card: { backgroundColor: Colors.dark.glass, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.md },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  media: { width: '100%', height: 240, borderRadius: Radius.md, marginTop: Spacing.sm, backgroundColor: Colors.dark.glass },
  actions: { marginTop: Spacing.sm, flexDirection: 'row' },
});