import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { COLORS, FONT_WEIGHT } from '../theme';

const STOPS = [
  { id: 'registered', labelEn: 'Registered', labelTl: 'Naghihintay' },
  { id: 'assessed', labelEn: 'Assessed', labelTl: 'Nakatanggap' },
  { id: 'ongoing', labelEn: 'Ongoing', labelTl: 'Bumabangon' },
  { id: 'partially_recovered', labelEn: 'Partial', labelTl: 'Bahagya' },
  { id: 'recovered', labelEn: 'Recovered', labelTl: 'Naka-recover' },
];

function PhilippineJeepneyIcon({ color = '#F59E0B' }) {
  return (
    <Svg width="36" height="24" viewBox="0 0 36 24" fill="none">
      {/* Main Body */}
      <Rect x="2" y="6" width="32" height="12" rx="3" fill={color} />
      {/* Roof visor */}
      <Path d="M2 6 C6 3, 30 3, 34 6 Z" fill="#002BB8" />
      {/* Front Windshield */}
      <Rect x="26" y="8" width="6" height="5" rx="1" fill="#FFFFFF" opacity="0.9" />
      {/* Side Windows */}
      <Rect x="5" y="8" width="5" height="4" rx="1" fill="#FFFFFF" opacity="0.8" />
      <Rect x="12" y="8" width="5" height="4" rx="1" fill="#FFFFFF" opacity="0.8" />
      <Rect x="19" y="8" width="5" height="4" rx="1" fill="#FFFFFF" opacity="0.8" />
      {/* Chrome Bumper */}
      <Rect x="32" y="14" width="3" height="3" fill="#CBD5E1" />
      {/* Wheels */}
      <Circle cx="8" cy="18" r="3.5" fill="#0F172A" />
      <Circle cx="8" cy="18" r="1.5" fill="#CBD5E1" />
      <Circle cx="26" cy="18" r="3.5" fill="#0F172A" />
      <Circle cx="26" cy="18" r="1.5" fill="#CBD5E1" />
    </Svg>
  );
}

export default function JeepneyRouteTracker({ currentStage = 'ongoing', t, darkMode = false }) {
  const currentIndex = STOPS.findIndex(s => s.id === currentStage);
  const activeIdx = currentIndex >= 0 ? currentIndex : 2;
  const fillWidthPercent = `${(activeIdx / (STOPS.length - 1)) * 100}%`;

  const theme = {
    card: darkMode ? '#071D3A' : '#FFFFFF',
    border: darkMode ? 'rgba(255, 255, 255, 0.2)' : '#E2E8F0',
    title: darkMode ? '#FFFFFF' : '#002BB8',
    sub: darkMode ? '#93C5FD' : '#64748B',
    lineBg: darkMode ? 'rgba(255, 255, 255, 0.2)' : '#E2E8F0',
    labelCurrent: darkMode ? '#F59E0B' : '#002BB8',
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.title }]}>
        {t?.journeyTitle || 'Household Recovery Journey'}
      </Text>
      <Text style={[styles.sub, { color: theme.sub }]}>
        {t?.journeySub || 'Subaybayan ang yugto ng pagbangon ng inyong pamilya'}
      </Text>

      <View style={styles.routeContainer}>
        {/* Jeepney Icon marking current stop */}
        <View style={[styles.jeepPosition, { left: `${Math.min(Math.max((activeIdx / (STOPS.length - 1)) * 80 + 5, 5), 85)}%` }]}>
          <PhilippineJeepneyIcon color="#F59E0B" />
        </View>

        {/* Route Line & Active Fill */}
        <View style={[styles.lineBackground, { backgroundColor: theme.lineBg }]} />
        <View style={[styles.lineFill, { width: fillWidthPercent }]} />

        {/* Stops Row */}
        <View style={styles.stopsRow}>
          {STOPS.map((stop, idx) => {
            const isDone = idx < activeIdx;
            const isCurrent = idx === activeIdx;
            const stopLabel = stop.labelTl;

            return (
              <View key={stop.id} style={styles.stopItem}>
                <View
                  style={[
                    styles.nodeCircle,
                    isDone && styles.nodeDone,
                    isCurrent && styles.nodeCurrent,
                  ]}
                >
                  <Text style={[styles.nodeText, (isDone || isCurrent) && styles.nodeTextActive]}>
                    {isDone ? '✓' : idx + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stopLabel,
                    { color: isCurrent ? theme.labelCurrent : darkMode ? '#94A3B8' : '#64748B' },
                    isCurrent && styles.stopLabelCurrent,
                  ]}
                  numberOfLines={1}
                >
                  {stopLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 15, fontWeight: FONT_WEIGHT.black },
  sub: { fontSize: 11, marginTop: 2, marginBottom: 14 },
  routeContainer: { paddingTop: 24, paddingBottom: 10, position: 'relative' },
  jeepPosition: { position: 'absolute', top: 0, zIndex: 10 },
  lineBackground: { position: 'absolute', top: 32, left: 16, right: 16, height: 4, borderRadius: 2 },
  lineFill: { position: 'absolute', top: 32, left: 16, height: 4, backgroundColor: '#002BB8', borderRadius: 2 },
  stopsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopItem: { alignItems: 'center', width: 60 },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 5,
  },
  nodeDone: { backgroundColor: '#059669' },
  nodeCurrent: { backgroundColor: '#F59E0B', borderWidth: 2, borderColor: '#FFFFFF' },
  nodeText: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },
  nodeTextActive: { color: '#FFFFFF' },
  stopLabel: { fontSize: 9, textAlign: 'center' },
  stopLabelCurrent: { fontWeight: '800' },
});
