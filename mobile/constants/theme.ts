import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#0B0A12',
    backgroundDeep: '#08070D',
    surface: '#14121E',
    surface2: '#1D192A',
    surface3: '#29233A',
    primary: '#C4B5FD',
    primaryDim: '#A78BFA',
    primaryGlow: 'rgba(196,181,253,0.26)',
    text: '#F7F4FF',
    textMuted: '#B2AABD',
    textDim: '#81798E',
    border: 'rgba(246,241,255,0.09)',
    borderStrong: 'rgba(246,241,255,0.16)',
    glass: 'rgba(25,21,36,0.48)',
    glassStrong: 'rgba(25,21,36,0.76)',
    glassHighlight: 'rgba(246,241,255,0.075)',
    danger: '#FF7188',
    success: '#86D9B5',
    accentViolet: '#A78BFA',
    accentBlue: '#93C5FD',
    accentPeach: '#F6BDA8',
  },
  light: {
    background: '#F7F4FA',
    backgroundDeep: '#EFEAF5',
    surface: '#FFFCFF',
    surface2: '#F0EBF7',
    surface3: '#E5DDF0',
    primary: '#7865C8',
    primaryDim: '#6551B4',
    primaryGlow: 'rgba(120,101,200,0.22)',
    text: '#211A2B',
    textMuted: '#776D84',
    textDim: '#A69AAF',
    border: 'rgba(48,34,66,0.08)',
    borderStrong: 'rgba(48,34,66,0.14)',
    glass: 'rgba(255,252,255,0.58)',
    glassStrong: 'rgba(255,252,255,0.82)',
    glassHighlight: 'rgba(255,255,255,0.52)',
    danger: '#D94766',
    success: '#328A69',
    accentViolet: '#8B73E6',
    accentBlue: '#649FD9',
    accentPeach: '#D88D78',
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
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 2 },
  md: { shadowColor: '#05030A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4 },
  lg: { shadowColor: '#05030A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 22, elevation: 8 },
  glow: { shadowColor: Colors.dark.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 5 },
};
export const Motion = {
  fast: 160, normal: 240, slow: 420,
  spring: { damping: 17, stiffness: 190, mass: 0.8 },
};
