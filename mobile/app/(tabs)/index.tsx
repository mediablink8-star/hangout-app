import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert, ImageBackground, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { Gathering, Category } from '../../lib/types';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import HangoutMap from '../../components/HangoutMap';
import LiquidGlassBackground from '../../components/LiquidGlassBackground';
import * as Location from 'expo-location';
import { distanceInKm, IRL_MOODS, IrlMood, parseMissionDescription } from '../../lib/irlMode';

const CATS: Category[] = ['coffee', 'study', 'sports', 'outdoors', 'bar', 'party', 'other'];

function categoryImage(category: string) {
  switch (category) {
    case 'coffee': return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=85';
    case 'study': return 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=85';
    case 'sports': return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=85';
    case 'outdoors': return 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=85';
    case 'bar': return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=85';
    case 'party': return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85';
    default: return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85';
  }
}

function categoryIcon(category: string) {
  switch (category) {
    case 'coffee': return 'cafe-outline'; case 'study': return 'book-outline'; case 'sports': return 'football-outline';
    case 'outdoors': return 'leaf-outline'; case 'bar': return 'wine-outline'; case 'party': return 'musical-notes-outline'; default: return 'sparkles-outline';
  }
}

export default function MapHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [browseMode, setBrowseMode] = useState<'Subscriptions' | 'Explore'>('Explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
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
  const introProgress = useRef(new Animated.Value(0)).current;

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
  useEffect(() => {
    Animated.spring(introProgress, { toValue: 1, damping: 18, stiffness: 105, mass: 0.85, useNativeDriver: true }).start();
  }, [introProgress]);

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
      <LiquidGlassBackground />
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
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.exploreContent}>
        <Animated.View style={[styles.referenceSearch, { opacity: introProgress }]}>
          <Ionicons name="search" size={17} color={Colors.dark.textMuted} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search people, plans..." placeholderTextColor={Colors.dark.textMuted} style={styles.referenceSearchInput} returnKeyType="search" />
          {!!searchQuery && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={17} color={Colors.dark.textMuted} /></TouchableOpacity>}
        </Animated.View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>
          <TouchableOpacity style={styles.storyItem} onPress={() => router.push('/friends')}>
            <View style={[styles.storyRing, styles.storyAddRing]}><View style={styles.storyAdd}><Ionicons name="add" size={20} color={Colors.dark.text} /></View></View>
            <Text style={styles.storyName}>Your circle</Text>
          </TouchableOpacity>
          {CATS.slice(0, 6).map((value, index) => (
            <TouchableOpacity key={value} style={styles.storyItem} onPress={() => { setIrlSearch(null); setCat(value); }}>
              <View style={[styles.storyRing, index % 3 === 0 && styles.storyRingHot]}><ImageBackground source={{ uri: categoryImage(value) }} style={styles.storyImage} imageStyle={{ borderRadius: 999 }}><View style={styles.storyImageTint} /></ImageBackground></View>
              <Text numberOfLines={1} style={styles.storyName}>{value.charAt(0).toUpperCase() + value.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.referenceSegment}>
          {(['Subscriptions', 'Explore'] as const).map((mode) => (
            <TouchableOpacity key={mode} accessibilityRole="button" accessibilityState={{ selected: browseMode === mode }} style={[styles.referenceSegmentItem, browseMode === mode && styles.referenceSegmentItemActive]} onPress={() => setBrowseMode(mode)}>
              <Text style={[styles.referenceSegmentText, browseMode === mode && styles.referenceSegmentTextActive]}>{mode}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.referenceAddButton} onPress={() => router.push('/host/new')}><Ionicons name="add" size={21} color={Colors.dark.text} /></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {([{ id: 'all', label: 'For you' }, ...CATS.map((value) => ({ id: value, label: value === 'outdoors' ? 'Nature' : value.charAt(0).toUpperCase() + value.slice(1) }))]).map((item) => (
            <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === 'all' ? !cat : cat === item.id }} style={[styles.chip, (item.id === 'all' ? !cat : cat === item.id) && styles.chipOn]} onPress={() => { setIrlSearch(null); setCat(item.id === 'all' ? null : item.id as Category); }}>
              <Text style={[styles.chipText, (item.id === 'all' ? !cat : cat === item.id) && styles.chipTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.discoveryActions}>
          <TouchableOpacity style={styles.discoveryActionCard} onPress={() => setShowMap(true)}>
            <View style={styles.discoveryActionIcon}><Ionicons name="navigate" size={18} color={Colors.dark.background} /></View>
            <Text style={styles.discoveryActionTitle}>Near you</Text>
            <Text style={styles.discoveryActionCopy}>Explore plans on the live map</Text>
            <Ionicons name="arrow-forward" size={17} color={Colors.dark.primary} style={styles.actionArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.discoveryActionCard} onPress={() => { setIrlSearch(null); setCat(null); setTimeFilter('upcoming'); }}>
            <View style={styles.discoveryActionIcon}><Ionicons name="calendar" size={18} color={Colors.dark.background} /></View>
            <Text style={styles.discoveryActionTitle}>Upcoming</Text>
            <Text style={styles.discoveryActionCopy}>See what's happening next</Text>
            <Ionicons name="arrow-forward" size={17} color={Colors.dark.primary} style={styles.actionArrow} />
          </TouchableOpacity>
        </View>
        {loadError && !isLoading && (
          <View style={styles.planEmpty}>
            <Ionicons name="cloud-offline-outline" size={24} color={Colors.dark.textMuted} />
            <Text style={styles.discoveryActionTitle}>Couldn't refresh plans</Text>
            <Text style={styles.discoveryActionCopy}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.hostInlineButton} onPress={load}><Text style={styles.hostInlineButtonText}>Try again</Text></TouchableOpacity>
          </View>
        )}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{browseMode === 'Subscriptions' ? 'From your circle' : 'Made for your mood'}</Text>
          <TouchableOpacity onPress={() => { setCat(null); setTimeFilter('upcoming'); }}><Text style={styles.seeAll}>See all →</Text></TouchableOpacity>
        </View>
        {isLoading && gatherings.length === 0 ? (
          <View style={styles.planEmpty}><ActivityIndicator color={Colors.dark.primary} /><Text style={styles.statusText}>Finding plans for you…</Text></View>
        ) : gatherings.filter((g) => !searchQuery.trim() || (g.title + ' ' + g.category + ' ' + (g.address || '')).toLowerCase().includes(searchQuery.trim().toLowerCase())).length > 0 ? (
          <View style={styles.planRail}>
            {gatherings.filter((g) => !searchQuery.trim() || (g.title + ' ' + g.category + ' ' + (g.address || '')).toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 8).map((g) => (
              <TouchableOpacity key={g.id} accessibilityRole="button" style={styles.planCard} onPress={() => router.push(`/g/${g.id}`)}>
                <ImageBackground source={{ uri: categoryImage(g.category) }} style={styles.planImagePlaceholder} imageStyle={styles.planImage} resizeMode="cover">
                  <View style={styles.planImageShade} />
                  <View style={styles.planImageIcon}><Ionicons name={categoryIcon(g.category) as any} size={29} color={Colors.dark.text} /></View>
                  <View style={styles.planCategory}><Text style={styles.planCategoryText}>{g.category}</Text></View>
                  <View style={styles.planCount}><Ionicons name="people" size={12} color={Colors.dark.text} /><Text style={styles.planCountText}>{g.spots_left != null ? `${g.spots_left} spots left` : 'Open plan'}</Text></View>
                </ImageBackground>
                <View style={styles.planDetails}>
                  <Text numberOfLines={1} style={styles.planTitle}>{g.title}</Text>
                  <Text numberOfLines={1} style={styles.planMeta}><Ionicons name="time-outline" size={12} />  {new Date(g.start_time).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
                  <Text numberOfLines={1} style={styles.planMeta}><Ionicons name="location-outline" size={12} />  {g.address || 'Location shared after joining'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.planEmpty}>
            <Ionicons name="sparkles-outline" size={25} color={Colors.dark.primary} />
            <Text style={styles.discoveryActionTitle}>Be the first to make a plan</Text>
            <Text style={styles.discoveryActionCopy}>Host a hangout and give people a reason to get out.</Text>
            <TouchableOpacity style={styles.hostInlineButton} onPress={() => router.push('/host/new')}><Text style={styles.hostInlineButtonText}>Create a hangout</Text></TouchableOpacity>
          </View>
        )}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>People nearby</Text>
          <TouchableOpacity onPress={() => router.push('/friends')}><Text style={styles.seeAll}>Find people →</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.peopleCard} onPress={() => router.push('/friends')}>
          <View style={styles.peopleIcon}><Ionicons name="people" size={23} color={Colors.dark.background} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.discoveryActionTitle}>Your city is full of potential friends</Text>
            <Text style={styles.discoveryActionCopy}>Find people, meet through shared plans, and build your circle.</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.dark.primary} />
        </TouchableOpacity>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Make something happen</Text>
        </View>
        <TouchableOpacity style={styles.irlCta} onPress={() => setIrlSheet(true)}>
          <View style={styles.irlCtaIcon}><Ionicons name="sparkles" size={20} color={Colors.dark.background} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.irlCtaTitle}>I’m bored</Text>
            <Text style={styles.irlCtaCopy}>Find a real plan for the next 24 hours</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.dark.primary} />
        </TouchableOpacity>
        {(cat || timeFilter !== 'all' || irlSearch) && (
          <TouchableOpacity style={styles.clearFiltersInline} onPress={() => { setCat(null); setTimeFilter('all'); setIrlSearch(null); }}>
            <Text style={styles.seeAll}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <SafeAreaView style={styles.mapModal} edges={['top']}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowMap(false)}><Ionicons name="arrow-back" size={20} color={Colors.dark.text} /></TouchableOpacity>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.sectionTitle}>Explore the map</Text>
              <Text style={styles.discoveryActionCopy}>Real plans around your city</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setShowMap(false); setIrlSheet(true); }}><Ionicons name="sparkles" size={18} color={Colors.dark.primary} /></TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <HangoutMap gatherings={gatherings} onSelect={(id: string) => { setShowMap(false); router.push(`/g/${id}`); }} />
            {loadError && <View style={styles.mapError}><Text style={styles.statusText}>Map data couldn't refresh. Try again.</Text><TouchableOpacity onPress={load}><Text style={styles.seeAll}>Retry</Text></TouchableOpacity></View>}
          </View>
        </SafeAreaView>
      </Modal>
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
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  exploreContent: { paddingBottom: 124 },
  exploreIntro: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  exploreEyebrow: { color: Colors.dark.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginBottom: Spacing.xs },
  exploreHeadline: { color: Colors.dark.text, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  exploreSubhead: { color: Colors.dark.textMuted, fontSize: 13, marginTop: 5 },
  categoryRail: { paddingHorizontal: Spacing.lg, paddingTop: 10, paddingBottom: Spacing.md, gap: 7 },
  referenceSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.md, paddingHorizontal: 15, height: 44, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  referenceSearchInput: { flex: 1, color: Colors.dark.text, fontSize: 13, paddingVertical: 0 },
  storyRail: { paddingHorizontal: Spacing.lg, paddingBottom: 15, gap: 12, alignItems: 'flex-start' },
  storyItem: { width: 43, alignItems: 'center', gap: 5 },
  storyRing: { width: 43, height: 43, borderRadius: 22, padding: 2, borderWidth: 1.5, borderColor: 'rgba(231,113,205,0.8)', overflow: 'hidden' },
  storyRingHot: { borderColor: '#F6BDA8' },
  storyAddRing: { borderColor: 'rgba(255,255,255,0.3)' },
  storyImage: { flex: 1, overflow: 'hidden', borderRadius: 999 },
  storyImageTint: { flex: 1, backgroundColor: 'rgba(25,13,29,0.12)' },
  storyAdd: { flex: 1, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  storyName: { color: Colors.dark.textMuted, fontSize: 9, maxWidth: 54, textAlign: 'center' },
  referenceSegment: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: 4, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  referenceSegmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 34, borderRadius: Radius.full },
  referenceSegmentItemActive: { backgroundColor: 'rgba(220,143,207,0.88)', shadowColor: '#E78AD7', shadowOpacity: 0.34, shadowRadius: 10, elevation: 4 },
  referenceSegmentText: { color: Colors.dark.textMuted, fontSize: 11, fontWeight: '600' },
  referenceSegmentTextActive: { color: '#241421', fontWeight: '800' },
  referenceAddButton: { width: 34, height: 34, borderRadius: 17, marginLeft: 4, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  discoveryActions: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginTop: Spacing.xs },
  discoveryActionCard: { flex: 1, minHeight: 138, padding: 15, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.glass, overflow: 'hidden' },
  discoveryActionIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  discoveryActionTitle: { color: Colors.dark.text, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  discoveryActionCopy: { color: Colors.dark.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  actionArrow: { position: 'absolute', right: 12, bottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  seeAll: { color: Colors.dark.primary, fontSize: 12, fontWeight: '700' },
  planRail: { paddingHorizontal: Spacing.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  planCard: { width: '48.5%', borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', backgroundColor: 'rgba(25,21,36,0.58)', marginBottom: 1 },
  planImagePlaceholder: { height: 178, backgroundColor: '#24263A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  planImage: { opacity: 0.94 },
  planImageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,8,18,0.28)' },
  planImageIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(14,10,23,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  planCategory: { position: 'absolute', left: 10, bottom: 9, backgroundColor: Colors.dark.primary, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full },
  planCategoryText: { color: Colors.dark.background, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  planCount: { position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(14,10,23,0.76)', paddingHorizontal: 7, paddingVertical: 5, borderRadius: Radius.full },
  planCountText: { color: Colors.dark.text, fontSize: 10, fontWeight: '700' },
  planDetails: { padding: 10, gap: 5 },
  planTitle: { color: Colors.dark.text, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  planMeta: { color: Colors.dark.textMuted, fontSize: 9 },
  planEmpty: { marginHorizontal: Spacing.lg, minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, gap: 6 },
  hostInlineButton: { backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.sm },
  hostInlineButtonText: { color: Colors.dark.background, fontSize: 12, fontWeight: '800' },
  peopleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  peopleIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  clearFiltersInline: { alignItems: 'center', padding: Spacing.md },
  mapModal: { flex: 1, backgroundColor: Colors.dark.background },
  mapModalHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  mapError: { position: 'absolute', bottom: 20, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.dark.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.md, zIndex: 10, backgroundColor: 'transparent' },
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
  irlCta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, marginTop: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(196,181,253,0.28)', backgroundColor: Colors.dark.surface2 },
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
  irlSheet: { maxHeight: '92%', backgroundColor: Colors.dark.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  irlSheetContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: Radius.full, backgroundColor: Colors.dark.textDim, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetEyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sheetEyebrowText: { color: Colors.dark.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.25 },
  sheetTitle: { color: Colors.dark.text, fontSize: 29, lineHeight: 32, fontWeight: '900', letterSpacing: -0.9, marginTop: Spacing.sm },
  sheetSubtitle: { color: Colors.dark.textMuted, fontSize: 13, marginTop: Spacing.xs, marginBottom: Spacing.md },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodCard: { width: '47%', minHeight: 92, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.background },
  moodCardOn: { borderColor: Colors.dark.primary, backgroundColor: 'rgba(196,181,253,0.08)' },
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
