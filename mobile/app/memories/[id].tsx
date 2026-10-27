import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { api, mediaSource } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import VideoPlayer from '../../components/VideoPlayer';

type Media = { id: string; media_type: 'image' | 'video'; caption: string; created_at: string; content_url: string; uploader: { id: string; display_name: string } };
export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [memory, setMemory] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setError(''); setMemory(await api.memory(id!)); }
    catch (e: any) { setError(e.message || 'Could not load this private Memory.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photo access needed', 'Allow photo-library access to add pictures to this private Memory.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.9, base64: true });
    if (result.canceled) return;
    const assets = result.assets.filter(a => a.base64);
    if (!assets.length) { Alert.alert('No photos selected', 'Choose JPEG, PNG, or WebP images.'); return; }
    setBusy(true);
    let completed = 0;
    try {
      for (const asset of assets) {
        const type = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-m4v'].includes(type) || (asset.fileSize || 0) > 8 * 1024 * 1024) throw new Error('Choose a JPEG, PNG, WebP, MP4, or MOV file up to 8 MB.');
        await api.uploadMemoryMedia(id!, `data:${type};base64,${asset.base64}`);
        completed++;
      }
      await load();
      if (completed) Alert.alert('Added to Memory', `${completed} ${completed === 1 ? 'photo was' : 'photos were'} added privately.`);
    } catch (e: any) { Alert.alert('Upload paused', `${e.message || 'Upload failed.'}${completed ? ` ${completed} photo(s) were saved; you can retry the rest.` : ''}`); await load(); }
    finally { setBusy(false); }
  };
  const loadMore = async () => {
    if (!memory?.next_cursor || loadingMore) return;
    setLoadingMore(true);
    try { const page = await api.memory(id!, memory.next_cursor); setMemory((current: any) => ({ ...current, media: [...current.media, ...page.media], next_cursor: page.next_cursor })); }
    catch (e: any) { Alert.alert('Could not load more', e.message || 'Try again.'); }
    finally { setLoadingMore(false); }
  };
  const remove = (photo: Media) => Alert.alert('Remove this photo?', 'It will also be removed from any public recap that includes it.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { try { await api.deleteMemoryMedia(id!, photo.id); await load(); } catch (e: any) { Alert.alert('Could not remove photo', e.message || 'Try again.'); } } },
  ]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.dark.primary} /><Text style={styles.muted}>Opening your private Memory…</Text></View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={Colors.dark.primary} />}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.dark.text} /><Text style={styles.muted}>Back</Text></TouchableOpacity>
    <Text style={styles.eyebrow}>PRIVATE ALBUM</Text>
    <Text style={styles.title}>{memory?.gathering?.title || 'Hangout Memory'}</Text>
    <Text style={styles.muted}>Only the host and approved attendees can see these photos.</Text>
    <View style={styles.actions}>
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={upload} style={styles.primary}><Ionicons name="add-circle-outline" size={19} color={Colors.dark.background} /><Text style={styles.primaryText}>{busy ? 'Uploading…' : 'Add photos'}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={!memory?.media?.length} onPress={() => router.push(`/memories/${id}/share` as any)} style={[styles.secondary, !memory?.media?.length && styles.disabled]}><Ionicons name="paper-plane-outline" size={18} color={Colors.dark.primary} /><Text style={styles.secondaryText}>Share a memory</Text></TouchableOpacity>
    </View>
    {busy && <View style={styles.progress}><ActivityIndicator color={Colors.dark.primary} /><Text style={styles.muted}>Adding photos securely…</Text></View>}
    {!!error && <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.secondaryText}>Try again</Text></TouchableOpacity></View>}
    {!error && !memory?.media?.length && <View style={styles.empty}><Text style={styles.emptyEmoji}>✦</Text><Text style={styles.cardTitle}>The first story is yours</Text><Text style={styles.muted}>Add a few photos from this hangout. They stay private unless someone chooses specific photos to share.</Text></View>}
    <View style={styles.grid}>{(memory?.media || []).map((photo: Media) => <View key={photo.id} style={styles.photoCard}>
      {photo.media_type === 'image' ? <Image source={mediaSource(photo.content_url)} style={styles.photo} accessibilityLabel={`Photo uploaded by ${photo.uploader.display_name}`} /> : <VideoPlayer {...mediaSource(photo.content_url)} style={styles.photo} />}
      <View style={styles.photoMeta}><Text numberOfLines={1} style={styles.photoBy}>{photo.uploader.display_name}</Text><Text style={styles.photoDate}>{new Date(photo.created_at).toLocaleDateString()}</Text></View>
      {(photo.uploader.id === user?.id || memory?.is_host) && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => remove(photo)} style={styles.remove}><Ionicons name="trash-outline" size={16} color={Colors.dark.text} /></TouchableOpacity>}
    </View>)}</View>
    {!!memory?.next_cursor && <TouchableOpacity accessibilityRole="button" disabled={loadingMore} onPress={loadMore} style={styles.secondary}>{loadingMore ? <ActivityIndicator color={Colors.dark.primary}/> : <Text style={styles.secondaryText}>Load more memories</Text>}</TouchableOpacity>}
    {!!memory?.gathering?.cancelled && <Text style={styles.muted}>This hangout was cancelled. Its existing Memory remains available to approved attendees.</Text>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page:{flex:1,backgroundColor:Colors.dark.background}, content:{padding:20,paddingBottom:60}, center:{flex:1,backgroundColor:Colors.dark.background,alignItems:'center',justifyContent:'center',gap:12}, back:{height:44,flexDirection:'row',alignItems:'center',gap:8,marginBottom:20}, eyebrow:{color:Colors.dark.primary,fontSize:11,fontWeight:'900',letterSpacing:1.5}, title:{...Typography.h1,color:Colors.dark.text,marginTop:8}, muted:{...Typography.caption,color:Colors.dark.textMuted,lineHeight:20,marginTop:7}, actions:{flexDirection:'row',gap:10,marginTop:22}, primary:{flex:1,minHeight:50,borderRadius:Radius.md,backgroundColor:Colors.dark.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7}, primaryText:{color:Colors.dark.background,fontWeight:'800'}, secondary:{flex:1,minHeight:50,borderRadius:Radius.md,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7}, secondaryText:{color:Colors.dark.primary,fontWeight:'800'}, disabled:{opacity:0.45}, progress:{flexDirection:'row',alignItems:'center',gap:10,marginVertical:18}, notice:{marginTop:20,padding:16,borderRadius:Radius.md,backgroundColor:Colors.dark.surface2}, noticeText:{color:Colors.dark.text,marginBottom:10}, empty:{marginTop:24,padding:25,borderRadius:Radius.xl,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface,alignItems:'center'}, emptyEmoji:{color:Colors.dark.primary,fontSize:28}, cardTitle:{...Typography.h3,color:Colors.dark.text,marginTop:10}, grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:22}, photoCard:{width:'48%',flexGrow:1,minWidth:130,borderRadius:Radius.md,overflow:'hidden',backgroundColor:Colors.dark.surface,borderWidth:1,borderColor:Colors.dark.border}, photo:{width:'100%',aspectRatio:1,backgroundColor:Colors.dark.surface2}, photoMeta:{padding:9}, photoBy:{color:Colors.dark.text,fontWeight:'700',fontSize:12}, photoDate:{color:Colors.dark.textMuted,fontSize:10,marginTop:3}, remove:{position:'absolute',top:8,right:8,width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(10,14,19,0.8)'} });
