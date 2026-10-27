import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { Gathering, Category } from '../../lib/types';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import HangoutMap from '../../components/HangoutMap';
import * as Location from 'expo-location';
import { distanceInKm, IRL_MOODS, IrlMood, parseMissionDescription } from '../../lib/irlMode';

const CATS: Category[] = ['coffee', 'study', 'sports', 'outdoors', 'bar', 'party', 'other'];

export default function MapHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [cat, setCat] = useState<Category | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'now' | 'today' | 'upcoming'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [irlSheet, setIrlSheet] = useState(false);
  const [selectedMood, setSelectedMood] = useState<IrlMood>('adventurous');
  const [selectedRange, setSelectedRange] = useState(5);
  const [irlSearch, setIrlSearch] = useState<{ mood: IrlMood; radiusKm: number; latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const requestId = useRef(0);

  const load = async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setLoadError(false);
    const q: any = {};
    if (irlSearch) {
      const now = new Date();
      q.category = IRL_MOODS.find((mood) => mood.id === irlSearch.mood)?.category;
      q.from = now.toISOString();
      q.to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else {
      if (cat) q.category = cat;
    }
    if (!irlSearch && timeFilter === 'now') {
      const now = new Date();
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      q.from = now.toISOString();
      q.to = in2h.toISOString();
    } else if (!irlSearch && timeFilter === 'today') {
      const now = new Date();
      const eod = new Date(now); eod.setHours(23, 59, 59, 999);
      q.from = now.toISOString();
      q.to = eod.toISOString();
    } else if (!irlSearch && timeFilter === 'upcoming') {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      q.from = now.toISOString();
      q.to = in7.toISOString();
    }
    try {
      const results = await api.gatherings(q);
      const nearby = irlSearch
        ? results.filter((g: Gathering) => distanceInKm(irlSearch.latitude, irlSearch.longitude, g.lat, g.lng) <= irlSearch.radiusKm)
          .sort((a: Gathering, b: Gathering) => Number(!!parseMissionDescription(b.description).challenge) - Number(!!parseMissionDescription(a.description).challenge))
        : results;
      if (currentRequest === requestId.current) setGatherings(nearby);
    } catch {
      if (currentRequest === requestId.current) setLoadError(true);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  };
  useEffect(() => { load(); }, [cat, timeFilter, irlSearch]);

  const findNearbyPlans = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location helps us find nearby plans', 'Allow approximate location access, or keep exploring the map without IRL mode.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCat(null);
      setTimeFilter('all');
      setIrlSearch({ mood: selectedMood, radiusKm: selectedRange, latitude: position.coords.latitude, longitude: position.coords.longitude });
      setIrlSheet(false);
    } catch {
      Alert.alert('Couldn’t get your location', 'Try again or keep exploring the map without IRL mode.');
    } finally {
      setLocating(false);
    }
  };

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
        <View style={styles.brandRow}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View>
            <View>
              <Text style={styles.brandName}>hangout</Text>
              <Text style={styles.brandCaption}>YOUR CITY, TOGETHER</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={19} color={Colors.dark.text} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Friends" style={styles.iconBtn} onPress={() => router.push('/friends')}>
              <Ionicons name="people-outline" size={19} color={Colors.dark.text} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Your profile" style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.profileBtnText}>{(user.display_name?.trim() || 'H').charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>GOOD TO SEE YOU, {(user.display_name?.trim() || 'FRIEND').split(/\s+/)[0].toUpperCase()}</Text>
            <Text style={styles.headline}>Find your people.</Text>
          </View>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveLabel}>{gatherings.length} PLANS</Text></View>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.irlCta} onPress={() => setIrlSheet(true)}>
          <View style={styles.irlCtaIcon}><Ionicons name="sparkles" size={20} color={Colors.dark.background} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.irlCtaTitle}>I’m bored</Text>
            <Text style={styles.irlCtaCopy}>Find a real plan for the next 24 hours</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.dark.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.filters}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, alignItems: 'center' }}>
          <TouchableOpacity style={[styles.chip, !cat && styles.chipOn]} onPress={() => setCat(null)}>
            <Text style={[styles.chipText, !cat && styles.chipTextOn]}>All</Text>
          </TouchableOpacity>
          {CATS.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, cat === c && styles.chipOn]} onPress={() => { setIrlSearch(null); setCat(c); }}>
              <Text style={[styles.chipText, cat === c && styles.chipTextOn]}>{c}</Text>
            </TouchableOpacity>
          ))}
          {(cat || timeFilter !== 'all' || irlSearch) && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setCat(null); setTimeFilter('all'); setIrlSearch(null); }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, marginTop: Spacing.xs, alignItems: 'center' }}>
          {(['all', 'now', 'today', 'upcoming'] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, timeFilter === t && styles.chipOn]} onPress={() => { setIrlSearch(null); setTimeFilter(t); }}>
              <Text style={[styles.chipText, timeFilter === t && styles.chipTextOn]}>{t === 'all' ? 'Any time' : t === 'now' ? 'Happening now' : t === 'today' ? 'Later today' : 'Upcoming'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {irlSearch && (
          <View style={styles.searchScope}>
            <Ionicons name="navigate" size={14} color={Colors.dark.primary} />
            <Text style={styles.searchScopeText}>{IRL_MOODS.find((item) => item.id === irlSearch.mood)?.label} plans · within about {irlSearch.radiusKm} km</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear IRL mode filters" onPress={() => setIrlSearch(null)}><Ionicons name="close-circle" size={18} color={Colors.dark.textMuted} /></TouchableOpacity>
          </View>
        )}
      </View>
      <HangoutMap gatherings={gatherings} onSelect={(id: string) => router.push(`/g/${id}`)} />
      {isLoading && (
        <View accessibilityLiveRegion="polite" style={styles.statusCard}>
          <ActivityIndicator color={Colors.dark.primary} size="small" />
          <Text style={styles.statusText}>Finding hangouts…</Text>
        </View>
      )}
      {loadError && !isLoading && (
        <View accessibilityLiveRegion="polite" style={styles.statusCard}>
          <Text style={[Typography.h3, { color: Colors.dark.text }]}>Map couldn’t load</Text>
          <Text style={[Typography.caption, { color: Colors.dark.textMuted, marginTop: Spacing.xs }]}>Check your connection and try again.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isLoading && !loadError && gatherings.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={[Typography.h3, { color: Colors.dark.text, textAlign: 'center' }]}>Nothing happening nearby yet.</Text>
          <Text style={[Typography.caption, { color: Colors.dark.textMuted, textAlign: 'center', marginTop: Spacing.xs }]}>
            {irlSearch ? 'No real plans match this mood and radius yet. Try a wider area or host a mission.' : 'No gatherings match your current search. Be the first to host, widen the area, or view upcoming plans.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap' }}>
            <TouchableOpacity style={[styles.emptyBtn, { flex: 1, minWidth: 120 }]} onPress={() => router.push(irlSearch ? '/host/new?mission=1' : '/host/new')}>
              <Text style={styles.emptyBtnText}>{irlSearch ? 'Host a mission' : 'Host a Hangout'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.emptyBtnSecondary, { flex: 1, minWidth: 120 }]} onPress={() => { setCat(null); setTimeFilter('all'); setIrlSearch(null); }}>
              <Text style={styles.emptyBtnSecondaryText}>Explore a wider area</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.emptyBtnSecondary, { marginTop: Spacing.sm }]} onPress={() => { setIrlSearch(null); setTimeFilter('upcoming'); }}>
            <Text style={styles.emptyBtnSecondaryText}>View upcoming plans</Text>
          </TouchableOpacity>
          {(cat || timeFilter !== 'all' || irlSearch) && (
            <TouchableOpacity style={{ marginTop: Spacing.sm, alignSelf: 'center' }} onPress={() => { setCat(null); setTimeFilter('all'); setIrlSearch(null); }}>
              <Text style={{ color: Colors.dark.primary, fontSize: 13, fontWeight: '600' }}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {gatherings.length > 0 && !isLoading && !loadError && <TouchableOpacity style={styles.fab} onPress={() => router.push('/host/new')} activeOpacity={0.8}>
        <Text style={styles.fabText}>+ Host</Text>
      </TouchableOpacity>}
      <Modal visible={irlSheet} transparent animationType="slide" onRequestClose={() => setIrlSheet(false)}>
        <View style={styles.sheetBackdrop}>
          <ScrollView style={styles.irlSheet} contentContainerStyle={styles.irlSheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetEyebrow}><Ionicons name="flash" size={14} color={Colors.dark.primary} /><Text style={styles.sheetEyebrowText}>HANGOUT: IRL MODE</Text></View>
            <Text style={styles.sheetTitle}>Less scrolling.{`\n`}More stories.</Text>
            <Text style={styles.sheetSubtitle}>What kind of plan sounds good right now?</Text>
            <View style={styles.moodGrid}>
              {IRL_MOODS.map((item) => (
                <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityState={{ selected: selectedMood === item.id }} style={[styles.moodCard, selectedMood === item.id && styles.moodCardOn]} onPress={() => setSelectedMood(item.id)}>
                  <Ionicons name={item.icon as any} size={20} color={selectedMood === item.id ? Colors.dark.primary : Colors.dark.textMuted} />
                  <Text style={[styles.moodTitle, selectedMood === item.id && styles.moodTitleOn]}>{item.label}</Text>
                  <Text style={styles.moodHint}>{item.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.rangeLabel}>HOW FAR FEELS GOOD?</Text>
            <View style={styles.rangeRow}>{[1, 3, 5, 10].map((km) => (
              <TouchableOpacity key={km} accessibilityRole="button" accessibilityState={{ selected: selectedRange === km }} style={[styles.rangeChip, selectedRange === km && styles.rangeChipOn]} onPress={() => setSelectedRange(km)}><Text style={[styles.rangeText, selectedRange === km && styles.rangeTextOn]}>{km} km</Text></TouchableOpacity>
            ))}</View>
            <Text style={styles.locationNote}>We use your location once to find nearby plans. Before you join, you’ll see the activity, time, approximate area, and host safety details. Mystery never means a hidden destination.</Text>
            <TouchableOpacity accessibilityRole="button" style={[styles.findButton, locating && { opacity: 0.7 }]} onPress={findNearbyPlans} disabled={locating}>
              {locating ? <ActivityIndicator color={Colors.dark.background} /> : <><Text style={styles.findButtonText}>Find a real plan</Text><Ionicons name="arrow-forward" size={19} color={Colors.dark.background} /></>}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.createMissionLink} onPress={() => { setIrlSheet(false); router.push('/host/new?mission=1'); }}><Text style={styles.createMissionText}>Rather host one? Add a mission challenge</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.md, zIndex: 10, backgroundColor: Colors.dark.background },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: Colors.dark.background, fontSize: 20, fontWeight: '900', letterSpacing: -1 },
  brandName: { color: Colors.dark.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.6 },
  brandCaption: { color: Colors.dark.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 1.25, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  iconBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: Colors.dark.surface2, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center' },
  profileBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  profileBtnText: { color: Colors.dark.background, fontWeight: '900', fontSize: 15 },
  welcomeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: Spacing.lg },
  greeting: { color: Colors.dark.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.15, marginBottom: Spacing.xs },
  headline: { color: Colors.dark.text, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.surface2, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.dark.primary },
  liveLabel: { color: Colors.dark.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  irlCta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, marginTop: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(201,243,106,0.24)', backgroundColor: Colors.dark.surface2 },
  irlCtaIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  irlCtaTitle: { color: Colors.dark.text, fontSize: 14, fontWeight: '800' },
  irlCtaCopy: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 2 },
  searchScope: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginHorizontal: Spacing.lg, marginBottom: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.dark.surface2, borderWidth: 1, borderColor: Colors.dark.border },
  searchScopeText: { flex: 1, color: Colors.dark.textMuted, fontSize: 11, fontWeight: '600' },
  logo: { fontSize: 42, fontWeight: '900', color: Colors.dark.primary, letterSpacing: -1, textAlign: 'center' },
  filters: { backgroundColor: Colors.dark.background, paddingBottom: Spacing.sm, paddingTop: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  chipOn: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  chipText: { color: Colors.dark.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: Colors.dark.background },
  clearBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.glassStrong, borderWidth: 1, borderColor: Colors.dark.borderStrong, marginLeft: Spacing.xs },
  clearText: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' },
  statusCard: { position: 'absolute', bottom: 96, left: Spacing.lg, right: Spacing.lg, alignItems: 'center', backgroundColor: Colors.dark.glassStrong, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  statusText: { color: Colors.dark.textMuted, fontSize: 13, fontWeight: '600' },
  retryBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.xs },
  retryText: { color: Colors.dark.background, fontWeight: '700', fontSize: 13 },
  emptyCard: { position: 'absolute', bottom: 96, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.dark.glassStrong, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border },
  emptyBtn: { backgroundColor: Colors.dark.primary, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  emptyBtnText: { color: Colors.dark.background, fontWeight: '700', fontSize: 13 },
  emptyBtnSecondary: { backgroundColor: Colors.dark.glass, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  emptyBtnSecondaryText: { color: Colors.dark.text, fontWeight: '600', fontSize: 13 },
  fab: { position: 'absolute', bottom: 96, right: Spacing.lg, backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.full },
  fabText: { color: Colors.dark.background, fontWeight: '700', fontSize: 15 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.64)' },
  irlSheet: { maxHeight: '92%', backgroundColor: Colors.dark.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: Colors.dark.borderStrong },\n  irlSheetContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: Radius.full, backgroundColor: Colors.dark.textDim, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetEyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sheetEyebrowText: { color: Colors.dark.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.25 },
  sheetTitle: { color: Colors.dark.text, fontSize: 29, lineHeight: 32, fontWeight: '900', letterSpacing: -0.9, marginTop: Spacing.sm },
  sheetSubtitle: { color: Colors.dark.textMuted, fontSize: 13, marginTop: Spacing.xs, marginBottom: Spacing.md },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodCard: { width: '47%', minHeight: 92, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.background },
  moodCardOn: { borderColor: Colors.dark.primary, backgroundColor: 'rgba(201,243,106,0.06)' },
  moodTitle: { color: Colors.dark.text, fontWeight: '800', fontSize: 13, marginTop: Spacing.xs },
  moodTitleOn: { color: Colors.dark.primary },
  moodHint: { color: Colors.dark.textMuted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  rangeLabel: { color: Colors.dark.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  rangeRow: { flexDirection: 'row', gap: Spacing.sm },
  rangeChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.background },
  rangeChipOn: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primary },
  rangeText: { color: Colors.dark.textMuted, fontSize: 12, fontWeight: '700' },
  rangeTextOn: { color: Colors.dark.background },
  locationNote: { color: Colors.dark.textMuted, fontSize: 11, lineHeight: 16, marginTop: Spacing.md },
  findButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 52, backgroundColor: Colors.dark.primary, borderRadius: Radius.lg, marginTop: Spacing.lg },
  findButtonText: { color: Colors.dark.background, fontSize: 14, fontWeight: '900' },
  createMissionLink: { alignItems: 'center', paddingTop: Spacing.md },
  createMissionText: { color: Colors.dark.textMuted, fontSize: 12, fontWeight: '700' },
  btn: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.xl },
  btnText: { color: Colors.dark.background, fontWeight: '700', fontSize: 16 },
});
