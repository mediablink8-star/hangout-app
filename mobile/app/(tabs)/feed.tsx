import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import VideoPlayer from '../../components/VideoPlayer';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api, mediaSource } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface Post {
  id: string;
  user_id: string;
  body: string;
  media_url: string | null;
  media_type: string | null;
  media_items?: { id: string; content_url: string; media_type: 'image' | 'video' }[];
  created_at: string;
  author: { id: string; display_name: string; avatar_url: string };
  likes: number;
  liked: boolean;
}

export default function Feed() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const scrollRef = useRef<any>(null);
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [publicShareConfirmed, setPublicShareConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try { setPosts(await api.feed()); }
    catch { setLoadError(true); }
    finally { setInitialLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));

  const submit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await api.createPost({ body: body.trim(), public_consent: publicShareConfirmed });
      setBody(''); setPublicShareConfirmed(false);
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
  const requestRemoval = (postId: string, mediaId?: string) => Alert.alert('Report or request removal', 'Tell the moderation team if this post is inappropriate or includes you without permission.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Report / request removal', style: 'destructive', onPress: async () => { try { await api.reportFeedMedia(postId, 'I appear in this photo and request review/removal.', mediaId); Alert.alert('Request sent', 'The moderation team can review this post.'); } catch (e: any) { Alert.alert('Could not send request', e.message || 'Please try again.'); } } },
  ]);

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[Typography.h2, { color: Colors.dark.text }]}>Sign in to see the feed</Text>
      </View>
    );
  }

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>
      <View style={styles.pageHeader}>
        <View style={styles.kickerRow}><View style={styles.liveDot} /><Text style={styles.kicker}>THE HANGOUT CIRCLE</Text></View>
        <Text style={[Typography.h1, { color: Colors.dark.text }]}>The circle</Text>
        <Text style={styles.pageSubtitle}>The small moments, spontaneous plans, and people who make them.</Text>
      </View>
      <View style={styles.composer}>
        <Text style={styles.composerTitle}>Share a moment</Text>
        <TextInput accessibilityLabel="Write a post" style={styles.input} placeholder="What’s on your mind?" placeholderTextColor={Colors.dark.textMuted} value={body} onChangeText={setBody} multiline maxLength={1000} />
        <Text style={styles.charCount}>{body.length}/1000</Text>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: publicShareConfirmed }} onPress={() => setPublicShareConfirmed((v) => !v)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: publicShareConfirmed ? Colors.dark.primary : Colors.dark.border }}>
          <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: publicShareConfirmed ? Colors.dark.primary : Colors.dark.textMuted, backgroundColor: publicShareConfirmed ? Colors.dark.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {publicShareConfirmed ? <Text style={{ color: Colors.dark.background, fontWeight: '900' }}>✓</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.dark.text, fontSize: 13, fontWeight: '700' }}>I’m ready to share this publicly</Text>
            <Text style={{ color: Colors.dark.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 }}>Only post photos you have permission to share. Avoid exposing anyone’s private moments, exact location, or identifying details without their consent.</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 8 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose a private Memory to share" style={styles.mediaBtn} onPress={() => router.push('/memories' as any)}><Text style={styles.mediaBtnText}>✦  Share a Memory</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Publish post" style={[styles.postBtn, (posting || !body.trim() || !publicShareConfirmed) && { opacity: 0.5 }]} onPress={submit} disabled={posting || !body.trim() || !publicShareConfirmed}>
            {posting ? <ActivityIndicator color={Colors.dark.background} size="small" /> : <Text style={styles.postBtnText}>Share</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {initialLoading && posts.length === 0 && <View accessibilityLiveRegion="polite" style={styles.stateCard}><ActivityIndicator color={Colors.dark.primary} /><Text style={styles.stateText}>Loading the latest posts…</Text></View>}
      {loadError && !initialLoading && <View accessibilityLiveRegion="polite" style={styles.errorCard}><Text style={styles.stateTitle}>Couldn’t refresh the feed</Text><Text style={styles.stateText}>Check your connection and try again.</Text><TouchableOpacity accessibilityRole="button" style={styles.retryBtn} onPress={load}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>}
      {posts.map((p) => (
        <View key={p.id} onLayout={event => { if (postId && p.id === postId) scrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 10), animated: true }); }} style={[styles.card, p.id === postId && styles.postHighlight]}>
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
          {p.media_items?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: Spacing.md }}>{p.media_items.map(item => <View key={item.id} style={{ width: 240 }}>{item.media_type === 'image' ? <Image source={mediaSource(item.content_url)} style={[styles.media, { width: 240, height: 220, marginTop: 0 }]} resizeMode="cover" accessibilityLabel="Shared Hangout Memory photo" /> : <VideoPlayer uri={mediaSource(item.content_url).uri} headers={mediaSource(item.content_url).headers} style={[styles.media, { width: 240, height: 220, marginTop: 0 }]} />}<TouchableOpacity accessibilityRole="button" onPress={() => requestRemoval(p.id, item.id)} style={{ padding: 9, backgroundColor: Colors.dark.surface2, borderBottomLeftRadius: Radius.md, borderBottomRightRadius: Radius.md }}><Text style={{ color: Colors.dark.textMuted, fontSize: 11, textAlign: 'center' }}>Report media · request removal</Text></TouchableOpacity></View>)}</ScrollView> : null}
          {p.media_url && p.media_type === 'image' && <Image source={{ uri: p.media_url }} style={styles.media} resizeMode="cover" />}
          {p.media_url && p.media_type === 'video' && <VideoPlayer uri={p.media_url} style={styles.media} />}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => toggleLike(p)}>
              <Text style={{ color: p.liked ? Colors.dark.primary : Colors.dark.textMuted, fontWeight: '600' }}>
                {p.liked ? '♥' : '♡'} {p.likes}
              </Text>
            </TouchableOpacity>
            {p.user_id !== user.id && <TouchableOpacity accessibilityRole="button" onPress={() => requestRemoval(p.id)}><Text style={{ color: Colors.dark.textMuted, fontSize: 12 }}>Report</Text></TouchableOpacity>}
          </View>
        </View>
      ))}
      {posts.length === 0 && !initialLoading && !loadError && (
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
  pageHeader: { marginBottom: Spacing.xl, paddingTop: Spacing.md },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  liveDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.dark.primary },
  kicker: { color: Colors.dark.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  pageSubtitle: { color: Colors.dark.textMuted, fontSize: 14, lineHeight: 21, marginTop: Spacing.sm },
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
  composer: { backgroundColor: Colors.dark.surface, padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.borderStrong, marginBottom: Spacing.xl },
  input: { backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.dark.border },
  preview: { marginTop: Spacing.sm },
  previewImg: { width: '100%', height: 160, borderRadius: Radius.md },
  mediaBtn: { backgroundColor: Colors.dark.glass, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border },
  mediaBtnText: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' },
  postBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md, marginLeft: 'auto' },
  postBtnText: { color: Colors.dark.background, fontWeight: '700' },
  card: { backgroundColor: Colors.dark.surface, padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.md },
  postHighlight: { borderColor: Colors.dark.primary, borderWidth: 2 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  media: { width: '100%', height: 240, borderRadius: Radius.md, marginTop: Spacing.sm, backgroundColor: Colors.dark.glass },
  actions: { marginTop: Spacing.sm, flexDirection: 'row' },
});
