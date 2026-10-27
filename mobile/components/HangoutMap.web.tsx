import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { Gathering } from '../lib/types';

interface Props {
  gatherings: Gathering[];
  onSelect: (id: string) => void;
}

const CAT_EMOJI: Record<string, string> = { coffee:'☕', study:'📚', sports:'⚽', outdoors:'🌲', bar:'🍻', party:'🎉', other:'📍' };

export default function HangoutMap({ gatherings, onSelect }: Props) {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('Locating you...');

  const requestLocation = () => {
    setGeoStatus('Locating you...');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('You are here');
      },
      (err) => {
        console.warn('geo err', err);
        setGeoStatus('Location unavailable: ' + (err?.message || err?.code));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => { requestLocation(); }, []);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'select' && e.data.id) onSelect(e.data.id);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSelect]);

  const html = useMemo(() => {
    const data = JSON.stringify(gatherings.map((g) => ({
      id: g.id, title: g.title, category: g.category, lat: g.lat, lng: g.lng, exact: g.exact, address: g.address,
    })));
    const uc = userCoords ? JSON.stringify(userCoords) : 'null';
    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;} body{background:#0B0F14;font-family:sans-serif;}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const data = ${data};
const userCoords = ${uc};
const map = L.map('map').setView(userCoords ? [userCoords.lat, userCoords.lng] : [40.7128,-74.006], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO &copy; OSM', subdomains: 'abcd', maxZoom: 20 }).addTo(map);
const emojiMap = {coffee:'☕',study:'📚',sports:'⚽',outdoors:'🌲',bar:'🍻',party:'🎉',other:'📍'};
data.forEach(g => {
  if (!g.exact) {
    L.circle([g.lat,g.lng], {radius:300, color:'#C6FF3D', fillColor:'#C6FF3D', fillOpacity:0.12, weight:1.5}).addTo(map)
      .bindPopup('<b>'+g.title+'</b><br/>'+g.category+'<br/><small>~300m area (approx)</small>');
  } else {
    const icon = L.divIcon({ className:'hangout-marker', html:'<div style="background:#C6FF3D;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #0B0F14;box-shadow:0 2px 6px rgba(0,0,0,0.4)">'+(emojiMap[g.category]||'📍')+'</div>', iconSize:[32,32], iconAnchor:[16,16] });
    L.marker([g.lat,g.lng], { icon }).addTo(map)
      .bindPopup('<b>'+g.title+'</b><br/>'+g.category+'<br/>'+(g.address||''))
      .on('click', () => { window.parent.postMessage({type:'select', id: g.id}, '*'); });
  }
  // unapproved also get a marker (circle only) but clickable
  if (!g.exact) {
    const icon = L.divIcon({ className:'hangout-marker', html:'<div style="background:#C6FF3D;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #0B0F14;opacity:0.85">'+(emojiMap[g.category]||'📍')+'</div>', iconSize:[32,32], iconAnchor:[16,16] });
    L.marker([g.lat,g.lng], { icon }).addTo(map)
      .bindPopup('<b>'+g.title+'</b><br/>'+g.category+'<br/><small>~300m area (approx)</small>')
      .on('click', () => { window.parent.postMessage({type:'select', id: g.id}, '*'); });
  }
});
if (userCoords) {
  L.circleMarker([userCoords.lat, userCoords.lng], {radius:8, color:'#fff', fillColor:'#C6FF3D', fillOpacity:1}).addTo(map).bindPopup('You are here');
} else if (data.length) {
  const b = L.latLngBounds(data.map(g=>[g.lat,g.lng]));
  map.fitBounds(b, {padding:[40,40]});
}
</script>
</body></html>`;
  }, [gatherings, userCoords]);

  return (
    <View style={styles.container}>
      {/* @ts-ignore */}
      <iframe srcDoc={html} style={styles.iframe} title="map" />
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{geoStatus}</Text>
        <TouchableOpacity onPress={requestLocation} style={styles.retryBtn}>
          <Text style={styles.retryText}>Locate me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  iframe: { flex: 1, border: 'none', width: '100%', height: '100%' } as any,
  statusBar: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: Colors.dark.text, fontSize: 12 },
  retryBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  retryText: { color: Colors.dark.background, fontSize: 11, fontWeight: '700' },
});
