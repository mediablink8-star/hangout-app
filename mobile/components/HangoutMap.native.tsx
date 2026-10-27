import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Colors, Spacing, Radius } from '../constants/theme';
import { Gathering } from '../lib/types';

interface Props {
  gatherings: Gathering[];
  onSelect: (id: string) => void;
}

const CAT_EMOJI: Record<string, string> = {
  coffee: '☕', study: '📚', sports: '⚽', outdoors: '🌲', bar: '🍻', party: '🎉', other: '📍',
};

export default function HangoutMap({ gatherings, onSelect }: Props) {
  const mapRef = useRef<MapView>(null);

  const locate = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      // instant: use last known position if available
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        mapRef.current?.animateToRegion({ latitude: last.coords.latitude, longitude: last.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 400);
      }
      // refine in background
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600);
    } catch {}
  };

  useEffect(() => { locate(); }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: 40.7128, longitude: -74.006, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsPointsOfInterests={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        toolbarEnabled={false}
      >
        {gatherings.map((g) => (
          <React.Fragment key={g.id}>
            {!g.exact && (
              <Circle
                center={{ latitude: g.lat, longitude: g.lng }}
                radius={300}
                strokeColor={Colors.dark.primary}
                fillColor="rgba(198,255,61,0.12)"
                strokeWidth={1.5}
              />
            )}
            <Marker
              coordinate={{ latitude: g.lat, longitude: g.lng }}
              onPress={() => onSelect(g.id)}
              tracksViewChanges={false}
            >
              <View style={styles.marker}>
                <Text style={styles.markerEmoji}>{CAT_EMOJI[g.category] || '📍'}</Text>
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{g.title}</Text>
                  <Text style={styles.calloutCat}>{g.category}</Text>
                </View>
              </Callout>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>
      <TouchableOpacity style={styles.locateBtn} onPress={locate} activeOpacity={0.8}>
        <Text style={styles.locateText}>📍 Locate me</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  locateBtn: { position: 'absolute', bottom: 90, left: Spacing.lg, backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, elevation: 4 },
  locateText: { color: Colors.dark.background, fontWeight: '700', fontSize: 13 },
  marker: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0B0F14',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 4,
  },
  markerEmoji: { fontSize: 16 },
  callout: { backgroundColor: Colors.dark.surface, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.dark.border, minWidth: 120 },
  calloutTitle: { color: Colors.dark.text, fontWeight: '700', fontSize: 13 },
  calloutCat: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 2 },
});
