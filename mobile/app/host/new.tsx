import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { Category } from '../../lib/types';
import MapPicker from '../../components/MapPicker';

const CATS: Category[] = ['coffee', 'study', 'sports', 'outdoors', 'bar', 'party', 'other'];

export default function HostNew() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('coffee');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [maxGuests, setMaxGuests] = useState('10');
  const [lat, setLat] = useState('40.7128');
  const [lng, setLng] = useState('-74.006');
  const [address, setAddress] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'approval'>('approval');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    if (!start.trim() || !end.trim()) return Alert.alert('Validation', 'Start and end times are required (ISO format)');
    if (isNaN(parseInt(maxGuests, 10)) || parseInt(maxGuests, 10) < 1) return Alert.alert('Validation', 'Capacity must be at least 1');
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return Alert.alert('Validation', 'Pick a location on the map');
    setSubmitting(true);
    try {
      const g = await api.createGathering({
        title: title.trim(), category, description: description.trim(), start_time: start.trim(), end_time: end.trim(),
        max_guests: parseInt(maxGuests, 10), lat: parseFloat(lat), lng: parseFloat(lng), address: address.trim(), visibility,
      });
      router.replace(`/host/${g.id}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
      <Text style={[Typography.h1, { color: Colors.dark.text }]}>Host a gathering</Text>
      <TextInput style={styles.input} placeholder="Title" placeholderTextColor={Colors.dark.textMuted} value={title} onChangeText={setTitle} />
      <Text style={[Typography.caption, { color: Colors.dark.textMuted, marginTop: Spacing.md }]}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm }}>
        {CATS.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipOn]} onPress={() => setCategory(c)}>
            <Text style={styles.chipText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Description" placeholderTextColor={Colors.dark.textMuted} value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Start (ISO)" placeholderTextColor={Colors.dark.textMuted} value={start} onChangeText={setStart} />
      <TextInput style={styles.input} placeholder="End (ISO)" placeholderTextColor={Colors.dark.textMuted} value={end} onChangeText={setEnd} />
      <TextInput style={styles.input} placeholder="Max guests" placeholderTextColor={Colors.dark.textMuted} value={maxGuests} onChangeText={setMaxGuests} keyboardType="numeric" />
      <MapPicker lat={parseFloat(lat) || 40.7128} lng={parseFloat(lng) || -74.006} onChange={(la: number, ln: number) => { setLat(String(la)); setLng(String(ln)); }} />
      <TextInput style={styles.input} placeholder="Address (private)" placeholderTextColor={Colors.dark.textMuted} value={address} onChangeText={setAddress} />
      <View style={{ flexDirection: 'row', marginTop: Spacing.md }}>
        {(['approval', 'public'] as const).map((v) => (
          <TouchableOpacity key={v} style={[styles.chip, visibility === v && styles.chipOn]} onPress={() => setVisibility(v)}>
            <Text style={styles.chipText}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[Typography.caption, { color: Colors.dark.textMuted, marginTop: Spacing.md }]}>Safety: only share the address with approved guests. Block/report tools available on profiles.</Text>
      <TouchableOpacity style={[styles.btn, submitting && { opacity: 0.5 }]} onPress={submit} disabled={submitting}>
        <Text style={styles.btnText}>{submitting ? 'Creating...' : 'Create gathering'}</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  input: { backgroundColor: Colors.dark.glass, color: Colors.dark.text, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginRight: Spacing.sm, marginTop: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  chipOn: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  chipText: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: Colors.dark.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  btnText: { color: Colors.dark.background, fontWeight: '700' },
});
