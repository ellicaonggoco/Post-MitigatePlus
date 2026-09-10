import React from 'react';
import { Dimensions, PixelRatio, Platform, StatusBar, View, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const isSmallDevice = SCREEN_WIDTH < 360;
export const isStandardDevice = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 428;
export const isLargeDevice = SCREEN_WIDTH >= 428 && SCREEN_WIDTH < 600;
export const isTablet = SCREEN_WIDTH >= 600;

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
  if (Platform.OS === 'web') return 0;
  if (Platform.OS === 'android') {
    // Dynamic status bar height: Android punch holes, teardrop cutouts, and status bars range from 34px to 48px.
    // Ensure a safe baseline of at least 38px on modern Android devices.
    return Math.max(StatusBar.currentHeight || 0, 38);
  }
  if (Platform.OS === 'ios') return (SCREEN_HEIGHT >= 812 || SCREEN_WIDTH >= 812) ? 44 : 20;
  return 0;
};

export const STATUSBAR_INSET = getStatusBarHeight();

export const TopStatusBarBlur = ({ backgroundColor = 'rgba(243, 246, 252, 0.96)', borderBottom = true }) => {
  const topSafe = getStatusBarHeight();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: topSafe,
        backgroundColor,
        borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: 'rgba(203, 213, 225, 0.6)',
        zIndex: 9999,
      }}
    />
  );
};

export const RESPONSIVE = {
  padding: SCREEN_WIDTH < 360 ? 12 : SCREEN_WIDTH < 420 ? 14 : 16,
  topSafe: STATUSBAR_INSET,
  cardPadding: SCREEN_WIDTH < 360 ? 14 : 18,
  maxCardWidth: Math.min(SCREEN_WIDTH - 24, 460),
  inputHeight: Math.max(48, moderateScale(48)),
  buttonHeight: Math.max(48, moderateScale(48)),
  borderRadius: SCREEN_WIDTH < 360 ? 10 : 14,
  fontScale: SCALE,
};

// Manila City Seal Color Identity — Red + Royal Blue + Gold
export const M = {
  // Manila Crimson Red
  red: '#C8102E',
  redDark: '#9E0B24',
  redDeep: '#6E071A',
  redTint: '#FEF0F2',
  redMid: '#F5E0E3',

  // Manila Royal Blue
  blue: '#1C3F94',
  blueDark: '#12296A',
  blueDeep: '#0B1D4E',
  blueTint: '#EDF1FB',
  blueMid: '#D6DEFA',

  // Manila Gold
  gold: '#C9A84C',
  goldRich: '#B8932A',
  goldLight: '#FBF5E4',
  goldMid: '#F0DFA0',

  // Surfaces
  white: '#FFFFFF',
  canvas: '#F3F6FC',
  border: '#DDE4F0',

  // Typography
  text: '#0B1525',
  textSec: '#3D5070',
  textMuted: '#8A9BB8',

  // Status
  green: '#0D8A5A',
  greenTint: '#E6F6EF',
};

// Keep COLORS as alias for backward compat with old screens
export const COLORS = {
  bg: M.canvas,
  surface: M.white,
  card: M.white,
  cardAlt: M.canvas,
  primary: M.red,
  royalNavy: M.blue,
  navyDark: M.blueDeep,
  navyDeep: M.blueDeep,
  blueLight: M.blueTint,
  textDark: M.text,
  textSecondary: M.textSec,
  textMuted: M.textMuted,
  pureWhite: M.white,
  manilaGold: M.gold,
  goldDark: M.goldRich,
  goldLight: M.goldLight,
  success: M.green,
  emeraldLight: M.greenTint,
  emergency: M.red,
  crimsonLight: M.redTint,
  border: M.border,
  borderLight: M.border,
  inkLighter: M.textMuted,
  shadowColor: M.blueDeep,
};

export const TYPOGRAPHY = {
  display: scaleFont(22),
  title: scaleFont(18),
  h2: scaleFont(16),
  h3: scaleFont(14),
  body: scaleFont(12.5),
  caption: scaleFont(11),
  micro: scaleFont(9.5),
};

export const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  default: undefined,
});

export const FONT_WEIGHT = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
};

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
  card: 20,
  pill: 9999,
};

const makeShadow = (nativeProps, webBoxShadow) => {
  if (Platform.OS === 'web') {
    return { boxShadow: webBoxShadow };
  }
  return nativeProps;
};

// Blue-tinted shadow system (premium signature)
const SHADOW_DEFS = {
  sm: makeShadow(
    { shadowColor: M.blueDeep, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    '0 1px 3px rgba(11,21,80,0.06), 0 4px 12px rgba(28,63,148,0.08)'
  ),
  md: makeShadow(
    { shadowColor: M.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
    '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)'
  ),
  lg: makeShadow(
    { shadowColor: M.blue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 8 },
    '0 2px 6px rgba(11,21,80,0.05), 0 16px 40px rgba(28,63,148,0.13)'
  ),
  pill: makeShadow(
    { shadowColor: M.blueDeep, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3 },
    '0 1px 3px rgba(11,21,80,0.06), 0 4px 14px rgba(28,63,148,0.10)'
  ),
  card: makeShadow(
    { shadowColor: M.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
    '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)'
  ),
  button: makeShadow(
    { shadowColor: M.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 6 },
    '0 4px 18px rgba(28,63,148,0.32)'
  ),
  redButton: makeShadow(
    { shadowColor: M.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 6 },
    '0 4px 18px rgba(200,16,46,0.30)'
  ),
  gold: makeShadow(
    { shadowColor: M.gold, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
    '0 4px 18px rgba(201,168,76,0.30)'
  ),
  floating: makeShadow(
    { shadowColor: M.blueDeep, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.20, shadowRadius: 24, elevation: 14 },
    '0 2px 6px rgba(11,21,80,0.05), 0 16px 40px rgba(28,63,148,0.13)'
  ),
};

export const SHADOWS = SHADOW_DEFS;

export const NEUMORPHIC = {
  raised: {
    backgroundColor: M.white,
    borderWidth: 1,
    borderColor: M.border,
    ...SHADOW_DEFS.card,
  },
};

export const BUTTON_VARIANTS = {
  primary: { backgroundColor: M.blue, borderColor: M.blue, textColor: M.white },
  danger: { backgroundColor: M.red, borderColor: M.red, textColor: M.white },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent', textColor: M.text },
};
