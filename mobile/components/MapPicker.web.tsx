import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export default function MapPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const iframeRef = useRef<any>(null);
  const [picked, setPicked] = useState({ lat, lng });

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'picked') {
        setPicked({ lat: e.data.lat, lng: e.data.lng });
        onChange(e.data.lat, e.data.lng);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;} body{background:#0B0F14;}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map = L.map('map').setView([${lat}, ${lng}], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
const marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
function send(lat, lng){ window.parent.postMessage({type:'picked', lat, lng}, '*'); }
marker.on('dragend', () => { const p = marker.getLatLng(); send(p.lat, p.lng); });
map.on('click', (e) => { marker.setLatLng(e.latlng); send(e.latlng.lat, e.latlng.lng); });
send(${lat}, ${lng});
</script>
</body></html>`;

  return (
    <View style={styles.container}>
      <iframe ref={iframeRef} srcDoc={html} style={styles.iframe} title="picker" />
      <View style={styles.label}>
        <Text style={styles.labelText}>Tap or drag the pin · {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 240, borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  iframe: { flex: 1, border: 'none', width: '100%', height: '100%' } as any,
  label: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 6, borderRadius: 6 },
  labelText: { color: '#fff', fontSize: 11 },
});