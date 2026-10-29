import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

/** Restrained ambient glass treatment. Content remains the focus; no heavy animated fog. */
export default function LiquidGlassBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.base} />
      <View style={styles.lavenderGlow} />
      <View style={styles.roseGlow} />
      <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { ...StyleSheet.absoluteFill, backgroundColor: '#0C0A12' },
  lavenderGlow: { position: 'absolute', top: -120, right: -145, width: 330, height: 330, borderRadius: 165, backgroundColor: 'rgba(127,91,170,0.17)' },
  roseGlow: { position: 'absolute', top: 390, left: -205, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(169,76,129,0.085)' },
  vignette: { ...StyleSheet.absoluteFill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.012)' },
});
