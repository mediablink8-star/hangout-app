import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/theme';
import { Gathering } from '../lib/types';

interface Props {
  gatherings: Gathering[];
  onSelect: (id: string) => void;
}

export default function HangoutMap({ gatherings, onSelect }: Props) {
  const html = useMemo(() => {
    const pins = JSON.stringify(gatherings.map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      lat: g.lat,
      lng: g.lng,
      exact: g.exact,
      address: g.exact ? g.address : null,
    }))).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html,body,#map{height:100%;width:100%;margin:0;background:#080d0a}
    .leaflet-container{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#080d0a}
    .leaflet-control-attribution{background:rgba(8,13,10,.8)!important;color:#a9b3a7!important}
    .leaflet-control-attribution a{color:#c9f36a!important}
    .leaflet-bar a{background:#111914!important;color:#f3f7f0!important;border-color:rgba(220,246,218,.1)!important}
    .hangout-pin{width:34px;height:34px;border-radius:13px 13px 13px 4px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;background:#c9f36a;border:2px solid #f3f7f0;box-shadow:0 5px 20px rgba(0,0,0,.45)}
    .hangout-pin span{transform:rotate(45deg);font-size:15px}
    .you-pin{width:16px;height:16px;border:3px solid #fff;border-radius:50%;background:#c9f36a;box-shadow:0 0 0 7px rgba(201,243,106,.2),0 0 20px rgba(201,243,106,.65)}
    .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#111914;color:#f3f7f0;border:1px solid rgba(220,246,218,.12)}
    .leaflet-popup-content{margin:14px 16px;line-height:1.45}
    .popup-title{font-weight:800;font-size:15px;margin-bottom:4px}
    .popup-category{color:#c9f36a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
    .popup-go{margin-top:10px;padding:9px 13px;border:0;border-radius:10px;background:#c9f36a;color:#080d0a;font-weight:800}
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const pins = __PINS__;
  const map = L.map('map', { zoomControl: false }).setView([40.7128,-74.006],12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  const icon = L.divIcon({ className: '', html: '<div class="hangout-pin"><span>✦</span></div>', iconSize: [34,34], iconAnchor: [17,28], popupAnchor: [0,-28] });
  const safe = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const tellApp = (id) => { const payload = JSON.stringify({ type:'hangout-select', id }); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ id })); else window.parent.postMessage(payload, '*'); };
  pins.forEach((pin) => {
    if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;
    const marker = pin.exact
      ? L.marker([pin.lat,pin.lng], { icon })
      : L.circle([pin.lat,pin.lng], { radius:300, color:'#c9f36a', weight:2, fillColor:'#c9f36a', fillOpacity:.13 });
    marker.addTo(map);
    marker.bindPopup('<div class="popup-category">'+safe(pin.category)+'</div><div class="popup-title">'+safe(pin.title)+'</div><div>'+(pin.exact ? safe(pin.address) : 'Exact location shared after host approval')+'</div><button class="popup-go">View hangout</button>');
    marker.on('popupopen', () => {
      const button = document.querySelector('.leaflet-popup .popup-go');
      if (button) button.addEventListener('click', () => tellApp(pin.id), { once:true });
    });
  });
  const visiblePins = pins.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (visiblePins.length) map.fitBounds(L.latLngBounds(visiblePins.map(p => [p.lat,p.lng])), { padding:[44,44], maxZoom:14 });
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => {
    L.marker([position.coords.latitude,position.coords.longitude], { icon:L.divIcon({ className:'', html:'<div class="you-pin"></div>', iconSize:[16,16], iconAnchor:[8,8] }) }).addTo(map).bindPopup('You are here');
    if (!visiblePins.length) map.setView([position.coords.latitude,position.coords.longitude],13);
  }, () => {}, { enableHighAccuracy:false, timeout:7000, maximumAge:60000 });
</script>
</body>
</html>`.replace('__PINS__', pins);
  }, [gatherings]);

  useEffect(() => {\n    if (Platform.OS !== 'web') return;\n    const receive = (event: MessageEvent) => {\n      try {\n        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;\n        if (message?.type === 'hangout-select' && typeof message.id === 'string') onSelect(message.id);\n      } catch {}\n    };\n    window.addEventListener('message', receive);\n    return () => window.removeEventListener('message', receive);\n  }, [onSelect]);\n\n  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (typeof message.id === 'string') onSelect(message.id);
    } catch {}
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        // @ts-ignore iframe is the web renderer for the embedded map.
        <iframe srcDoc={html} style={styles.iframe} title="Hangout map" />
      ) : (
        <WebView
          source={{ html }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          style={styles.nativeMap}
          accessibilityLabel="Map of nearby hangouts"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background, overflow: 'hidden' },
  iframe: { flex: 1, border: 'none', width: '100%', height: '100%' } as any,
  nativeMap: { flex: 1, backgroundColor: Colors.dark.background },
});
