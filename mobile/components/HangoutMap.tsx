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
    html,body,#map{height:100%;width:100%;margin:0;background:#0C0A12}
    .leaflet-container{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0C0A12}\n    /* Tint the third-party basemap toward Hangout's plum palette without obscuring labels. */\n    .leaflet-tile{filter:hue-rotate(242deg) saturate(.62) brightness(.82)}\n    .leaflet-tile-pane{background:#0C0A12}\n    .leaflet-control-zoom{border:1px solid rgba(231,138,215,.22)!important;border-radius:13px!important;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.28)!important}\n    .leaflet-control-zoom a{width:38px!important;height:38px!important;line-height:38px!important;font-size:20px!important}\n    .leaflet-control-attribution{font-size:9px!important;border-radius:7px 0 0 0;padding:3px 6px!important}
    .leaflet-control-attribution{background:rgba(18,13,25,.92)!important;color:#C5B9D7!important}
    .leaflet-control-attribution a{color:#E78AD7!important}
    .leaflet-bar a{background:#171321!important;color:#F7F1FA!important;border-color:rgba(231,138,215,.18)!important}
    .hangout-pin{width:32px;height:32px;border-radius:12px 12px 12px 4px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F0A5E2,#B9A0F2);border:2px solid rgba(255,248,255,.96);box-shadow:0 4px 18px rgba(231,138,215,.42)}
    .hangout-pin span{transform:rotate(45deg);font-size:15px}
    .you-pin{width:16px;height:16px;border:3px solid #fff;border-radius:50%;background:#E78AD7;box-shadow:0 0 0 7px rgba(231,138,215,.18),0 0 20px rgba(231,138,215,.5)}
    .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:rgba(23,19,33,.97);color:#F7F1FA;border:1px solid rgba(231,138,215,.24);border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,.4)}
    .leaflet-popup-content{margin:15px 16px;line-height:1.5;min-width:160px}\n    .leaflet-popup-close-button{color:#C5B9D7!important;padding:8px 9px 0 0!important}
    .popup-title{font-weight:800;font-size:15px;margin-bottom:4px}
    .popup-category{color:#E78AD7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
    .popup-go{margin-top:12px;padding:10px 14px;border:0;border-radius:12px;background:linear-gradient(135deg,#E78AD7,#B9A0F2);color:#241421;font-weight:800;width:100%;letter-spacing:.1px}
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const pins = __PINS__;
  const map = L.map('map', { zoomControl: false }).setView([37.9838,23.7275],12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
    }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  const icon = L.divIcon({ className: '', html: '<div class="hangout-pin"><span>✦</span></div>', iconSize: [32,32], iconAnchor: [16,26], popupAnchor: [0,-26] });
  const safe = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const tellApp = (id) => { const payload = JSON.stringify({ type:'hangout-select', id }); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ id })); else window.parent.postMessage(payload, '*'); };
  pins.forEach((pin) => {
    if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;
    const marker = pin.exact
      ? L.marker([pin.lat,pin.lng], { icon })
      : L.circle([pin.lat,pin.lng], { radius:300, color:'#E78AD7', weight:2, fillColor:'#B9A0F2', fillOpacity:.13 });
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

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const receive = (event: MessageEvent) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (message?.type === 'hangout-select' && typeof message.id === 'string') onSelect(message.id);
      } catch {}
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onSelect]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
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
