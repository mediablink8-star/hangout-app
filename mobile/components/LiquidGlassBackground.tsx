import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

/** Low-motion ambient light that gives the dark surfaces a soft, liquid-glass atmosphere. */
export default function LiquidGlassBackground() {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(driftA, { toValue: 1, duration: 8200, useNativeDriver: true }),
      Animated.timing(driftA, { toValue: 0, duration: 8200, useNativeDriver: true }),
    ]));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(driftB, { toValue: 1, duration: 10400, useNativeDriver: true }),
      Animated.timing(driftB, { toValue: 0, duration: 10400, useNativeDriver: true }),
    ]));
    const c = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 5000, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 5000, useNativeDriver: true }),
    ]));
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [driftA, driftB, breathe]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.base} />
      <Animated.View style={[styles.orb, styles.lavenderOrb, {
        opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.23] }),
        transform: [
          { translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 34] }) },
          { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 46] }) },
          { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
        ],
      }]} />
      <Animated.View style={[styles.orb, styles.peachOrb, {
        opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.055, 0.12] }),
        transform: [
          { translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -38] }) },
          { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
        ],
      }]} />
      <Animated.View style={[styles.orb, styles.blueOrb, {
        opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.09] }),
        transform: [{ translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
      }]} />
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0B0A12' },
  orb: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
  lavenderOrb: { top: 50, right: -115, backgroundColor: '#8B73E6' },
  peachOrb: { top: 330, left: -160, width: 300, height: 300, borderRadius: 150, backgroundColor: '#C98791' },
  blueOrb: { top: 570, right: -140, width: 240, height: 240, borderRadius: 120, backgroundColor: '#6599D9' },
});
