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
        <View style={styles.header}>
          <Text style={[Typography.display, { color: Colors.dark.text }]}>Messages</Text>
        </View>
        <View style={{ padding: Spacing.lg }}>
          {[1,2,3,4].map((i) => <View key={i} style={styles.skeleton} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[Typography.display, { color: Colors.dark.text }]}>Messages</Text>
          <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>Your plans, all in one place.</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setSearching((s) => !s)}>
          <Ionicons name="search" size={20} color={Colors.dark.primary} />
        </TouchableOpacity>
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
              <View style={styles.avatar}>
                {item.gathering ? (
                  <Text style={{ fontSize: 18 }}>{categoryEmoji(item.gathering.category)}</Text>
                ) : (
                  <Text style={{ color: Colors.dark.background, fontWeight: '700' }}>{(item.title || '?').charAt(0).toUpperCase()}</Text>
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
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.glass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  searchInput: { flex: 1, backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  chipOn: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  chipText: { color: Colors.dark.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: Colors.dark.background },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { backgroundColor: Colors.dark.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: Colors.dark.background, fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.md },
  emptyBtnText: { color: Colors.dark.background, fontWeight: '700' },
  emptyBtnSecondary: { backgroundColor: Colors.dark.glass, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border },
  emptyBtnSecondaryText: { color: Colors.dark.text, fontWeight: '600' },
  skeleton: { height: 72, backgroundColor: Colors.dark.glass, borderRadius: Radius.md, marginBottom: Spacing.sm },
});