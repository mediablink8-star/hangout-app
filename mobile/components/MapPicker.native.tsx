import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        onPress={(e) => { onChange(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude); }}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} draggable onDragEnd={(e) => onChange(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 220, borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  map: { flex: 1 },
});