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

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#171321' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#C5B9D7' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0C0A12' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#352A43' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#211A2C' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#A99BB9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#30253A' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#211A2B' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#B2AABD' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#241D30' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D111B' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9589AC' }] },
];

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
        initialRegion={{ latitude: 37.9838, longitude: 23.7275, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
        customMapStyle={MAP_STYLE}
        userInterfaceStyle="dark"
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
                fillColor="rgba(231,138,215,0.12)"
                strokeWidth={1.5}
                onPress={() => onSelect(g.id)}
              />
            )}
            {g.exact && <Marker
              coordinate={{ latitude: g.lat, longitude: g.lng }}
              tracksViewChanges={false}
            >
              <View style={styles.marker}>
                <Text style={styles.markerEmoji}>✦</Text>
              </View>
              <Callout tooltip onPress={() => onSelect(g.id)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{g.title}</Text>
                  <Text style={styles.calloutCat}>{g.category}</Text>
                </View>
              </Callout>
            </Marker>}
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
  locateBtn: { position: 'absolute', bottom: 90, left: Spacing.lg, backgroundColor: 'rgba(23,19,33,0.94)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(231,138,215,0.3)', elevation: 4 },
  locateText: { color: Colors.dark.text, fontWeight: '700', fontSize: 13 },
  marker: {
    width: 34, height: 34, borderRadius: 13,
    backgroundColor: '#E78AD7',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F7F1FA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 4,
  },
  markerEmoji: { fontSize: 17, color: '#241421', fontWeight: '900' },
  callout: { backgroundColor: Colors.dark.surface, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(231,138,215,0.25)', minWidth: 140 },
  calloutTitle: { color: Colors.dark.text, fontWeight: '700', fontSize: 13 },
  calloutCat: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 2 },
});
