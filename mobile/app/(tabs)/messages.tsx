import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import { api } from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Conv = any;

export default function MessagesInbox() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'gatherings' | 'direct'>('all');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.conversations(searching ? q : undefined);
      setConvs(data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [searching, q]);
  useEffect(() => { load(); }, [filter, searching, load]);
  useEffect(() => {
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [filter, searching, q, load]);

  const filtered = convs.filter((c) => {
    if (filter === 'unread') return (c.unread_count || 0) > 0;
    if (filter === 'gatherings') return c.type === 'gathering';
    if (filter === 'direct') return c.type === 'direct';
    return true;
  });

  const totalUnread = convs.reduce((s, c) => s + (c.unread_count || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBrandRow}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View>
            <View><Text style={styles.brandName}>Hangout</Text><Text style={styles.brandCaption}>YOUR CITY, TOGETHER</Text></View>
          </View>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Messages</Text>
          <Text style={styles.pageSubtitle}>Bringing your people together.</Text>
        </View>
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
          {[1,2,3,4,5].map((i) => <View key={i} style={styles.skeleton} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBrandRow}>
        <View style={styles.brandLockup}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View>
          <View><Text style={styles.brandName}>Hangout</Text><Text style={styles.brandCaption}>YOUR CITY, TOGETHER</Text></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Search messages" style={styles.iconBtn} onPress={() => setSearching((s) => !s)}>
            <Ionicons name="search" size={19} color={Colors.dark.text} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="New message" style={styles.iconBtn} onPress={() => router.push('/friends')}>
            <Ionicons name="create-outline" size={19} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>Messages</Text>
        <Text style={styles.pageSubtitle}>Pick up where your plans left off.</Text>
        {totalUnread > 0 && <Text style={styles.unreadSummary}>{totalUnread} unread {totalUnread === 1 ? 'message' : 'messages'}</Text>}
      </View>

      {searching && (
        <View style={styles.searchBar}>
          <TextInput style={styles.searchInput} placeholder="Search conversations..." placeholderTextColor={Colors.dark.textMuted} value={q} onChangeText={setQ} autoFocus onSubmitEditing={load} returnKeyType="search" />
          <TouchableOpacity onPress={() => { setSearching(false); setQ(''); load(); }}>
            <Text style={{ color: Colors.dark.primary, marginLeft: Spacing.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignItems: 'center', gap: Spacing.sm }}>
        {(['all', 'unread', 'gatherings', 'direct'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipOn]} onPress={() => setFilter(f)}>
            <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>
              {f === 'all' ? 'All' : f === 'unread' ? `Unread${totalUnread ? ' (' + totalUnread + ')' : ''}` : f === 'gatherings' ? 'Gatherings' : 'Direct'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.empty}>
          <Text style={[Typography.h3, { color: Colors.dark.text, textAlign: 'center' }]}>Couldn’t load conversations</Text>
          <Text style={[Typography.caption, { color: Colors.dark.textMuted, textAlign: 'center', marginTop: Spacing.xs }]}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={load}><Text style={styles.emptyBtnText}>Try again</Text></TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          {filter === 'unread' ? (
            <>
              <Text style={[Typography.h3, { color: Colors.dark.text, textAlign: 'center' }]}>You're all caught up.</Text>
              <Text style={[Typography.caption, { color: Colors.dark.textMuted, textAlign: 'center', marginTop: Spacing.xs }]}>No unread conversations.</Text>
            </>
          ) : (
            <>
              <Text style={[Typography.h3, { color: Colors.dark.text, textAlign: 'center' }]}>Your next plan starts here.</Text>
              <Text style={[Typography.caption, { color: Colors.dark.textMuted, textAlign: 'center', marginTop: Spacing.xs }]}>
                Join a Hangout or host one to start connecting with people.
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)')}>
                  <Text style={styles.emptyBtnText}>Explore Hangouts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emptyBtnSecondary} onPress={() => router.push('/host/new')}>
                  <Text style={styles.emptyBtnSecondaryText}>Host a Hangout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => { api.markConversationRead(item.id).catch(()=>{}); router.push(`/chat/${item.id}` as any); }}>
              <View style={[styles.avatar, item.unread_count > 0 && styles.avatarUnread]}>
                {item.gathering ? (
                  <Text style={{ fontSize: 20 }}>{categoryEmoji(item.gathering.category)}</Text>
                ) : (
                  <Text style={{ color: Colors.dark.primary, fontSize: 18, fontWeight: '900' }}>{(item.title || '?').charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[Typography.body, { color: Colors.dark.text, fontWeight: (item.unread_count || 0) > 0 ? '700' : '500' }]} numberOfLines={1}>
                    {item.gathering?.title || item.title || 'Conversation'}
                  </Text>
                  <Text style={[Typography.caption, { color: Colors.dark.textMuted, fontSize: 11 }]}>
                    {item.last_message_at ? timeAgo(item.last_message_at) : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <Text style={[Typography.caption, { color: Colors.dark.textMuted }]} numberOfLines={1}>
                    {item.last_message_preview || 'No messages yet'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    {item.muted && <Text style={{ fontSize: 11 }}>🔇</Text>}
                    {(item.unread_count || 0) > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {item.gathering && (
                  <Text style={[Typography.caption, { color: Colors.dark.primary, fontSize: 11, marginTop: 2 }]}>
                    {item.gathering.category} · {item.member_count} members
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function categoryEmoji(c: string) {
  switch (c) {
    case 'coffee': return '☕'; case 'study': return '📚'; case 'sports': return '⚽';
    case 'outdoors': return '🌳'; case 'bar': return '🍸'; case 'party': return '🎉'; default: return '📍';
  }
}
function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  return Math.floor(diff / 86400000) + 'd';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  topBrandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.md },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: Colors.dark.background, fontSize: 20, fontWeight: '900' },
  brandName: { color: Colors.dark.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  brandCaption: { color: Colors.dark.textMuted, fontSize: 8, letterSpacing: 0.8, marginTop: 1 },
  titleBlock: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  pageTitle: { color: Colors.dark.text, fontSize: 29, fontWeight: '900', letterSpacing: -0.8 },
  pageSubtitle: { color: Colors.dark.textMuted, fontSize: 12, marginTop: 3 },
  unreadSummary: { color: Colors.dark.primary, fontSize: 11, fontWeight: '700', marginTop: 7 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.dark.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.dark.borderStrong },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  searchInput: { flex: 1, backgroundColor: Colors.dark.surface, color: Colors.dark.text, paddingHorizontal: Spacing.md, paddingVertical: 13, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.borderStrong, fontSize: 14 },
  chip: { paddingHorizontal: 17, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  chipOn: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  chipText: { color: Colors.dark.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: Colors.dark.background },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: 9, paddingHorizontal: Spacing.md, paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.surface },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#24263A', borderWidth: 1, borderColor: Colors.dark.borderStrong, alignItems: 'center', justifyContent: 'center' },
  avatarUnread: { borderColor: Colors.dark.primary, borderWidth: 2 },
  unreadBadge: { backgroundColor: Colors.dark.primary, minWidth: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, shadowColor: Colors.dark.primary, shadowOpacity: 0.18, shadowRadius: 8, elevation: 2 },
  unreadText: { color: Colors.dark.background, fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.md },
  emptyBtnText: { color: Colors.dark.background, fontWeight: '700' },
  emptyBtnSecondary: { backgroundColor: Colors.dark.glass, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border },
  emptyBtnSecondaryText: { color: Colors.dark.text, fontWeight: '600' },
  skeleton: { height: 76, backgroundColor: Colors.dark.surface, borderRadius: Radius.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.borderStrong },
});