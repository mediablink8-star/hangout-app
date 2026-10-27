import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { Gathering } from '../lib/types';

interface Props {
  gatherings: Gathering[];
  onSelect: (id: string) => void;
}

export default function HangoutMap({ gatherings }: Props) {
  const html = useMemo(() => {
    const data = JSON.stringify(gatherings.map((g) => ({
      id: g.id, title: g.title, category: g.category, lat: g.lat, lng: g.lng, exact: g.exact, address: g.address,
    })));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/></head><body><div id="map" style="height:100vh"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const data=${data};const map=L.map('map').setView([40.7128,-74.006],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OSM'}).addTo(map);data.forEach(g=>{if(!g.exact){L.circle([g.lat,g.lng],{radius:300,color:'#C6FF3D',fillColor:'#C6FF3D',fillOpacity:0.15}).addTo(map).bindPopup('<b>'+g.title+'</b><br/>'+g.category);}else{L.marker([g.lat,g.lng]).addTo(map).bindPopup('<b>'+g.title+'</b><br/>'+(g.address||''));}});if(data.length){map.fitBounds(L.latLngBounds(data.map(g=>[g.lat,g.lng])),{padding:[40,40]});}
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(pos=>{L.circleMarker([pos.coords.latitude,pos.coords.longitude],{radius:8,color:'#fff',fillColor:'#C6FF3D',fillOpacity:1}).addTo(map).bindPopup('You are here');map.setView([pos.coords.latitude,pos.coords.longitude],13);},e=>console.warn('geo err',e),{enableHighAccuracy:true,timeout:8000});}</script></body></html>`;
  }, [gatherings]);
  return (
    <View style={styles.container}>
      {/* @ts-ignore */}
      <iframe srcDoc={html} style={styles.iframe} title="map" />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  iframe: { flex: 1, border: 'none', width: '100%', height: '100%' } as any,
});
