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
// INTENTIONAL COLOR SYSTEM (60-30-10 CIVIC HARMONY)
// - 60% Canvas & Surfaces: Pearl White & Clean Card White (#F8F9F7, #FFFFFF)
// - 30% Structural Blue & Slate Navy: Authority & Readability (#1557B0, #172B4D)
// - 10% Purposeful Accents: Manila Gold (#D97706), Emerald (#16A34A), Coral (#DC2626)
// ============================================================================
export const COLORS = {
  // 60% Canvas & Surfaces
  bg: '#F8F9F7', // Pearl White Canvas
  surface: '#FFFFFF', // Pure White Elevated Surfaces
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',
  well: '#F8F9F7',
  wellDark: '#E8F2FF',

  // 30% Structural Authority & Typography
  primary: '#1557B0', // Manila Primary Blue
  royalNavy: '#1557B0',
  navyDark: '#0B2E59', // Deep Institutional Navy
  navyDeep: '#0B2E59',
  blueLight: '#E8F2FF', // Soft Sky Blue Tint
  blueBorder: '#BFDBFE',
  info: '#2563EB',

  // High-Contrast WCAG AAA Typography
  textDark: '#172B4D', // Primary Text (Slate Navy)
  textSecondary: '#475569', // Secondary Text (Slate Gray)
  textMuted: '#64748B', // Tertiary / Helper Text
  pureWhite: '#FFFFFF',

  // 10% Semantic & Prestige Accents (Used strictly with purpose)
  manilaGold: '#D97706',
  goldDark: '#B45309',
  goldBright: '#F59E0B',
  goldLight: '#FEF3C7',
  goldBorder: '#FDE68A',

  // Emerald Resilience
  success: '#16A34A',
  emeraldLight: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  emeraldText: '#16A34A',

  // Alert Red
  emergency: '#DC2626',
  crimsonLight: '#FEE2E2',
  crimsonBorder: '#FCA5A5',
  crimsonText: '#DC2626',

  // Amber Advisory
  warning: '#F59E0B',
  amberLight: '#FFFBEB',
  amberBorder: '#FCD34D',
  amberText: '#D97706',

  // Razor-sharp 1px structural dividers
  border: '#D9E2EC',
  borderLight: '#EDF2F7',
  borderDark: '#CBD5E1',
  borderFocus: '#1557B0',

  shadowColor: '#0F172A',
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
// ============================================================================
// RESPONSIVE CARD HELPERS & BUTTON VARIANTS
// ============================================================================
export const NEUMORPHIC = {
  raised: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    ...SHADOWS.card,
  },
  sunken: {
    backgroundColor: '#F8F9F7',
    borderWidth: 1,
    borderColor: '#D9E2EC',
  },
  pressed: {
    backgroundColor: '#E8F2FF',
    borderWidth: 1.5,
    borderColor: '#1557B0',
  },
};

export const BUTTON_VARIANTS = {
  primary: {
    backgroundColor: '#1557B0',
    borderColor: '#1557B0',
    textColor: '#FFFFFF',
  },
  secondary: {
    backgroundColor: '#E8F2FF',
    borderColor: '#BFDBFE',
    textColor: '#1557B0',
  },
  danger: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
    textColor: '#FFFFFF',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: '#172B4D',
  },
};
