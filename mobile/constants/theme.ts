import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#080D0A',
    backgroundDeep: '#050805',
    surface: '#111914',
    surface2: '#172119',
    surface3: '#1D2A20',
    primary: '#C9F36A',
    primaryDim: '#9FC747',
    primaryGlow: 'rgba(201,243,106,0.34)',
    text: '#F3F7F0',
    textMuted: '#99A398',
    textDim: '#647064',
    border: 'rgba(220,246,218,0.08)',
    borderStrong: 'rgba(220,246,218,0.15)',
    glass: 'rgba(17,25,20,0.58)',
    glassStrong: 'rgba(17,25,20,0.76)',
    glassHighlight: 'rgba(220,246,218,0.055)',
    danger: '#FF4D5A',
    success: '#4ADE80',
    accentViolet: '#8B5CF6',
    accentBlue: '#38BDF8',
  },
  light: {
    background: '#F5F7FA',
    backgroundDeep: '#EEF1F5',
    surface: '#FFFFFF',
    surface2: '#EEF1F5',
    surface3: '#E4E8EF',
    primary: '#6B9E00',
    primaryDim: '#558000',
    primaryGlow: 'rgba(107,158,0,0.25)',
    text: '#0B0F14',
    textMuted: '#647064',
    textDim: '#99A398',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.14)',
    glass: 'rgba(255,255,255,0.55)',
    glassStrong: 'rgba(255,255,255,0.72)',
    glassHighlight: 'rgba(255,255,255,0.4)',
    danger: '#D63031',
    success: '#2E9E5B',
    accentViolet: '#7C3AED',
    accentBlue: '#0284C7',
  },
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const Radius = { xs: 4, sm: 8, md: 12, lg: 18, xl: 24, xxl: 32, full: 999 };
export const Typography = {
  display: { fontSize: 34, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  small: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.3 },
};
export const FontFamily = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' });
export const Glass = {
  card: { backgroundColor: Colors.dark.glass, borderWidth: 1, borderColor: Colors.dark.border },
  strong: { backgroundColor: Colors.dark.glassStrong, borderWidth: 1, borderColor: Colors.dark.borderStrong },
  highlight: { backgroundColor: Colors.dark.glassHighlight },
};
export const Shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  glow: { shadowColor: Colors.dark.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
};
export const Motion = {
  fast: 150, normal: 200, slow: 300,
  spring: { damping: 18, stiffness: 220 },
};
