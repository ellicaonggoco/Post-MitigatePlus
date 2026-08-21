import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, FONT_WEIGHT, SPACING } from '../theme';

export default function MascotHeader({ residentName = 'Juan', address = 'Purok 4, Barangay 291', priorityLevel = 'Medium' }) {
  return (
    <LinearGradient
      colors={[COLORS.manilaBlue, COLORS.manilaBlueDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={styles.header}
    >
      <View style={styles.row}>
        {/* Mascot "Kap" */}
        <Svg width={48} height={48} viewBox="0 0 52 52">
          <Ellipse cx="26" cy="30" rx="20" ry="18" fill={COLORS.bayTeal} />
          <Path d="M10 22 Q26 8 42 22 L38 26 Q26 16 14 26 Z" fill={COLORS.manilaBlue} />
          <Circle cx="19" cy="30" r="8" fill={COLORS.bayTealDeep} opacity={0.25} />
          <Circle cx="19" cy="29" r="2.6" fill={COLORS.ink} />
          <Circle cx="33" cy="29" r="2.6" fill={COLORS.ink} />
          <Circle cx="15" cy="35" r="3" fill={COLORS.jeepneyAmber} opacity={0.55} />
          <Circle cx="37" cy="35" r="3" fill={COLORS.jeepneyAmber} opacity={0.55} />
          <Path d="M18 38 Q26 44 34 38" stroke={COLORS.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M22 20 L26 12 L30 20 Z" fill={COLORS.jeepneyAmber} />
        </Svg>

        <View style={styles.greeting}>
          <Text style={styles.title}>Kumusta, {residentName}!</Text>
          <Text style={styles.sub}>{address}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Priority: {priorityLevel}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: RADIUS.outer * 1.5,
    borderBottomRightRadius: RADIUS.outer * 1.5,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.black,
    color: '#FFFFFF',
  },
  sub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: FONT_WEIGHT.bold,
  },
});
