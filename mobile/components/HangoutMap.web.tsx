import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { Gathering } from '../lib/types';

interface Props {
  gatherings: Gathering[];
  onSelect: (id: string) => void;
}

const CAT_EMOJI: Record<string, string> = { coffee:'✦', study:'✦', sports:'✦', outdoors:'✦', bar:'✦', party:'✦', other:'✦' };

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
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
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
<style>html,body,#map{height:100%;width:100%;margin:0;background:#0C0A12}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.leaflet-container{background:#0C0A12;font:14px sans-serif}.leaflet-tile{filter:hue-rotate(242deg) saturate(.62) brightness(.82)}.leaflet-control-attribution{background:rgba(18,13,25,.92)!important;color:#C5B9D7!important;font-size:9px!important}.leaflet-control-attribution a{color:#E78AD7!important}.leaflet-bar a{background:#171321!important;color:#F7F1FA!important;border-color:rgba(231,138,215,.18)!important}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#171321;color:#F7F1FA;border:1px solid rgba(231,138,215,.24);border-radius:14px}.hangout-marker{filter:drop-shadow(0 4px 10px rgba(231,138,215,.35))}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const data = ${data};
const userCoords = ${uc};
const map = L.map('map', { zoomControl:false }).setView(userCoords ? [userCoords.lat, userCoords.lng] : [37.9838,23.7275], 13);
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19 }).addTo(map);
const emojiMap = {coffee:'✦',study:'✦',sports:'✦',outdoors:'✦',bar:'✦',party:'✦',other:'✦'};
const safe = value => String(value || '').replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[ch]));
data.forEach(g => {
  if (!g.exact) {
    L.circle([g.lat,g.lng], {radius:300, color:'#E78AD7', fillColor:'#B9A0F2', fillOpacity:0.13, weight:1.5}).addTo(map)
      .bindPopup('<b>'+safe(g.title)+'</b><br/>'+safe(g.category)+'<br/><small>Approximate area · exact location shared after approval</small>')
      .on('click', () => { window.parent.postMessage({type:'select', id: g.id}, '*'); });
  } else {
    const icon = L.divIcon({ className:'hangout-marker', html:'<div style="background:linear-gradient(135deg,#E78AD7,#B9A0F2);color:#241421;width:32px;height:32px;border-radius:12px 12px 12px 4px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;border:2px solid #F7F1FA;box-shadow:0 4px 18px rgba(231,138,215,.35)">'+(emojiMap[g.category]||'📍')+'</div>', iconSize:[32,32], iconAnchor:[16,16] });
    L.marker([g.lat,g.lng], { icon }).addTo(map)
      .bindPopup('<b>'+safe(g.title)+'</b><br/>'+safe(g.category)+'<br/>'+(g.exact ? safe(g.address||'') : 'Approximate area'))
      .on('click', () => { window.parent.postMessage({type:'select', id: g.id}, '*'); });
  }
});
if (userCoords) {
  L.circleMarker([userCoords.lat, userCoords.lng], {radius:8, color:'#fff', fillColor:'#E78AD7', fillOpacity:1}).addTo(map).bindPopup('You are here');
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
      <iframe key={userCoords ? `${userCoords.lat}-${userCoords.lng}` : 'no-location'} srcDoc={html} style={styles.iframe} title="map" />
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
  statusBar: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(23,19,33,0.92)', padding: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(231,138,215,0.22)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: Colors.dark.text, fontSize: 12 },
  retryBtn: { backgroundColor: 'rgba(231,138,215,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  retryText: { color: Colors.dark.text, fontSize: 11, fontWeight: '700' },
});
