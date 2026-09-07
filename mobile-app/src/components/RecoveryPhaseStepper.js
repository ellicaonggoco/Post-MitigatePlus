import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_WEIGHT, SHADOWS } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { ShieldCheckIcon, CheckIcon } from './AppIcons';

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

        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>
            {percentage}% {lang === 'tl' ? 'Natapos' : 'Done'}
          </Text>
        </View>
      </View>

      {/* Progress Track with Red to Gold Gradient */}
      <View style={styles.trackBackground}>
        <LinearGradient
          colors={['#C8102E', '#D97706', '#C9A84C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.trackFill,
            { width: `${Math.min(Math.max(percentage, 5), 100)}%` },
          ]}
        />
      </View>

      {/* 5-Step Segmented Markers */}
      <View style={styles.stepsRow}>
        {stages.map((stage, idx) => {
          const isCompletedOrCurrent = isVerified && idx <= activeIndex;

          return (
            <View key={stage.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepNode,
                  isCompletedOrCurrent ? styles.stepNodeCompleted : styles.stepNodeUpcoming,
                ]}
              >
                {isCompletedOrCurrent ? (
                  <CheckIcon size={14} color="#FFFFFF" strokeWidth={2.8} />
                ) : (
                  <Text style={styles.stepNumberUpcoming}>
                    {idx + 1}
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  isCompletedOrCurrent && styles.stepLabelActive,
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
          <View style={styles.activePhaseDot} />
          <Text style={styles.activeCalloutTitle}>
            {lang === 'tl' ? 'KASALUKUYANG YUGTO:' : 'ACTIVE PHASE:'} {!isVerified ? (lang === 'tl' ? '1. Beripikasyon (Nakabinbin)' : '1. Verification (Pending)') : currentStage.label}
          </Text>
        </View>
        <Text style={styles.activeCalloutDesc}>
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 18,
    marginBottom: 14,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(11, 29, 78, 0.08), 0 2px 6px rgba(11, 29, 78, 0.04)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    color: '#8A9BB8',
    fontWeight: '500',
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: '#E6F6EF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D8A5A',
  },
  trackBackground: {
    height: 7,
    backgroundColor: '#DCE6F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNodeCompleted: {
    backgroundColor: '#C8102E',
    shadowColor: '#C8102E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(200, 16, 46, 0.35)' } : {}),
  },
  stepNodeUpcoming: {
    backgroundColor: '#DCE6F5',
  },
  stepNumberUpcoming: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6882A9',
  },
  stepLabel: {
    fontSize: 11,
    color: '#8A9BB8',
    fontWeight: '500',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#3D5070',
    fontWeight: '700',
  },
  activeCallout: {
    backgroundColor: '#FEF9EC',
    borderWidth: 1.5,
    borderColor: '#F0DFB0',
    borderRadius: 14,
    padding: 14,
  },
  activeCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  activePhaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B8932A',
    marginRight: 8,
  },
  activeCalloutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A17A16',
    letterSpacing: 0.3,
  },
  activeCalloutDesc: {
    fontSize: 11.5,
    color: '#997A20',
    lineHeight: 16,
    paddingLeft: 16,
  },
});
