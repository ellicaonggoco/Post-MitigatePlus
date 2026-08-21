import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeIcon, ShieldCheckIcon, ArrowRightIcon } from '../components/AppIcons';
import { RADIUS, FONT_WEIGHT, SPACING, TOUCH_TARGET, RESPONSIVE, wp, hp } from '../theme';

export default function AuthChoiceScreen({ onSelectRole }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#071D3A', '#0D3C75', '#154A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Official Trademark Emblem */}
            <View style={styles.logoFrame}>
              <Image
                source={require('../../assets/logo_secondary.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Heading */}
            <Text style={styles.title}>MitigatePlus</Text>
            <Text style={styles.tagline}>PAMAHALAANG LUNGSOD NG MAYNILA</Text>
            <Text style={styles.subtitle}>
              Pumili ng iyong kategorya upang mag-login sa disaster response system:
            </Text>

            {/* Option 1: Resident Portal */}
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => onSelectRole('resident')}
              activeOpacity={0.85}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EBF3FC' }]}>
                <HomeIcon size={22} color="#002BB8" />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.roleTitle}>Portal ng Residente</Text>
                <Text style={styles.roleSub}>
                  Tingnan ang QR Pass, ulat ng pinsala, at mga anunsyo ng barangay.
                </Text>
              </View>
              <ArrowRightIcon size={16} color="#002BB8" />
            </TouchableOpacity>

            {/* Option 2: Field Staff Portal */}
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => onSelectRole('staff')}
              activeOpacity={0.85}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <ShieldCheckIcon size={22} color="#D97706" />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.roleTitle}>Field Staff Portal</Text>
                <Text style={styles.roleSub}>
                  QR Scanner, relief distribution verification, at incident reports.
                </Text>
              </View>
              <ArrowRightIcon size={16} color="#D97706" />
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            OFFICIAL EMERGENCY SYSTEM • CITY OF MANILA
          </Text>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#071D3A' },
  gradient: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 16,
    paddingBottom: hp(4),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    alignItems: 'center',
  },
  logoFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: { width: 75, height: 75 },
  title: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.black,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: '#F59E0B',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 19,
  },
  roleCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTextGroup: { flex: 1 },
  roleTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0F172A',
  },
  roleSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
    lineHeight: 16,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0D3C75',
    marginLeft: 8,
  },
  footerNote: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    marginBottom: 10,
  },
});
