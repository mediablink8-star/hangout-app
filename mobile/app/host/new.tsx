import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { Category } from '../../lib/types';
import MapPicker from '../../components/MapPicker';
import { encodeMissionDescription, MISSION_CHALLENGES } from '../../lib/irlMode';

const CATS: Category[] = ['coffee', 'study', 'sports', 'outdoors', 'bar', 'party', 'other'];

function formatDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function defaultSchedule() {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { startDate: formatDate(start), startTime: formatTime(start), endDate: formatDate(end), endTime: formatTime(end) };
}

function parseLocalDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null;
  const parsed = new Date(year, month - 1, day, hours, minutes);
  if (formatDate(parsed) !== date || formatTime(parsed) !== time) return null;
  return parsed;
}

export default function HostNew() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mission?: string }>();
  const initial = defaultSchedule();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('coffee');
  const [description, setDescription] = useState('');
  const [missionMode, setMissionMode] = useState(params.mission === '1');
  const [challenge, setChallenge] = useState(params.mission === '1' ? MISSION_CHALLENGES[0] : '');
  const [startDate, setStartDate] = useState(initial.startDate);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [maxGuests, setMaxGuests] = useState('10');
  const [lat, setLat] = useState(40.7128);
  const [lng, setLng] = useState(-74.006);
  const [address, setAddress] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'approval'>('approval');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const startsAt = parseLocalDateTime(startDate, startTime);
    const endsAt = parseLocalDateTime(endDate, endTime);
    if (!title.trim()) return Alert.alert('Add a title', 'Give your hangout a short, clear name.');
    if (!startsAt || !endsAt) return Alert.alert('Check the date and time', 'Use YYYY-MM-DD for dates and 24-hour HH:MM for times.');
    if (endsAt <= startsAt) return Alert.alert('Check the schedule', 'The end time must be after the start time.');
    if (!/^\d+$/.test(maxGuests) || Number(maxGuests) < 1 || Number(maxGuests) > 100) return Alert.alert('Check capacity', 'Choose a whole number from 1 to 100.');
    if (!address.trim()) return Alert.alert('Add a meeting address', 'The exact address is shared with approved guests.');
    const missionDescription = encodeMissionDescription(description, challenge, missionMode);
    if (missionMode && !challenge.trim()) return Alert.alert('Choose a mission challenge', 'Pick one small, friendly challenge for the group.');
    if (title.trim().length > 80 || missionDescription.length > 2000) return Alert.alert('Shorten the details', 'Titles can be 80 characters and the full description, including mission details, must stay under 2,000 characters.');

    setSubmitting(true);
    try {
      const gathering = await api.createGathering({
        title: title.trim(),
        category,
        description: missionDescription,
        start_time: startsAt.toISOString(),
        end_time: endsAt.toISOString(),
        max_guests: Number(maxGuests),
        lat,
        lng,
        address: address.trim(),
        visibility,
      });
      router.replace(`/host/${gathering.id}`);
    } catch (e: any) {
      Alert.alert('Couldn’t create the hangout', e?.message || 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.kicker}>MAKE A PLAN</Text>
            <Text style={styles.title}>Host a hangout</Text>
            <Text style={styles.subtitle}>A few details, then your people can find you.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>The basics</Text>
            <Text style={styles.label}>Name your hangout</Text>
            <TextInput
              accessibilityLabel="Hangout title"
              style={styles.input}
              placeholder="Coffee and a walk"
              placeholderTextColor={Colors.dark.textDim}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              returnKeyType="next"
            />
            <View style={styles.counterRow}><Text style={styles.hint}>Keep it friendly and easy to scan.</Text><Text style={styles.counter}>{title.length}/80</Text></View>

            <Text style={[styles.label, styles.labelTop]}>What are you doing?</Text>
            <View style={styles.chips}>
              {CATS.map((item) => (
                <TouchableOpacity
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item }}
                  style={[styles.chip, category === item && styles.chipOn]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.chipText, category === item && styles.chipTextOn]}>{item[0].toUpperCase() + item.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, styles.labelTop]}>A little more detail <Text style={styles.optional}>OPTIONAL</Text></Text>
            <TextInput
              accessibilityLabel="Hangout description, optional"
              style={[styles.input, styles.multiline]}
              placeholder="What should people know before they join?"
              placeholderTextColor={Colors.dark.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{description.length}/2000</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add a mission</Text>
            <Text style={styles.hint}>Give the group one playful reason to break the ice. Joining stays completely optional.</Text>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: missionMode }}
              style={[styles.missionToggle, missionMode && styles.missionToggleOn]}
              onPress={() => setMissionMode(value => !value)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.visibilityTitle}>Mystery mission</Text>
                <Text style={styles.visibilityCopy}>Reveal a friendly challenge, never a surprise destination.</Text>
              </View>
              <Ionicons name={missionMode ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={missionMode ? Colors.dark.primary : Colors.dark.textDim} />
            </TouchableOpacity>
            <Text style={[styles.label, styles.labelTop]}>Choose a challenge <Text style={styles.optional}>OPTIONAL</Text></Text>
            <View style={styles.missionChoices}>
              {MISSION_CHALLENGES.map((item) => (
                <TouchableOpacity
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: challenge === item }}
                  style={[styles.challengeCard, challenge === item && styles.challengeCardOn]}
                  onPress={() => setChallenge(challenge === item ? '' : item)}
                >
                  <Ionicons name={challenge === item ? 'checkmark-circle' : 'sparkles-outline'} size={18} color={challenge === item ? Colors.dark.primary : Colors.dark.textDim} />
                  <Text style={[styles.challengeText, challenge === item && styles.challengeTextOn]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.safetyNote}>
              <Text style={styles.safetyMark}>✦</Text>
              <Text style={styles.safetyText}>Show the activity, time, and approximate area up front. Keep the exact meeting place public and familiar, and share it only with approved guests.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When and where</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.label}>Start date</Text>
                <TextInput accessibilityLabel="Start date, year month day" style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.dark.textDim} value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" maxLength={10} />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>Time</Text>
                <TextInput accessibilityLabel="Start time, 24 hour format" style={styles.input} placeholder="HH:MM" placeholderTextColor={Colors.dark.textDim} value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation" maxLength={5} />
              </View>
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.label}>End date</Text>
                <TextInput accessibilityLabel="End date, year month day" style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.dark.textDim} value={endDate} onChangeText={setEndDate} keyboardType="numbers-and-punctuation" maxLength={10} />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>Time</Text>
                <TextInput accessibilityLabel="End time, 24 hour format" style={styles.input} placeholder="HH:MM" placeholderTextColor={Colors.dark.textDim} value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation" maxLength={5} />
              </View>
            </View>
            <Text style={styles.hint}>Times use your local timezone and adjust for guests automatically.</Text>
            <View style={styles.mapHeading}>
              <Text style={styles.label}>Pick a spot</Text>
              <Text style={styles.mapHint}>Tap or move the pin</Text>
            </View>
            <MapPicker lat={lat} lng={lng} onChange={(latitude: number, longitude: number) => { setLat(latitude); setLng(longitude); }} />
            <Text style={styles.privateHint}>The public map shows an approximate area. Your exact address is only shown to approved guests.</Text>
            <Text style={[styles.label, styles.labelTop]}>Exact meeting address</Text>
            <TextInput
              accessibilityLabel="Exact meeting address, shared with approved guests"
              style={styles.input}
              placeholder="Street, venue, or meeting point"
              placeholderTextColor={Colors.dark.textDim}
              value={address}
              onChangeText={setAddress}
              maxLength={500}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who can join?</Text>
            <View style={styles.dateRow}>
              <View style={styles.guestField}>
                <Text style={styles.label}>Guest limit</Text>
                <TextInput accessibilityLabel="Maximum number of guests" style={styles.input} placeholder="10" placeholderTextColor={Colors.dark.textDim} value={maxGuests} onChangeText={setMaxGuests} keyboardType="number-pad" maxLength={3} />
              </View>
            </View>
            <View style={styles.visibilityOptions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: visibility === 'approval' }}
                style={[styles.visibilityCard, visibility === 'approval' && styles.visibilityOn]}
                onPress={() => setVisibility('approval')}
              >
                <Text style={[styles.visibilityTitle, visibility === 'approval' && styles.visibilityTitleOn]}>Approve guests</Text>
                <Text style={styles.visibilityCopy}>You choose who joins. Recommended for meeting new people.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: visibility === 'public' }}
                style={[styles.visibilityCard, visibility === 'public' && styles.visibilityOn]}
                onPress={() => setVisibility('public')}
              >
                <Text style={[styles.visibilityTitle, visibility === 'public' && styles.visibilityTitleOn]}>Open invite</Text>
                <Text style={styles.visibilityCopy}>Anyone can join while there is room.</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.safetyNote}>
            <Text style={styles.safetyMark}>✦</Text>
            <Text style={styles.safetyText}>Your exact address stays private until you approve someone to join.</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.submitButton, submitting && styles.submitDisabled]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color={Colors.dark.background} /> : <Text style={styles.submitText}>Create hangout <Text style={styles.submitArrow}>→</Text></Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.dark.background },
  keyboard: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  header: { marginBottom: Spacing.lg },
  kicker: { color: Colors.dark.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: Spacing.xs },
  title: { ...Typography.h1, color: Colors.dark.text },
  subtitle: { color: Colors.dark.textMuted, fontSize: 14, lineHeight: 21, marginTop: Spacing.xs },
  section: { backgroundColor: Colors.dark.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.dark.border, padding: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '800', marginBottom: Spacing.md },
  label: { color: Colors.dark.text, fontSize: 13, fontWeight: '700', marginBottom: Spacing.xs },
  labelTop: { marginTop: Spacing.lg },
  optional: { color: Colors.dark.textDim, fontSize: 10, letterSpacing: 0.7 },
  input: { minHeight: 50, backgroundColor: Colors.dark.background, color: Colors.dark.text, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.borderStrong, fontSize: 14 },
  multiline: { minHeight: 90, paddingTop: Spacing.md },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  counter: { color: Colors.dark.textDim, fontSize: 11, textAlign: 'right' },
  hint: { color: Colors.dark.textDim, fontSize: 12, lineHeight: 18, marginTop: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.xs, gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.background, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  chipOn: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  chipText: { color: Colors.dark.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: Colors.dark.background },
  missionToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.dark.background, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.dark.border, marginTop: Spacing.sm },
  missionToggleOn: { borderColor: Colors.dark.primary, backgroundColor: 'rgba(201,243,106,0.06)' },
  missionChoices: { gap: Spacing.sm, marginTop: Spacing.sm },
  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.dark.background, borderWidth: 1, borderColor: Colors.dark.border, padding: Spacing.md, borderRadius: Radius.md },
  challengeCardOn: { borderColor: Colors.dark.primary, backgroundColor: 'rgba(201,243,106,0.06)' },
  challengeText: { color: Colors.dark.textMuted, flex: 1, fontSize: 13, lineHeight: 18 },
  challengeTextOn: { color: Colors.dark.text },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  dateField: { flex: 1.5 },
  timeField: { flex: 1 },
  guestField: { width: '42%' },
  mapHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg },
  mapHint: { color: Colors.dark.textDim, fontSize: 11 },
  privateHint: { color: Colors.dark.textMuted, fontSize: 12, lineHeight: 18, marginTop: Spacing.sm },
  visibilityOptions: { gap: Spacing.sm },
  visibilityCard: { backgroundColor: Colors.dark.background, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.dark.border, marginTop: Spacing.sm },
  visibilityOn: { borderColor: Colors.dark.primary, backgroundColor: 'rgba(200,255,54,0.08)' },
  visibilityTitle: { color: Colors.dark.text, fontSize: 14, fontWeight: '700' },
  visibilityTitleOn: { color: Colors.dark.primary },
  visibilityCopy: { color: Colors.dark.textMuted, fontSize: 12, lineHeight: 18, marginTop: Spacing.xs },
  safetyNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(200,255,54,0.08)', borderWidth: 1, borderColor: 'rgba(200,255,54,0.16)', padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm },
  safetyMark: { color: Colors.dark.primary, fontSize: 17 },
  safetyText: { color: Colors.dark.textMuted, flex: 1, fontSize: 12, lineHeight: 18 },
  submitButton: { minHeight: 56, backgroundColor: Colors.dark.primary, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xxl },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: Colors.dark.background, fontSize: 15, fontWeight: '800' },
  submitArrow: { fontSize: 19 },
});
