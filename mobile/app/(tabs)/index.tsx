import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { Gathering, Category } from '../../lib/types';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import HangoutMap from '../../components/HangoutMap';

const CATS: Category[] = ['coffee', 'study', 'sports', 'outdoors', 'bar', 'party', 'other'];

export default function MapHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [cat, setCat] = useState<Category | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'now' | 'today' | 'upcoming'>('all');

  const load = async () => {
    const q: any = {};
    if (cat) q.category = cat;
    if (timeFilter === 'now') {
      const now = new Date();
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      q.from = now.toISOString();
      q.to = in2h.toISOString();
    } else if (timeFilter === 'today') {
      const now = new Date();
      const eod = new Date(now); eod.setHours(23, 59, 59, 999);
      q.from = now.toISOString();
      q.to = eod.toISOString();
    } else if (timeFilter === 'upcoming') {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      q.from = now.toISOString();
      q.to = in7.toISOString();
    }
    try { setGatherings(await api.gatherings(q)); } catch { /* offline */ }
  };
  useEffect(() => { load(); }, [cat, timeFilter]);

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
        <Text style={styles.logo}>Hangout</Text>
        <Text style={[Typography.body, { color: Colors.dark.textMuted, marginTop: Spacing.sm, textAlign: 'center' }]}>
          Spontaneous hangouts for ages 18–29.{'\n'}Real people, real places, real talk.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/auth')} activeOpacity={0.8}>
          <Text style={styles.btnText}>Get started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[Typography.caption, { color: Colors.dark.textMuted }]}>Hey, {user.display_name}</Text>
          <Text style={[Typography.display, { color: Colors.dark.text }]}>What's happening?</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/notifications')}>
            <Text style={styles.avatarText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/friends')}>
            <Text style={styles.avatarText}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.avatarText}>{user.display_name.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <HangoutMap gatherings={gatherings} onSelect={(id: string) => router.push(`/g/${id}`)} />
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, alignItems: 'center' }}>
          <TouchableOpacity style={[styles.chip, !cat && styles.chipOn]} onPress={() => setCat(null)}>
            <Text style={[styles.chipText, !cat && styles.chipTextOn]}>All</Text>
          </TouchableOpacity>
          {CATS.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, cat === c && styles.chipOn]} onPress={() => setCat(c)}>
              <Text style={[styles.chipText, cat === c && styles.chipTextOn]}>{c}</Text>
            </TouchableOpacity>
          ))}
          {(cat || timeFilter !== 'all') && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setCat(null); setTimeFilter('all'); }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, marginTop: Spacing.xs, alignItems: 'center' }}>
          {(['all', 'now', 'today', 'upcoming'] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, timeFilter === t && styles.chipOn]} onPress={() => setTimeFilter(t)}>
              <Text style={[styles.chipText, timeFilter === t && styles.chipTextOn]}>{t === 'all' ? 'Any time' : t === 'now' ? 'Happening now' : t === 'today' ? 'Later today' : 'Upcoming'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {gatherings.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={[Typography.h3, { color: Colors.dark.text, textAlign: 'center' }]}>Nothing happening nearby yet.</Text>
          <Text style={[Typography.caption, { color: Colors.dark.textMuted, textAlign: 'center', marginTop: Spacing.xs }]}>
            No gatherings match your current search. Be the first to host, widen the area, or view upcoming plans.
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap' }}>
            <TouchableOpacity style={[styles.emptyBtn, { flex: 1, minWidth: 120 }]} onPress={() => router.push('/host/new')}>
              <Text style={styles.emptyBtnText}>Host a Hangout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.emptyBtnSecondary, { flex: 1, minWidth: 120 }]} onPress={() => { setCat(null); setTimeFilter('all'); load(); }}>
              <Text style={styles.emptyBtnSecondaryText}>Explore a wider area</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.emptyBtnSecondary, { marginTop: Spacing.sm }]} onPress={() => { setTimeFilter('upcoming'); }}>
            <Text style={styles.emptyBtnSecondaryText}>View upcoming plans</Text>
          </TouchableOpacity>
          {(cat || timeFilter !== 'all') && (
            <TouchableOpacity style={{ marginTop: Spacing.sm, alignSelf: 'center' }} onPress={() => { setCat(null); setTimeFilter('all'); }}>
              <Text style={{ color: Colors.dark.primary, fontSize: 13, fontWeight: '600' }}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/host/new')} activeOpacity={0.8}>
        <Text style={styles.fabText}>+ Host</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md, zIndex: 10 },
  logo: { fontSize: 42, fontWeight: '900', color: Colors.dark.primary, letterSpacing: -1, textAlign: 'center' },
  avatarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.dark.background, fontWeight: '800', fontSize: 16 },
  filters: { position: 'absolute', top: 118, left: 0, right: 0, zIndex: 5 },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  chipOn: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  chipText: { color: Colors.dark.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: Colors.dark.background },
  clearBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.glassStrong, borderWidth: 1, borderColor: Colors.dark.borderStrong, marginLeft: Spacing.xs },
  clearText: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' },
  emptyCard: { position: 'absolute', bottom: 90, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.dark.glassStrong, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border },
  emptyBtn: { backgroundColor: Colors.dark.primary, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  emptyBtnText: { color: Colors.dark.background, fontWeight: '700', fontSize: 13 },
  emptyBtnSecondary: { backgroundColor: Colors.dark.glass, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  emptyBtnSecondaryText: { color: Colors.dark.text, fontWeight: '600', fontSize: 13 },
  fab: { position: 'absolute', bottom: 90, right: Spacing.lg, backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.full },
  fabText: { color: Colors.dark.background, fontWeight: '700', fontSize: 15 },
  btn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.xl },
  btnText: { color: Colors.dark.background, fontWeight: '700', fontSize: 16 },
});
