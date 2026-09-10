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
  { key: 'claimed', label: '5. Claimed', shortLabel: 'Claimed', desc: 'Relief pack successfully claimed via QR scan at venue' },
];

const STAGES_TL = [
  { key: 'verification', label: '1. Beripikasyon', shortLabel: 'Beripikasyon', desc: 'Pagsusuri ng dokumento ng Barangay Admin sa Queue' },
  { key: 'assessed', label: '2. Na-Assessed', shortLabel: 'Na-Assessed', desc: 'Nasuri ang priority index at antas ng tulong' },
  { key: 'allocated', label: '3. Naka-Aloka', shortLabel: 'Naka-Aloka', desc: 'Inihanda ang tamang dami ng relief packs' },
  { key: 'ready', label: '4. Handa na', shortLabel: 'Handa na', desc: 'Pwedeng i-claim sa covered court gamit ang QR' },
  { key: 'claimed', label: '5. Na-Claim', shortLabel: 'Na-Claim', desc: 'Matagumpay na natanggap ang ayuda gamit ang QR pass' },
];

export default function RecoveryPhaseStepper({
  currentStatus,
  isVerified = true,
  hasActiveEvent = false,
  isClaimed = false,
  activeEvent = null,
  percentage: customPercentage,
  lang = 'en',
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const stages = lang === 'tl' ? STAGES_TL : STAGES_EN;

  let activeIndex = 0;
  let completedCount = 0;
  let calculatedPercent = 0;

  const statusLower = (currentStatus || 'waiting').toLowerCase();
  const isClaimCompleted = isClaimed || statusLower.includes('claim') || statusLower.includes('recover') || statusLower.includes('received') || statusLower.includes('ongoing');

  if (!isVerified) {
    // Stage 1 pending verification in queue
    activeIndex = 0;
    completedCount = 0;
    calculatedPercent = 0;
  } else if (isClaimCompleted) {
    // Stage 5 completed (All 5 stages completed)
    activeIndex = 4;
    completedCount = 5;
    calculatedPercent = 100;
  } else if (hasActiveEvent) {
    // Active distribution event open in resident's barangay!
    // Stages 1, 2, 3 completed; Stage 4 Ready is active!
    activeIndex = 3;
    completedCount = 3;
    calculatedPercent = 80;
  } else {
    // Verified, Assessed, and Allocated, but awaiting LGU distribution event
    // Stages 1, 2, 3 completed; Waiting for event to enter Stage 4
    activeIndex = 2;
    completedCount = 3;
    calculatedPercent = 60;
  }

  const percentage = customPercentage !== undefined ? customPercentage : calculatedPercent;
  const currentStage = stages[activeIndex] || stages[0];

  // Dynamic Callout Copy & Styling based on Phase
  let calloutTitle = '';
  let calloutDesc = '';
  let calloutTheme = 'standby'; // 'pending' | 'standby' | 'ready' | 'claimed'

  if (!isVerified) {
    calloutTheme = 'pending';
    calloutTitle = lang === 'tl' ? '1. Beripikasyon (Nakabinbin sa Queue)' : '1. Verification (Pending Review)';
    calloutDesc = lang === 'tl'
      ? 'Nasa Verification Queue pa ang inyong rehistrasyon sa Barangay Admin. Awtomatikong uusad ang progreso kapag naaprubahan na ng Barangay Official.'
      : 'Your registration is currently in the Barangay Verification Queue. Progress will advance once approved by the Barangay Administrator.';
  } else if (isClaimCompleted) {
    calloutTheme = 'claimed';
    calloutTitle = lang === 'tl' ? '5. Na-Claim (Kumpleto)' : '5. Claimed (Distribution Complete)';
    calloutDesc = lang === 'tl'
      ? 'Matagumpay na natanggap ang ayuda gamit ang QR pass sa relief distribution center. Naitala na sa database ang inyong relief claim.'
      : 'Relief pack successfully claimed via QR scan. Your relief distribution has been securely recorded in the official disaster registry.';
  } else if (hasActiveEvent) {
    calloutTheme = 'ready';
    calloutTitle = lang === 'tl' ? '4. Handa na (Bukas ang Claiming)' : '4. Ready (Distribution Open)';
    calloutDesc = activeEvent
      ? (lang === 'tl'
          ? `Bukas ang pamamahagi ng ${activeEvent.itemType || 'Relief Pack'} sa ${activeEvent.location || 'Covered Court'}. Ipakita ang inyong opisyal na QR Pass sa field staff sa venue upang matanggap ang ayuda.`
          : `Active distribution for ${activeEvent.itemType || 'Relief Pack'} is now open at ${activeEvent.location || 'Covered Court'}. Present your official QR Pass to field staff at the venue to claim.`)
      : (lang === 'tl'
          ? 'May bukas na relief distribution sa inyong barangay. Handa na at aktibo ang inyong scannable QR Pass para ma-claim sa venue.'
          : 'Active relief distribution is open in your barangay. Your QR Pass is ready and scannable for claiming at the venue.');
  } else {
    calloutTheme = 'standby';
    calloutTitle = lang === 'tl' ? '3. Naka-Aloka (Naka-Standby ang QR Pass)' : '3. Allocated (Pass on Standby)';
    calloutDesc = lang === 'tl'
      ? 'Na-verify na ang inyong pamilya, nakalkula na ang Priority Score, at handa na ang relief allocation quota. Naka-standby ang inyong QR Pass at magiging aktibo sa oras na buksan ng LGU ang distribution event sa inyong barangay.'
      : 'Household verified, vulnerability priority index assessed, and relief pack quota allocated. Your QR Pass is on standby and will activate once an active distribution event is opened by the LGU in your barangay.';
  }

  return (
    <View style={styles.container}>
      {/* Header Metric Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.stepperTitle}</Text>
          <Text style={styles.subTitle}>{t.stepperKicker}</Text>
        </View>

        <View style={[
          styles.percentBadge,
          calloutTheme === 'ready' && { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
          calloutTheme === 'claimed' && { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' },
        ]}>
          <Text style={[
            styles.percentText,
            calloutTheme === 'ready' && { color: '#047857' },
            calloutTheme === 'claimed' && { color: '#0369A1' },
          ]}>
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
            { width: `${Math.min(Math.max(percentage, percentage > 0 ? 5 : 0), 100)}%` },
          ]}
        />
      </View>

      {/* 5-Step Segmented Markers */}
      <View style={styles.stepsRow}>
        {stages.map((stage, idx) => {
          const isCompleted = idx < completedCount;
          const isCurrent = idx === activeIndex && completedCount < 5;

          return (
            <View key={stage.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepNode,
                  isCompleted
                    ? styles.stepNodeCompleted
                    : isCurrent
                    ? styles.stepNodeCurrent
                    : styles.stepNodeUpcoming,
                ]}
              >
                {isCompleted ? (
                  <CheckIcon size={14} color="#FFFFFF" strokeWidth={2.8} />
                ) : (
                  <Text
                    style={
                      isCurrent
                        ? styles.stepNumberCurrent
                        : styles.stepNumberUpcoming
                    }
                  >
                    {idx + 1}
                  </Text>
                )}
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
      <View style={[
        styles.activeCallout,
        calloutTheme === 'ready' && styles.activeCalloutReady,
        calloutTheme === 'claimed' && styles.activeCalloutClaimed,
      ]}>
        <View style={styles.activeCalloutHeader}>
          <View style={[
            styles.activePhaseDot,
            calloutTheme === 'ready' && { backgroundColor: '#10B981' },
            calloutTheme === 'claimed' && { backgroundColor: '#0284C7' },
          ]} />
          <Text style={[
            styles.activeCalloutTitle,
            calloutTheme === 'ready' && { color: '#065F46' },
            calloutTheme === 'claimed' && { color: '#0369A1' },
          ]}>
            {lang === 'tl' ? 'KASALUKUYANG YUGTO:' : 'ACTIVE PHASE:'}{' '}
            {calloutTitle}
          </Text>
        </View>
        <Text style={[
          styles.activeCalloutDesc,
          calloutTheme === 'ready' && { color: '#047857' },
          calloutTheme === 'claimed' && { color: '#075985' },
        ]}>
          {calloutDesc}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 12,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 18px rgba(11, 29, 78, 0.06), 0 2px 4px rgba(11, 29, 78, 0.03)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: -0.2,
  },
  subTitle: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
    marginTop: 1,
  },
  percentBadge: {
    backgroundColor: '#E6F6EF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D8A5A',
  },
  trackBackground: {
    height: 6,
    backgroundColor: '#DCE6F5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNodeCompleted: {
    backgroundColor: '#C8102E',
    shadowColor: '#C8102E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 3px 8px rgba(200, 16, 46, 0.3)' } : {}),
  },
  stepNodeCurrent: {
    backgroundColor: '#0B1D4E',
    borderWidth: 2,
    borderColor: '#C9A84C',
    shadowColor: '#0B1D4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 3px 8px rgba(11, 29, 78, 0.3)' } : {}),
  },
  stepNumberCurrent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepNodeUpcoming: {
    backgroundColor: '#DCE6F5',
  },
  stepNumberUpcoming: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6882A9',
  },
  stepLabel: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#3D5070',
    fontWeight: '700',
  },
  activeCallout: {
    backgroundColor: '#FEF9EC',
    borderWidth: 1,
    borderColor: '#F0DFB0',
    borderRadius: 11,
    padding: 9,
  },
  activeCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  activePhaseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#B8932A',
    marginRight: 6,
  },
  activeCalloutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A17A16',
    letterSpacing: 0.2,
  },
  activeCalloutDesc: {
    fontSize: 10.5,
    color: '#997A20',
    lineHeight: 14.5,
    paddingLeft: 13,
  },
  activeCalloutReady: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  activeCalloutClaimed: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
});
