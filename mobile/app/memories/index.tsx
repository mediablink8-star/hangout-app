import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { api } from '../../lib/api';

export default function MemoriesList() {
  const router = useRouter();
  const [gatherings, setGatherings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  const load = async () => { setError(''); try { const result = await api.myGatherings(); setGatherings([...result.hosting, ...result.attending].filter((g, index, all) => all.findIndex(x => x.id === g.id) === index)); } catch (e: any) { setError(e.message || 'Could not load your gatherings.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.dark.text}/><Text style={styles.muted}>Back</Text></TouchableOpacity>
    <Text style={styles.eyebrow}>YOUR STORIES</Text><Text style={styles.title}>Memories</Text><Text style={styles.muted}>Private albums for hangouts you host or are approved to attend.</Text>
    {loading && <View style={styles.state}><ActivityIndicator color={Colors.dark.primary}/><Text style={styles.muted}>Loading your gatherings…</Text></View>}
    {!!error && <View style={styles.state}><Text style={styles.cardTitle}>Couldn’t load your Memories</Text><Text style={styles.muted}>{error}</Text><TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>}
    {!loading && !error && !gatherings.length && <View style={styles.state}><Text style={styles.spark}>✦</Text><Text style={styles.cardTitle}>Your next story starts offline</Text><Text style={styles.muted}>Join or host a hangout to open its shared private Memory.</Text></View>}
    {gatherings.map(g => <TouchableOpacity key={g.id} accessibilityRole="button" disabled={opening === g.id} onPress={async () => { setOpening(g.id); try { const memory = await api.getOrCreateMemory(g.id); router.push(`/memories/${memory.id}` as any); } catch (e: any) { setError(e.message || 'Memory unavailable.'); } finally { setOpening(null); } }} style={styles.row}>
      <View style={styles.icon}><Ionicons name="images-outline" size={22} color={Colors.dark.primary}/></View><View style={{flex:1}}><Text style={styles.cardTitle}>{g.title}</Text><Text style={styles.muted}>{new Date(g.start_time).toLocaleDateString()} · Private Memory</Text></View>{opening === g.id ? <ActivityIndicator color={Colors.dark.primary}/> : <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted}/>}
    </TouchableOpacity>)}
  </ScrollView>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:Colors.dark.background},content:{padding:20,paddingBottom:50},back:{height:44,flexDirection:'row',alignItems:'center',gap:8,marginBottom:18},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:Colors.dark.primary},title:{...Typography.h1,color:Colors.dark.text,marginTop:8},muted:{...Typography.caption,color:Colors.dark.textMuted,lineHeight:19,marginTop:6},state:{alignItems:'center',padding:24,marginTop:22,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface},spark:{fontSize:28,color:Colors.dark.primary},cardTitle:{...Typography.h3,color:Colors.dark.text},retry:{marginTop:12,padding:10,backgroundColor:Colors.dark.primary,borderRadius:Radius.md},retryText:{color:Colors.dark.background,fontWeight:'800'},row:{minHeight:78,flexDirection:'row',alignItems:'center',gap:12,padding:14,marginTop:12,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.dark.border,backgroundColor:Colors.dark.surface},icon:{height:44,width:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:Colors.dark.surface2}});
