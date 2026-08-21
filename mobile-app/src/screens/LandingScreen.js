import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { LockIcon, ScaleIcon, BarChartIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, NEUMORPHIC, RESPONSIVE, wp, hp } from '../theme';

export default function LandingScreen({ onGetStarted }) {
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showLearnMore, setShowLearnMore] = useState(false);

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 15;
      if (currentProgress >= 100) {
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => setShowSplash(false), 300);
      } else {
        setProgress(currentProgress);
      }
    }, 90);

    return () => clearInterval(interval);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashRoot}>
        <View style={styles.splashInner}>
          <View style={styles.sealWell}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.sealImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.splashKicker}>CITY OF MANILA • LGU SYSTEM</Text>
          <Text style={styles.splashBrand}>MitigatePlus</Text>
          <Text style={styles.splashTagline}>Post-Disaster Recovery & Assistance Management</Text>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>Initializing Secure Cloud Subsystems... {progress}%</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Civic Header */}
        <View style={styles.heroSection}>
          <View style={styles.logoWell}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.kickerPill}>
            <Text style={styles.kickerText}>OFFICIAL RECOVERY PLATFORM</Text>
          </View>

          <Text style={styles.heroTitle}>
            Fast, Equitable Relief for Every Manilenyo.
          </Text>

          <Text style={styles.heroDescription}>
            The City of Manila's digital disaster recovery platform. Real-time household verification, right-sized relief distribution, and automated recovery tracking.
          </Text>
        </View>

        {/* Feature Grid (Neumorphic Raised Cards) */}
        <View style={styles.featureGrid}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconWell}>
              <LockIcon size={16} color="#002BB8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>Encrypted QR Passes</Text>
              <Text style={styles.featureItemSub}>Instant beneficiary verification with anti-duplicate claim protection.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconWell}>
              <ScaleIcon size={16} color="#002BB8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>Right-Sized Allocation</Text>
              <Text style={styles.featureItemSub}>Relief computed accurately based on verified household headcount.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconWell}>
              <BarChartIcon size={16} color="#002BB8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>5-Stage Recovery Stepper</Text>
              <Text style={styles.featureItemSub}>Track damage assessments and relief progress transparently.</Text>
            </View>
          </View>
        </View>

        {/* Action Button Row */}
        <View style={styles.ctaGroup}>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={onGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryCtaText}>Pumasok / Mag-Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={() => setShowLearnMore(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryCtaText}>Tungkol sa Sistema (About)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerLegal}>
          LGU MANILA MDRRMO • BARANGAY 291 PILOT COHORT
        </Text>
      </ScrollView>

      {/* About Modal */}
      <Modal visible={showLearnMore} animationType="slide" transparent onRequestClose={() => setShowLearnMore(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tungkol sa MitigatePlus</Text>
            <Text style={styles.modalBody}>
              Ang MitigatePlus ay binuo upang mapabilis at maging makatarungan ang pamamahagi ng tulong at ayuda sa bawat pamilya sa Lungsod ng Maynila pagkatapos ng baha, bagyo, at sunog.
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLearnMore(false)}>
              <Text style={styles.closeBtnText}>Naiintindihan Ko</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
    backgroundColor: '#071D3A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  splashInner: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  sealWell: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  sealImg: {
    width: 66,
    height: 66,
  },
  splashKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 1,
    marginBottom: 4,
  },
  splashBrand: {
    fontSize: 26,
    fontWeight: FONT_WEIGHT.black,
    color: '#FFFFFF',
  },
  splashTagline: {
    fontSize: 12,
    color: '#93C5FD',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#002BB8',
  },
  progressLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  scrollContent: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 16,
    paddingBottom: hp(6),
    maxWidth: RESPONSIVE.maxCardWidth,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logoWell: {
    ...NEUMORPHIC.sunken,
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroLogo: {
    width: 38,
    height: 38,
  },
  kickerPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  kickerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#002BB8',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  featureGrid: {
    ...NEUMORPHIC.raised,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIconWell: {
    ...NEUMORPHIC.sunken,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  featureItemSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  ctaGroup: {
    gap: 10,
    marginBottom: 24,
  },
  primaryCta: {
    ...NEUMORPHIC.activePill,
    backgroundColor: '#002BB8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryCta: {
    ...NEUMORPHIC.button,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryCtaText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  footerLegal: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 29, 58, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#EEF2F6',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: '#071D3A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
