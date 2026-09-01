import { Dimensions, PixelRatio, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Baseline design dimensions (Standard 375x812 DP)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Dynamic screen detection & adaptive scaling factor
export const isSmallDevice = SCREEN_WIDTH < 360;
export const isStandardDevice = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 428;
export const isLargeDevice = SCREEN_WIDTH >= 428 && SCREEN_WIDTH < 600;
export const isTablet = SCREEN_WIDTH >= 600;

// Dynamic responsive scaler clamped between 0.85 (iPhone SE) and 1.25 (iPad / Tablet)
const SCALE = Math.min(Math.max(SCREEN_WIDTH / BASE_WIDTH, 0.85), 1.25);

export const scaleFont = (size) => Math.round(PixelRatio.roundToNearestPixel(size * SCALE));
export const scaleSpacing = (size) => Math.round(size * SCALE);

export const wp = (percent) => {
  const p = typeof percent === 'string' ? parseFloat(percent) : percent;
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * p) / 100);
};

export const hp = (percent) => {
  const p = typeof percent === 'string' ? parseFloat(percent) : percent;
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * p) / 100);
};

export const scale = (size) => (SCREEN_WIDTH / BASE_WIDTH) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
export const moderateScale = (size, factor = 0.5) => Math.round(size + (scale(size) - size) * factor);

export const getStatusBarHeight = () => {
  if (Platform.OS === 'android') {
    return Math.max(StatusBar.currentHeight || 36, 36) + 24;
  }
  if (SCREEN_HEIGHT >= 812 || SCREEN_WIDTH >= 812) {
    return 56;
  }
  return 40;
};

export const STATUSBAR_INSET = getStatusBarHeight();

export const RESPONSIVE = {
  padding: SCREEN_WIDTH < 360 ? 12 : SCREEN_WIDTH < 420 ? 16 : 22,
  topSafe: STATUSBAR_INSET,
  cardPadding: SCREEN_WIDTH < 360 ? 14 : 20,
  maxCardWidth: Math.min(SCREEN_WIDTH - 24, 460),
  inputHeight: Math.max(48, moderateScale(48)),
  buttonHeight: Math.max(48, moderateScale(48)),
  borderRadius: SCREEN_WIDTH < 360 ? 10 : 14,
  fontScale: SCALE,
};

// ============================================================================
// PREMIUM DARK NAVY + GOLD CIVIC SYSTEM
// - 60% Deep Navy Surfaces: #0A1628 (canvas), #0F2040 (cards), #162035 (elevated)
// - 30% Midnight Blue Structural: #1A3A6B (borders), #243B6E (dividers)
// - 10% Manila Gold Accents: #F59E0B (primary gold), #FBBF24 (bright gold), #FCD34D (soft gold)
// Premium feel: Government VIP / High-Authority Civic App
// ============================================================================
export const COLORS = {
  // 60% Deep Navy Canvas & Surfaces
  bg: '#0A1628',
  surface: '#0F2040',
  card: '#0F2040',
  cardAlt: '#162850',
  well: '#071020',
  wellDark: '#050D1A',

  // 30% Structural Navy Borders & Dividers
  primary: '#F59E0B',
  royalNavy: '#1A3A6B',
  navyDark: '#0D2444',
  navyDeep: '#071020',
  blueLight: '#1A2E4A',
  blueBorder: '#1E3A5F',
  info: '#60A5FA',

  // High-Contrast Typography (white on dark)
  textDark: '#F0F6FF',
  textSecondary: '#94A3C0',
  textMuted: '#5A7498',
  pureWhite: '#FFFFFF',

  // 10% Manila Gold Prestige Accents
  manilaGold: '#F59E0B',
  goldDark: '#D97706',
  goldBright: '#FBBF24',
  goldLight: '#1E1A00',
  goldBorder: '#92620A',
  goldGlow: 'rgba(245,158,11,0.18)',

  // Emerald Resilience
  success: '#10B981',
  emeraldLight: '#052E1A',
  emeraldBorder: '#065F46',
  emeraldText: '#34D399',

  // Alert Red
  emergency: '#EF4444',
  crimsonLight: '#1F0808',
  crimsonBorder: '#7F1D1D',
  crimsonText: '#FCA5A5',

  // Amber Advisory
  warning: '#F59E0B',
  amberLight: '#1C1200',
  amberBorder: '#78350F',
  amberText: '#FCD34D',

  // Structural dividers
  border: '#1E3A5F',
  borderLight: '#162040',
  borderDark: '#243B6E',
  borderFocus: '#F59E0B',

  shadowColor: '#000000',
};

// ============================================================================
// TYPOGRAPHY SCALES (Fluid, Scannable & Clear Hierarchy)
// ============================================================================
export const TYPOGRAPHY = {
  display: scaleFont(22),
  title: scaleFont(18),
  h2: scaleFont(16),
  h3: scaleFont(14),
  body: scaleFont(12.5),
  caption: scaleFont(11),
  micro: scaleFont(9.5),
};

export const FONT_WEIGHT = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
};

// ============================================================================
// FLUID GRID & SPACING
// ============================================================================
export const SPACING = {
  xxs: scaleSpacing(2),
  xs: scaleSpacing(4),
  sm: scaleSpacing(8),
  md: scaleSpacing(14),
  lg: scaleSpacing(18),
  xl: scaleSpacing(24),
  xxl: scaleSpacing(32),
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  inner: 10,
  card: 16,
  pill: 9999,
};

// ============================================================================
// PREMIUM DARK SHADOWS (Deeper, richer on dark background)
// ============================================================================
export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)' } : {}),
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 14px rgba(15, 23, 42, 0.10)' } : {}),
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 22px rgba(15, 23, 42, 0.12)' } : {}),
  },
  pill: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 4,
    ...(Platform.OS === 'web' ? { boxShadow: '0 3px 10px rgba(15, 23, 42, 0.12)' } : {}),
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 14px rgba(15, 23, 42, 0.07)' } : {}),
  },
  button: {
    shadowColor: '#1557B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 5,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 14px rgba(21, 87, 176, 0.30)' } : {}),
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
    ...(Platform.OS === 'web' ? { boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)' } : {}),
  },
  gold: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(245, 158, 11, 0.30)' } : {}),
  },
};

// ============================================================================
// CARD VARIANTS (Premium dark surfaces)
// ============================================================================
export const NEUMORPHIC = {
  raised: {
    backgroundColor: '#0F2040',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    ...SHADOWS.md,
  },
  sunken: {
    backgroundColor: '#071020',
    borderWidth: 1,
    borderColor: '#162040',
  },
  pressed: {
    backgroundColor: '#162040',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  gold: {
    backgroundColor: '#0F2040',
    borderWidth: 1.5,
    borderColor: '#92620A',
  },
};

export const BUTTON_VARIANTS = {
  primary: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
    textColor: '#0A1628',
  },
  secondary: {
    backgroundColor: '#162850',
    borderColor: '#1E3A5F',
    textColor: '#F0F6FF',
  },
  danger: {
    backgroundColor: '#EF4444',
    borderColor: '#B91C1C',
    textColor: '#FFFFFF',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: '#1E3A5F',
    textColor: '#F0F6FF',
  },
};
