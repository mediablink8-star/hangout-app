import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { Gathering, Message, JoinRequest } from '../../lib/types';
import { Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { parseMissionDescription } from '../../lib/irlMode';
import ShareSheet from '../../components/ShareSheet';

export default function GatheringDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [g, setG = useState<Gathering | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [host, setHost] = useState<any>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [recapStory, setRecapStory] = useState('');
  const pollRef = useRef<any>(null);

  const load = async () => {
    try {
      const gg = await api.gathering(id!);
      setG(gg);
      if (gg.host) setHost(gg.host);
      try { setMsgs(await api.messages(id!)); } catch {}
    } catch (e: any) { Alert.alert('Error', e.message); }
  };
  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  const join = async () => {
    try { await api.requestJoin(id!); Alert.alert('Requested', 'Waiting for host approval'); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };
  const send = async () => {
    if (!text.trim()) return;
    try { await api.sendMessage(id!, text.trim()); setText(''); load(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (!g) return <View style={styles.container}><Text style={{ color: Colors.dark.text }}>Loading...</Text></View>;

  const mission = parseMissionDescription(g.description);
  const eventEnded = new Date(g.end_time).getTime() <= Date.now();
  const canCreateStory = user?.id === g.host_id || g.my_request_status === 'approved';
  const shareStory = async () => {
    const base = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
    const link = `${base}/share/g/${g.id}`;
    const line = recapStory.trim() || `We made a plan around ${g.title}.`;
    const challengeLine = mission.challenge ? `Our challenge: ${mission.challenge}` : '';
    try {
      await Share.share({
        message: [line, challengeLine, `Find your next real-world plan on Hangout: ${link}`].filter(Boolean).join('\n\n'),
        url: link,
      });
    } catch (e: any) {
      Alert.alert('Couldn’t share your story', e?.message || 'Try again in a moment.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>
      <Text style={[Typography.h1, { color: Colors.dark.text }]}>{g.title}</Text>
      <Text style={[Typography.caption, { color: Colors.dark.primary }]}>{g.category} · {g.visibility}</Text>
      {mission.mystery && <View style={styles.missionBadge}><Text style={styles.missionBadgeText}>✦  MYSTERY MISSION</Text></View>}
      {mission.challenge ? (
        <View style={styles.challengeCard}>
          <Text style={styles.challengeKicker}>THE GROUP CHALLENGE</Text>
          <Text style={styles.challengeBody}>{mission.challenge}</Text>
        </View>
      ) : null}
      {!!mission.description && <Text style={[Typography.body, { color: Colors.dark.textMuted, marginTop: Spacing.sm }]}>{mission.description}</Text>}
      <Text style={[Typography.caption, { color: Colors.dark.textMuted, marginTop: Spacing.md }]}>
        {new Date(g.start_time).toLocaleString()} → {new Date(g.end_time).toLocaleString()}
      </Text>
      <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>Spots left: {g.spots_left ?? g.max_guests} / {g.max_guests}</Text>
      {g.exact && g.address && (
        <Text style={[Typography.body, { color: Colors.dark.success, marginTop: Spacing.sm }]}>📍 {g.address}</Text>
      )}
      {!g.exact && <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>Approx. location (~300m). Exact address after approval.</Text>}

      {host && (
        <TouchableOpacity style={styles.hostCard} onPress={() => router.push(`/u/${host.id}`)}>
          {host.avatar_url ? <Image source={{ uri: host.avatar_url }} style={styles.hostAvatar} /> : <View style={styles.hostAvatar} />}
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>Hosted by</Text>
            <Text style={[Typography.body, { color: Colors.dark.text, fontWeight: '600' }]}>{host.display_name}{host.is_founding_host ? '  ✦ Founding host' : ''}</Text>
            {host.is_founding_host ? <Text style={[Typography.caption, { color: Colors.dark.primary }]}>Founding host (community pioneer)</Text> : null}
          </View>
          <Text style={{ color: Colors.dark.primary }}>›</Text>
        </TouchableOpacity>
      )}

      {g.my_request_status === 'approved' ? (
        <View style={styles.statusBadge}><Text style={styles.statusText}>Approved ✓</Text></View>
      ) : g.my_request_status === 'pending' ? (
        <View style={styles.statusBadge}><Text style={styles.statusText}>Request pending...</Text></View>
      ) : g.my_request_status === 'declined' ? (
        <View style={styles.statusBadge}><Text style={[styles.statusText, { color: Colors.dark.danger }]}>Declined</Text></View>
      ) : (
        <TouchableOpacity style={styles.btn} onPress={join}>
          <Text style={styles.btnText}>Request to join</Text>
        </TouchableOpacity>
      )}

      {(g.host_id === user?.id || g.my_request_status === 'approved') && (
        <TouchableOpacity accessibilityRole="button" style={[styles.btn, { backgroundColor: Colors.dark.surface2, borderWidth: 1, borderColor: Colors.dark.primary, marginTop: Spacing.md }]} onPress={async () => {
          try { const memory = await api.getOrCreateMemory(id!); router.push(`/memories/${memory.id}` as any); }
          catch (e: any) { Alert.alert('Memory unavailable', e.message || 'Please try again.'); }
        }}>
          <Text style={[styles.btnText, { color: Colors.dark.primary }]}>Open private Memory</Text>
        </TouchableOpacity>
      )}

      <Text style={[Typography.h3, { color: Colors.dark.text, marginTop: Spacing.xl }]}>Chat</Text>
      {msgs.map((m) => (
        <View key={m.id} style={styles.msg}>
          <Text style={[Typography.caption, { color: Colors.dark.primary }]}>{m.display_name}</Text>
          <Text style={[Typography.body, { color: Colors.dark.text }]}>{m.body}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', marginTop: Spacing.md }}>
        <TextInput style={[styles.input, { flex: 1 }]} value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={Colors.dark.textMuted} />
        <TouchableOpacity style={styles.sendBtn} onPress={send}><Text style={styles.btnText}>Send</Text></TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border, marginTop: Spacing.md }]} onPress={() => setShareVisible(true)}>
        <Text style={[styles.btnText, { color: Colors.dark.text }]}>Share</Text>
      </TouchableOpacity>
      {eventEnded && canCreateStory && (
        <View style={styles.recapCard}>
          <View style={styles.recapEyebrow}><Text style={styles.recapSpark}>✦</Text><Text style={styles.recapEyebrowText}>THE AFTERGLOW</Text></View>
          <Text style={styles.recapTitle}>Your night, in one story.</Text>
          <Text style={styles.recapCopy}>Add a line in your own words. Your selected challenge and a link to find another plan will be included. Exact location stays private.</Text>
          <TextInput
            accessibilityLabel="Add a line to your hangout recap"
            style={styles.recapInput}
            placeholder="We joined a random hangout and…"
            placeholderTextColor={Colors.dark.textDim}
            value={recapStory}
            onChangeText={setRecapStory}
            maxLength={180}
            multiline
          />
          <TouchableOpacity accessibilityRole="button" style={styles.recapButton} onPress={shareStory}>
            <Ionicons name="share-social" size={17} color={Colors.dark.background} />
            <Text style={styles.recapButtonText}>Share your story</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border, marginTop: Spacing.md }]} onPress={async () => {
        try {
          const c = await api.gatheringConversation(id!);
          router.push(`/chat/${c.id}` as any);
        } catch (e: any) { Alert.alert('Chat unavailable', e.message); }
      }}>
        <Text style={[styles.btnText, { color: Colors.dark.text }]}>Open group chat</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.dark.danger, marginTop: Spacing.xl }]} onPress={() => { api.report('gathering', g.id, 'inappropriate').then(() => Alert.alert('Reported')); }}>
        <Text style={styles.btnText}>Report</Text>
      </TouchableOpacity>
      <ShareSheet visible={shareVisible} onClose={() => setShareVisible(false)} gatheringId={g.id} gatheringTitle={g.title} hostId={host?.id} hostName={host?.display_name} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  btn: { backgroundColor: Colors.dark.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  btnText: { color: Colors.dark.background, fontWeight: '700' },
  input: { backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border },
  sendBtn: { marginLeft: Spacing.sm, backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.md, justifyContent: 'center', borderRadius: Radius.md },
  msg: { backgroundColor: Colors.dark.glass, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  hostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.glass, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  missionBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(201,243,106,0.1)', borderWidth: 1, borderColor: 'rgba(201,243,106,0.2)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, marginTop: Spacing.md },
  missionBadgeText: { color: Colors.dark.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  challengeCard: { backgroundColor: Colors.dark.surface2, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(201,243,106,0.2)', marginTop: Spacing.md },
  challengeKicker: { color: Colors.dark.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  challengeBody: { color: Colors.dark.text, fontSize: 16, lineHeight: 23, fontWeight: '700', marginTop: Spacing.sm },
  recapCard: { backgroundColor: Colors.dark.surface, padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.borderStrong, marginTop: Spacing.xl },
  recapEyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  recapSpark: { color: Colors.dark.primary, fontSize: 15 },
  recapEyebrowText: { color: Colors.dark.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  recapTitle: { color: Colors.dark.text, fontSize: 22, lineHeight: 27, fontWeight: '900', letterSpacing: -0.4, marginTop: Spacing.sm },
  recapCopy: { color: Colors.dark.textMuted, fontSize: 12, lineHeight: 18, marginTop: Spacing.xs },
  recapInput: { minHeight: 72, textAlignVertical: 'top', color: Colors.dark.text, backgroundColor: Colors.dark.background, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border, marginTop: Spacing.md },
  recapButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.dark.primary, borderRadius: Radius.md, marginTop: Spacing.md },
  recapButtonText: { color: Colors.dark.background, fontSize: 13, fontWeight: '900' },
  hostAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.glass },
  statusBadge: { backgroundColor: Colors.dark.glass, padding: Spacing.sm, borderRadius: Radius.md, marginTop: Spacing.md, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.dark.border },
  statusText: { color: Colors.dark.primary, fontWeight: '600' },
});
