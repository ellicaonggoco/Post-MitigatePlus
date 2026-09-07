import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeIcon, ShieldCheckIcon, ArrowRightIcon } from '../components/AppIcons';
import { RADIUS, FONT_WEIGHT, SPACING, SHADOWS, TOUCH_TARGET, RESPONSIVE, wp, hp } from '../theme';

export default function AuthChoiceScreen({ onSelectRole }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B1D4E', '#163B8C', '#234AAA']}
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
              <View style={[styles.iconCircle, { backgroundColor: '#FEF0F2', borderColor: '#F5E0E3' }]}>
                <HomeIcon size={22} color="#C8102E" />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.roleTitle}>Portal ng Residente</Text>
                <Text style={styles.roleSub}>
                  Tingnan ang QR Pass, ulat ng pinsala, at mga anunsyo ng barangay.
                </Text>
              </View>
              <ArrowRightIcon size={16} color="#C8102E" />
            </TouchableOpacity>

            {/* Option 2: Field Staff Portal */}
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => onSelectRole('staff')}
              activeOpacity={0.85}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FBF5E4', borderColor: '#F0DFA0' }]}>
                <ShieldCheckIcon size={22} color="#B8932A" />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.roleTitle}>Field Staff Portal</Text>
                <Text style={styles.roleSub}>
                  QR Scanner, relief distribution verification, at incident reports.
                </Text>
              </View>
              <ArrowRightIcon size={16} color="#B8932A" />
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
  container: { flex: 1, backgroundColor: '#0B1D4E' },
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
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2.5,
    borderColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    }),
  },
  logo: { width: 80, height: 80 },
  title: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.black,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#C9A84C',
    letterSpacing: 1.5,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 28px rgba(11, 29, 78, 0.16), 0 2px 8px rgba(11, 29, 78, 0.06)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 5,
    }),
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTextGroup: { flex: 1 },
  roleTitle: {
    fontSize: 15.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#0B1525',
    letterSpacing: -0.2,
  },
  roleSub: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 3,
    lineHeight: 16,
  },
  footerNote: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
});
