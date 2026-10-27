import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../../../constants/theme';
import { api, mediaSource } from '../../../lib/api';
import VideoPlayer from '../../../components/VideoPlayer';

const CONSENT_VERSION = 'memory-public-share-v1';
export default function ShareMemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [memory, setMemory] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const pendingSubmission = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => { api.memory(id!).then(setMemory).catch(e => setError(e.message || 'Could not open this Memory.')).finally(() => setLoading(false)); }, [id]);
  const chosen = useMemo(() => (memory?.media || []).filter((item: any) => selected.includes(item.id)), [memory, selected]);
  const toggle = (mediaId: string) => setSelected(current => current.includes(mediaId) ? current.filter(x => x !== mediaId) : current.length >= 10 ? current : [...current, mediaId]);
  const publish = async () => {
    if (!selected.length || !confirmed || publishing) return;
    setPublishing(true); setError('');
    const signature = JSON.stringify({ media_ids: [...selected].sort(), caption: caption.trim() });
    if (!pendingSubmission.current || pendingSubmission.current.signature !== signature) pendingSubmission.current = { signature, key: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 12)}` };
    const key = pendingSubmission.current.key;
    try {
      const result = await api.publishMemory(id!, { media_ids: selected, caption: caption.trim(), public_consent: true, consent_version: CONSENT_VERSION }, key);
      pendingSubmission.current = null;
      Alert.alert('Your recap is live', 'Only the photos you selected were published. Your private album is unchanged.', [
        { text: 'View your post', onPress: () => router.replace({ pathname: '/(tabs)/feed', params: { postId: result.id } } as any) },
        { text: 'Back to Memory', onPress: () => router.back() },
      ]);
      return result;
    } catch (e: any) { setError(e.message || 'Your recap could not be published. Your private Memory is unchanged.'); }
    finally { setPublishing(false); }
  };
  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.dark.primary} /><Text style={styles.muted}>Loading selected photos…</Text></View>;
  if (error && !memory) return <View style={styles.page}><TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.dark.text}/></TouchableOpacity><Text style={styles.title}>Memory unavailable</Text><Text style={styles.muted}>{error}</Text></View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" onPress={() => preview ? setPreview(false) : router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.dark.text}/><Text style={styles.muted}>{preview ? 'Edit selection' : 'Cancel'}</Text></TouchableOpacity>
    <Text style={styles.eyebrow}>{preview ? 'REVIEW BEFORE SHARING' : 'PRIVATE ALBUM'}</Text>
    <Text style={styles.title}>Share a memory</Text>
    <Text style={styles.muted}>{preview ? 'This is what people outside your hangout will see.' : 'Choose only the photos you want to make public.'}</Text>
    {!preview ? <>
      <View style={styles.privateTag}><Ionicons name="lock-closed" color={Colors.dark.primary} size={15}/><Text style={styles.privateTagText}>Private album · {memory?.media?.length || 0} photos</Text></View>
      {!memory?.media?.length ? <View style={styles.empty}><Text style={styles.cardTitle}>No photos yet</Text><Text style={styles.muted}>Add photos to this private Memory before sharing.</Text></View> : <View style={styles.grid}>{memory.media.map((item: any) => {
        const isSelected = selected.includes(item.id);
        return <TouchableOpacity key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${item.media_type} by ${item.uploader.display_name}`} onPress={() => toggle(item.id)} style={[styles.photoCard, isSelected && styles.photoSelected]}>
          {item.media_type === 'image' ? <Image source={mediaSource(item.content_url)} style={styles.photo}/> : <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.surface2 }]}><Ionicons name="videocam" size={34} color={Colors.dark.primary}/><Text style={styles.muted}>VIDEO</Text></View>}
          <View style={styles.check}>{isSelected ? <Ionicons name="checkmark-circle" size={23} color={Colors.dark.primary}/> : <Ionicons name="ellipse-outline" size={23} color="white"/>}</View>
          <View style={styles.photoLabel}><Text numberOfLines={1} style={styles.photoText}>{item.uploader.display_name}</Text></View>
        </TouchableOpacity>;
      })}</View>}
      <Text style={styles.count}>{selected.length} of 10 selected</Text>
      <Text style={styles.label}>Caption <Text style={styles.muted}>(optional)</Text></Text>
      <TextInput accessibilityLabel="Public recap caption" style={styles.input} value={caption} onChangeText={setCaption} maxLength={1000} multiline placeholder="We joined a random hangout and…" placeholderTextColor={Colors.dark.textMuted}/>
      <TouchableOpacity accessibilityRole="button" disabled={!selected.length} onPress={() => { setConfirmed(false); setPreview(true); }} style={[styles.primary, !selected.length && styles.disabled]}><Text style={styles.primaryText}>Preview public post · {selected.length}</Text><Ionicons name="arrow-forward" size={18} color={Colors.dark.background}/></TouchableOpacity>
    </> : <>
      <View style={styles.audience}><Ionicons name="globe-outline" size={18} color={Colors.dark.primary}/><View style={{flex:1}}><Text style={styles.audienceTitle}>Public — visible beyond this hangout</Text><Text style={styles.muted}>Your recap can be seen by Hangout users outside this group.</Text></View></View>
      <View style={styles.previewCard}><Text style={styles.previewAuthor}>Your Hangout recap</Text>{!!caption.trim() && <Text style={styles.caption}>{caption.trim()}</Text>}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewPhotos}>{chosen.map((item: any) => item.media_type === 'image' ? <Image key={item.id} source={mediaSource(item.content_url)} style={styles.previewPhoto}/> : <VideoPlayer key={item.id} {...mediaSource(item.content_url)} style={styles.previewPhoto}/>)}</ScrollView><Text style={styles.previewMeta}>Memory recap · {chosen.length} selected {chosen.length === 1 ? 'item' : 'items'}</Text></View>
      <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed(!confirmed)} style={styles.consent}><View style={[styles.box, confirmed && styles.boxChecked]}>{confirmed && <Ionicons name="checkmark" size={16} color={Colors.dark.background}/>}</View><Text style={styles.consentCopy}>I understand this is public. I have permission to share these selected photos/videos, including any identifiable people shown. I understand people can request removal.</Text></TouchableOpacity>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={!confirmed || publishing} onPress={publish} style={[styles.primary, (!confirmed || publishing) && styles.disabled]}>{publishing ? <ActivityIndicator color={Colors.dark.background}/> : <Ionicons name="paper-plane" size={17} color={Colors.dark.background}/>}<Text style={styles.primaryText}>{publishing ? 'Publishing…' : 'Publish to Feed'}</Text></TouchableOpacity>
      <Text style={styles.finePrint}>Only the {chosen.length} selected {chosen.length === 1 ? 'item is' : 'items are'} shared. Other Memory photos and the hangout location remain private.</Text>
    </>}
  </ScrollView>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:Colors.dark.background},content:{padding:20,paddingBottom:60},center:{flex:1,alignItems:'center',justifyContent:'center',gap:10,backgroundColor:Colors.dark.background},back:{height:44,flexDirection:'row',alignItems:'center',gap:8,marginBottom:18},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:Colors.dark.primary},title:{...Typography.h1,color:Colors.dark.text,marginTop:8},muted:{...Typography.caption,color:Colors.dark.textMuted,lineHeight:19,marginTop:6},privateTag:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:8,borderRadius:Radius.full,backgroundColor:Colors.dark.surface,marginTop:20},privateTagText:{color:Colors.dark.primary,fontSize:12,fontWeight:'700'},grid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:18},photoCard:{width:'48%',flexGrow:1,minWidth:130,aspectRatio:1,borderRadius:Radius.md,overflow:'hidden',borderWidth:2,borderColor:'transparent',backgroundColor:Colors.dark.surface},photoSelected:{borderColor:Colors.dark.primary},photo:{width:'100%',height:'100%',position:'absolute'},check:{position:'absolute',top:8,right:8,width:34,height:34,borderRadius:17,backgroundColor:'rgba(10,14,19,0.7)',alignItems:'center',justifyContent:'center'},photoLabel:{position:'absolute',bottom:0,left:0,right:0,padding:8,backgroundColor:'rgba(10,14,19,0.72)'},photoText:{fontSize:11,color:'white',fontWeight:'700'},count:{color:Colors.dark.primary,fontSize:12,fontWeight:'800',marginTop:13},label:{color:Colors.dark.text,fontWeight:'700',marginTop:22,marginBottom:8},input:{minHeight:76,maxHeight:140,textAlignVertical:'top',padding:13,borderRadius:Radius.md,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface,color:Colors.dark.text},primary:{minHeight:54,borderRadius:Radius.md,backgroundColor:Colors.dark.primary,marginTop:20,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},primaryText:{color:Colors.dark.background,fontWeight:'900'},disabled:{opacity:0.45},empty:{padding:22,marginTop:18,backgroundColor:Colors.dark.surface,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.dark.border},cardTitle:{...Typography.h3,color:Colors.dark.text},audience:{flexDirection:'row',gap:12,padding:15,borderRadius:Radius.md,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface,marginTop:22},audienceTitle:{color:Colors.dark.text,fontWeight:'800'},previewCard:{padding:15,marginTop:16,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface},previewAuthor:{color:Colors.dark.text,fontWeight:'800'},caption:{color:Colors.dark.text,fontSize:15,lineHeight:21,marginTop:12},previewPhotos:{gap:8,marginTop:12},previewPhoto:{width:180,height:180,borderRadius:Radius.md,backgroundColor:Colors.dark.surface2},previewMeta:{color:Colors.dark.primary,fontSize:11,fontWeight:'700',marginTop:12},consent:{flexDirection:'row',alignItems:'flex-start',gap:12,marginTop:18,padding:14,borderRadius:Radius.md,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface},box:{width:24,height:24,borderWidth:1.5,borderColor:Colors.dark.textMuted,borderRadius:6,alignItems:'center',justifyContent:'center'},boxChecked:{borderColor:Colors.dark.primary,backgroundColor:Colors.dark.primary},consentCopy:{flex:1,color:Colors.dark.text,fontSize:12,lineHeight:19},error:{color:Colors.dark.danger,marginTop:12},finePrint:{color:Colors.dark.textMuted,fontSize:11,lineHeight:17,textAlign:'center',marginTop:12}});
