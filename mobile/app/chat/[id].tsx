import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [conv, setConv] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const loadConv = async () => {
    try { const c = await api.conversation(id!); setConv(c); setMuted(!!c.muted); } catch (e: any) { setError(e.message); }
  };
  const loadMessages = async (before?: string) => {
    try {
      const rows = await api.conversationMessages(id!, before, 50);
      if (before) {
        setMsgs((prev) => [...rows, ...prev]);
      } else {
        setMsgs(rows);
      }
      if (rows.length < 50) setHasMore(false);
    } catch (e: any) { setError(e.message); }
  };

  useEffect(() => {
    loadConv();
    loadMessages();
    api.markConversationRead(id!).catch(() => {});
    const t = setInterval(async () => {
      try {
        const rows = await api.conversationMessages(id!, undefined, 50);
        setMsgs((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newOnes = rows.filter((m: any) => !ids.has(m.id));
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [id]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 2000) { setError('Message too long (max 2000)'); return; }
    setSending(true);
    setError(null);
    try {
      const r = await api.sendConversationMessage(id!, trimmed);
      setText('');
      // optimistic append
      const now = new Date().toISOString();
      setMsgs((prev) => [...prev, { id: r.id, conversation_id: id, sender_id: 'me', body: trimmed, is_system: false, created_at: r.created_at || now, sender: { id: 'me', display_name: 'You', avatar_url: '' } }]);
      api.markConversationRead(id!).catch(() => {});
    } catch (e: any) {
      setError(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || msgs.length === 0) return;
    setLoadingOlder(true);
    await loadMessages(msgs[0].created_at);
    setLoadingOlder(false);
  };

  const myId = undefined; // server returns sender; compare by display not needed

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.dark.primary, fontSize: 16 }}>‹ Back</Text></TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, marginLeft: Spacing.sm }} onPress={() => conv?.gathering && router.push(`/g/${conv.gathering.id}`)}>
            <Text style={[Typography.h3, { color: Colors.dark.text }]} numberOfLines={1}>{conv?.gathering?.title || conv?.title || 'Chat'}</Text>
            <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>
              {conv?.gathering ? `${conv.gathering.category} · ${conv.member_count} members` : `${conv?.member_count || 0} members`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => conv?.gathering ? router.push(`/g/${conv.gathering.id}`) : null}>
            <Text style={{ color: Colors.dark.primary, fontSize: 13 }}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMembers(true)}>
            <Text style={{ color: Colors.dark.primary, fontSize: 13 }}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => { try { await api.muteConversation(id!, !muted); setMuted(!muted); } catch {} }}>
            <Text style={{ color: Colors.dark.primary, fontSize: 13 }}>{muted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>
        </View>

        {conv?.read_only && (
          <View style={styles.banner}>
            <Text style={{ color: Colors.dark.accentBlue, fontSize: 12 }}>This gathering was cancelled. Chat is read-only.</Text>
          </View>
        )}

        <FlatList
          ref={flatRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.md }}
          onScroll={(e) => { if (e.nativeEvent.contentOffset.y < 40) loadOlder(); }}
          scrollEventThrottle={400}
          ListHeaderComponent={loadingOlder ? <ActivityIndicator color={Colors.dark.primary} /> : undefined}
          renderItem={({ item }) => {
            const mine = item.sender_id === 'me' || item.sender?.display_name === 'You';
            if (item.is_system) {
              return (
                <View style={styles.systemMsg}>
                  <Text style={styles.systemText}>{item.body}</Text>
                </View>
              );
            }
            return (
              <View style={[styles.msgRow, mine && { justifyContent: 'flex-end' }]}>
                {!mine && (
                  item.sender?.avatar_url
                    ? <Image source={{ uri: item.sender.avatar_url }} style={styles.msgAvatar} />
                    : <View style={styles.msgAvatar} />
                )}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {!mine && <Text style={[Typography.caption, { color: Colors.dark.primary, marginBottom: 2 }]}>{item.sender?.display_name}</Text>}
                  <Text style={{ color: mine ? Colors.dark.background : Colors.dark.text }}>{item.body}</Text>
                  <Text style={[Typography.caption, { color: mine ? Colors.dark.background : Colors.dark.textMuted, fontSize: 10, marginTop: 4, textAlign: 'right' }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
          onContentSizeChange={() => { if (!loadingOlder) flatRef.current?.scrollToEnd({ animated: false }); }}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={conv?.read_only ? 'Read-only' : 'Message...'}
            placeholderTextColor={Colors.dark.textMuted}
            multiline
            maxLength={2000}
            editable={!conv?.read_only}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending || conv?.read_only) && { opacity: 0.4 }]}
            onPress={send}
            disabled={!text.trim() || sending || conv?.read_only}
          >
            <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={showMembers} transparent animationType="slide" onRequestClose={() => setShowMembers(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: Colors.dark.surface, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.lg, maxHeight: '60%' }}>
            <Text style={{ color: Colors.dark.text, fontWeight: '700', fontSize: 16, marginBottom: Spacing.md }}>Members</Text>
            {(conv?.members || []).map((m: any) => (
              <Text key={m.id} style={{ color: Colors.dark.text, paddingVertical: Spacing.xs }}>{m.display_name}</Text>
            ))}
            <TouchableOpacity onPress={() => setShowMembers(false)} style={{ marginTop: Spacing.md, padding: Spacing.md, alignItems: 'center' }}>
              <Text style={{ color: Colors.dark.primary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  banner: { backgroundColor: 'rgba(255,180,0,0.1)', padding: Spacing.sm, alignItems: 'center' },
  msgRow: { flexDirection: 'row', marginBottom: Spacing.sm, alignItems: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.dark.glass, marginRight: Spacing.sm },
  bubble: { maxWidth: '78%', padding: Spacing.md, borderRadius: Radius.lg },
  bubbleMine: { backgroundColor: Colors.dark.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.dark.glass, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.dark.border },
  systemMsg: { alignSelf: 'center', backgroundColor: Colors.dark.glass, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, marginVertical: Spacing.sm },
  systemText: { color: Colors.dark.textMuted, fontSize: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.dark.border, backgroundColor: Colors.dark.background },
  input: { flex: 1, backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, maxHeight: 120 },
  sendBtn: { marginLeft: Spacing.sm, backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.lg },
  sendText: { color: Colors.dark.background, fontWeight: '700' },
  error: { color: Colors.dark.danger, textAlign: 'center', padding: Spacing.sm, fontSize: 12 },
});