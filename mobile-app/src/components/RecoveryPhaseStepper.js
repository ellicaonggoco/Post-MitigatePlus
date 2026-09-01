import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_WEIGHT, SHADOWS } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { ShieldCheckIcon, CheckIcon } from './AppIcons';
import { MotionProgressTrack } from './motion';

const STAGES_EN = [
  { key: 'verification', label: '1. Verification', shortLabel: 'Verification', desc: 'Household document review by Barangay Admin in Queue' },
  { key: 'assessed', label: '2. Assessed', shortLabel: 'Assessed', desc: 'Damage survey & vulnerability priority calculated' },
  { key: 'allocated', label: '3. Allocated', shortLabel: 'Allocated', desc: 'Relief pack right-sized quota prepared' },
  { key: 'ready', label: '4. Ready', shortLabel: 'Ready', desc: 'Available for immediate on-site claiming' },
  { key: 'recovered', label: '5. Recovered', shortLabel: 'Recovered', desc: 'Assistance claimed & recovery case closed' },
];

const STAGES_TL = [
  { key: 'verification', label: '1. Beripikasyon', shortLabel: 'Beripikasyon', desc: 'Pagsusuri ng dokumento ng Barangay Admin sa Queue' },
  { key: 'assessed', label: '2. Na-Assessed', shortLabel: 'Na-Assessed', desc: 'Nasuri ang priority index at antas ng tulong' },
  { key: 'allocated', label: '3. Naka-Aloka', shortLabel: 'Naka-Aloka', desc: 'Inihanda ang tamang dami ng relief packs' },
  { key: 'ready', label: '4. Handa na', shortLabel: 'Handa na', desc: 'Pwedeng i-claim sa covered court gamit ang QR' },
  { key: 'recovered', label: '5. Naka-Recover', shortLabel: 'Natapos', desc: 'Natanggap ang ayuda at naitala sa database' },
];

export default function RecoveryPhaseStepper({
  currentStatus,
  isVerified = true,
  percentage: customPercentage,
  lang = 'en',
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const stages = lang === 'tl' ? STAGES_TL : STAGES_EN;

  let activeIndex = 0;
  let calculatedPercent = 15;

  if (!isVerified) {
    activeIndex = 0;
    calculatedPercent = 15;
  } else {
    const statusLower = (currentStatus || 'allocated').toLowerCase();
    if (statusLower.includes('register') || statusLower.includes('pending') || statusLower === 'waiting') {
      activeIndex = 0;
      calculatedPercent = 20;
    } else if (statusLower.includes('assess') || statusLower.includes('damage')) {
      activeIndex = 1;
      calculatedPercent = 40;
    } else if (statusLower.includes('aloka') || statusLower.includes('allocated')) {
      activeIndex = 2;
      calculatedPercent = 65;
    } else if (statusLower.includes('transit') || statusLower.includes('ready') || statusLower.includes('claiming')) {
      activeIndex = 3;
      calculatedPercent = 85;
    } else if (statusLower.includes('recover') || statusLower.includes('received') || statusLower.includes('ongoing')) {
      activeIndex = 4;
      calculatedPercent = 100;
    } else {
      activeIndex = 1;
      calculatedPercent = 35;
    }
  }

  const percentage = customPercentage !== undefined ? customPercentage : calculatedPercent;
  const currentStage = stages[activeIndex] || stages[0];

  return (
    <View style={styles.container}>
      {/* Header Metric Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.stepperTitle}</Text>
          <Text style={styles.subTitle}>{t.stepperKicker}</Text>
        </View>

        <View style={[styles.percentBadge, !isVerified && { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
          <Text style={[styles.percentText, !isVerified && { color: '#B45309' }]}>
            {percentage}% {lang === 'tl' ? 'Natapos' : 'Done'}
          </Text>
        </View>
      </View>

      {/* Progress Track (Motion Primitive Liquid Fill) */}
      <MotionProgressTrack
        percentage={percentage}
        height={5}
        color={!isVerified ? '#D97706' : '#1557B0'}
        style={{ marginVertical: 6 }}
      />

      {/* 5-Step Segmented Markers */}
      <View style={styles.stepsRow}>
        {stages.map((stage, idx) => {
          const isCompleted = isVerified && idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <View key={stage.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepNode,
                  isCompleted && styles.stepNodeCompleted,
                  isCurrent && (isVerified ? styles.stepNodeCurrent : styles.stepNodePending),
                ]}
              >
                {isCompleted || (isCurrent && isVerified) ? (
                  <CheckIcon size={11} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      (isCompleted || isCurrent) && styles.stepNumberActive,
                      !isVerified && isCurrent && { color: '#B45309' },
                    ]}
                  >
                    {idx + 1}
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  (isCompleted || isCurrent) && styles.stepLabelActive,
                  !isVerified && isCurrent && { color: '#B45309', fontWeight: '800' },
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
      <View style={[styles.activeCallout, !isVerified && { backgroundColor: '#FFFDF5', borderColor: '#FDE68A' }]}>
        <View style={styles.activeCalloutHeader}>
          <ShieldCheckIcon size={14} color={!isVerified ? '#D97706' : '#1557B0'} />
          <Text style={[styles.activeCalloutTitle, !isVerified && { color: '#92400E' }]}>
            {lang === 'tl' ? 'KASALUKUYANG YUGTO:' : 'ACTIVE PHASE:'} {!isVerified ? (lang === 'tl' ? '1. Beripikasyon (Nakabinbin)' : '1. Verification (Pending)') : currentStage.label}
          </Text>
        </View>
        <Text style={[styles.activeCalloutDesc, !isVerified && { color: '#78350F' }]}>
          {!isVerified
            ? (lang === 'tl'
                ? 'Nasa Verification Queue pa ang inyong rehistrasyon sa Barangay 291. Awtomatikong uusad ang progreso kapag naaprubahan na ng Barangay Official.'
                : 'Your registration is currently in the Barangay 291 Verification Queue. Progress will advance once approved by the Barangay Official.')
            : currentStage.desc}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 0.5,
    letterSpacing: 0.2,
  },
  percentBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  stepNodeCompleted: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  stepNodeCurrent: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
    borderWidth: 1.5,
  },
  stepNodePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 1.5,
  },
  stepNumber: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 8.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  activeCallout: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 8,
  },
  activeCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  activeCalloutTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.3,
  },
  activeCalloutDesc: {
    fontSize: 10,
    color: '#78350F',
    lineHeight: 13,
  },
});
