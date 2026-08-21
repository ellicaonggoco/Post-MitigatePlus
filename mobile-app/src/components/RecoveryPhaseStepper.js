import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_WEIGHT, SHADOWS } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { ShieldCheckIcon } from './AppIcons';
import { MotionProgressTrack } from './motion';

const STAGES_EN = [
  { key: 'verified', label: '1. Verified', shortLabel: 'Verified', desc: 'Household profile officially verified by LGU' },
  { key: 'assessed', label: '2. Assessed', shortLabel: 'Assessed', desc: 'Damage survey & structural evaluation recorded' },
  { key: 'allocated', label: '3. Allocated', shortLabel: 'Allocated', desc: 'Relief pack right-sized quota prepared' },
  { key: 'ready', label: '4. Ready', shortLabel: 'Ready', desc: 'Available for immediate on-site claiming' },
  { key: 'recovered', label: '5. Recovered', shortLabel: 'Recovered', desc: 'Assistance claimed & recovery case closed' },
];

const STAGES_TL = [
  { key: 'verified', label: '1. Beripikado', shortLabel: 'Beripikado', desc: 'Opisyal na naberipika ng LGU ang pamilya' },
  { key: 'assessed', label: '2. Na-Assessed', shortLabel: 'Na-Assessed', desc: 'Nasuri ang pinsala sa bahay at lokasyon' },
  { key: 'allocated', label: '3. Naka-Aloka', shortLabel: 'Naka-Aloka', desc: 'Inihanda ang tamang dami ng relief packs' },
  { key: 'ready', label: '4. Handa na', shortLabel: 'Handa na', desc: 'Pwedeng i-claim sa covered court gamit ang QR' },
  { key: 'recovered', label: '5. Naka-Recover', shortLabel: 'Natapos', desc: 'Natanggap ang ayuda at naitala sa database' },
];

export default function RecoveryPhaseStepper({ currentStatus = 'allocated', percentage = 65, lang = 'en' }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const stages = lang === 'tl' ? STAGES_TL : STAGES_EN;

  let activeIndex = 2;
  const statusLower = (currentStatus || '').toLowerCase();
  if (statusLower.includes('register') || statusLower.includes('pending') || statusLower === 'waiting') {
    activeIndex = 0;
  } else if (statusLower.includes('assess') || statusLower.includes('damage')) {
    activeIndex = 1;
  } else if (statusLower.includes('aloka') || statusLower.includes('allocated')) {
    activeIndex = 2;
  } else if (statusLower.includes('transit') || statusLower.includes('ready') || statusLower.includes('claiming')) {
    activeIndex = 3;
  } else if (statusLower.includes('recover') || statusLower.includes('received') || statusLower.includes('ongoing')) {
    activeIndex = 4;
  }

  const currentStage = stages[activeIndex] || stages[2];

  return (
    <View style={styles.container}>
      {/* Header Metric Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.stepperTitle}</Text>
          <Text style={styles.subTitle}>{t.stepperKicker}</Text>
        </View>

        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>{percentage}% {lang === 'tl' ? 'Natapos' : 'Done'}</Text>
        </View>
      </View>

      {/* Progress Track (Motion Primitive Liquid Fill) */}
      <MotionProgressTrack percentage={percentage} height={8} color="#1557B0" style={{ marginVertical: 14 }} />

      {/* 5-Step Segmented Markers */}
      <View style={styles.stepsRow}>
        {stages.map((stage, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <View key={stage.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepNode,
                  isCompleted && styles.stepNodeCompleted,
                  isCurrent && styles.stepNodeCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    (isCompleted || isCurrent) && styles.stepNumberActive,
                  ]}
                >
                  {isCompleted ? '✓' : idx + 1}
                </Text>
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  (isCompleted || isCurrent) && styles.stepLabelActive,
                ]}
                numberOfLines={1}
              >
                {stage.shortLabel}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Current Active Stage Description Callout */}
      <View style={styles.activeCallout}>
        <View style={styles.activeCalloutHeader}>
          <ShieldCheckIcon size={14} color="#D97706" />
          <Text style={styles.activeCalloutTitle}>
            {lang === 'tl' ? 'KASALUKUYANG YUGTO:' : 'ACTIVE PHASE:'} {currentStage.label}
          </Text>
        </View>
        <Text style={styles.activeCalloutDesc}>{currentStage.desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 15.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
  },
  subTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  percentBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  trackContainer: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#1557B0',
    borderRadius: 999,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNodeCompleted: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  stepNodeCurrent: {
    backgroundColor: '#1557B0',
    borderColor: '#D97706',
    borderWidth: 2.5,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#172B4D',
    fontWeight: '800',
  },
  activeCallout: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  activeCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  activeCalloutTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  activeCalloutDesc: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 15,
  },
});
