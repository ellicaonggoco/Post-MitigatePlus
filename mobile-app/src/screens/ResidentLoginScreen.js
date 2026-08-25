import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { loginUser } from '../services/api';
import NeumorphicInput from '../components/NeumorphicInput';
import { ShieldCheckIcon, UsersIcon, ArrowRightIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { MotionPressable } from '../components/motion';

export default function ResidentLoginScreen({ onLoginSuccess, onNavigateRegister, onNavigateForgot, lang = 'en', onSelectLang }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleEmailOrPhoneChange = (txt) => {
    setEmailOrPhone(txt);
    const cleaned = txt.trim();
    if (!cleaned) {
      setErrors(prev => ({ ...prev, emailOrPhone: '' }));
      return;
    }

    const isDigitStart = /^(\+?63|0)?\d*$/.test(cleaned);
    if (isDigitStart && !cleaned.includes('@')) {
      const pureDigits = cleaned.replace(/[\s-+]/g, '');
      if (pureDigits.startsWith('63')) {
        if (pureDigits.length !== 12) {
          setErrors(prev => ({
            ...prev,
            emailOrPhone: lang === 'tl'
              ? 'Kailangang 11 digits ang mobile number (hal. 09XXXXXXXXX)'
              : 'Mobile number must be 11 digits (e.g. 09XXXXXXXXX)',
          }));
        } else {
          setErrors(prev => ({ ...prev, emailOrPhone: '' }));
        }
      } else if (pureDigits.startsWith('09')) {
        if (pureDigits.length !== 11) {
          setErrors(prev => ({
            ...prev,
            emailOrPhone: lang === 'tl'
              ? 'Kailangang 11 digits ang mobile number (hal. 09XXXXXXXXX)'
              : 'Mobile number must be 11 digits (e.g. 09XXXXXXXXX)',
          }));
        } else {
          setErrors(prev => ({ ...prev, emailOrPhone: '' }));
        }
      } else {
        setErrors(prev => ({
          ...prev,
          emailOrPhone: lang === 'tl'
            ? 'Dapat magsimula sa 09 ang mobile number (11 digits)'
            : 'Mobile number must start with 09 (11 digits)',
        }));
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleaned)) {
        setErrors(prev => ({
          ...prev,
          emailOrPhone: lang === 'tl'
            ? 'Maglagay ng wastong email (hal. name@gmail.com) o 11-digit mobile (09XXXXXXXXX)'
            : 'Enter a valid email (e.g. name@gmail.com) or 11-digit mobile (09XXXXXXXXX)',
        }));
      } else {
        setErrors(prev => ({ ...prev, emailOrPhone: '' }));
      }
    }
  };

  const handlePasswordChange = (txt) => {
    setPassword(txt);
    if (!txt) {
      setErrors(prev => ({ ...prev, password: '' }));
    } else if (txt.length < 6) {
      setErrors(prev => ({
        ...prev,
        password: lang === 'tl'
          ? 'Kailangang may minimum 6 na characters ang password.'
          : 'Password must be at least 6 characters.',
      }));
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!emailOrPhone.trim()) {
      errs.emailOrPhone = lang === 'tl'
        ? 'Pakilagay ang inyong rehistradong mobile number.'
        : 'Please enter your registered phone number.';
    } else {
      const cleaned = emailOrPhone.trim().replace(/[\s-]/g, '');
      if (!/^09\d{9}$/.test(cleaned)) {
        errs.emailOrPhone = lang === 'tl'
          ? 'Kailangang 11 digits ang mobile number na nagsisimula sa 09 (hal. 09XXXXXXXXX)'
          : 'Phone number must be 11 digits starting with 09 (e.g. 09XXXXXXXXX)';
      }
    }

    if (!password) {
      errs.password = lang === 'tl'
        ? 'Pakilagay ang inyong password.'
        : 'Please enter your password.';
    } else if (password.length < 6) {
      errs.password = lang === 'tl'
        ? 'Kailangang may minimum 6 na characters ang password.'
        : 'Password must be at least 6 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };


  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await loginUser({
        emailOrPhone: emailOrPhone.trim(),
        password: password,
      });

      const session = res?.data || res;
      if (session?.token) {
        onLoginSuccess(session);
      } else if (res?.message) {
        setErrors(prev => ({
          ...prev,
          emailOrPhone: res.message,
        }));
      }
    } catch (err) {
      setLoading(false);
      setErrors(prev => ({
        ...prev,
        emailOrPhone: err?.message || (lang === 'tl' ? 'Maling credentials o hindi makakonekta sa server.' : 'Invalid credentials or unable to connect to server.'),
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header with Large Trademark Logo */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../assets/logo_primary.png')}
            style={styles.brandLogoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandCityTitle}>
            {lang === 'tl' ? 'Pamahalaang Lungsod ng Maynila' : 'City Government of Manila'}
          </Text>
          <Text style={styles.brandSub}>
            {lang === 'tl' ? 'Operasyon sa Pagbangon at Ayuda ng Residente' : 'Disaster Recovery & Citizen Relief Operations'}
          </Text>
        </View>

        {/* Clean, Crisp Civic Card */}
        <View style={styles.loginCard}>
          <View style={styles.cardHeaderGroup}>
            <Text style={styles.cardTitle}>
              {lang === 'tl' ? 'Mag-Log In sa Inyong Account' : 'Log In to Your Account'}
            </Text>
            <Text style={styles.cardSub}>
              {lang === 'tl'
                ? 'Gamitin ang inyong rehistradong mobile number at password upang ma-access ang inyong account.'
                : 'Use your registered mobile number and password to access your account.'}
            </Text>
          </View>

          {/* Mobile Number Input */}
          <NeumorphicInput
            label={lang === 'tl' ? 'Phone Number' : 'Phone Number'}
            value={emailOrPhone}
            onChangeText={handleEmailOrPhoneChange}
            placeholder="09XXXXXXXXX"
            errorText={errors.emailOrPhone}
            required
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          {/* Password Input without cluttered helper text */}
          <NeumorphicInput
            label={lang === 'tl' ? 'Password' : 'Password'}
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="••••••••"
            errorText={errors.password}
            required
            secureTextEntry
          />

          <MotionPressable onPress={onNavigateForgot} style={styles.forgotPasswordUnderBtn} activeOpacity={0.75}>
            <Text style={styles.forgotText}>
              {lang === 'tl' ? 'Nakalimutan ang Password?' : 'Forgot Password?'}
            </Text>
          </MotionPressable>

          <MotionPressable
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {lang === 'tl' ? 'Mag-Log In sa Account' : 'Sign In to Account'}
              </Text>
            )}
          </MotionPressable>

        </View>

        {/* Register Household Secondary Button Card */}
        <View style={styles.registerCard}>
          <Text style={styles.registerCardTitle}>
            {lang === 'tl' ? 'Wala ka pang rehistradong account?' : 'No registered household account yet?'}
          </Text>
          <TouchableOpacity
            style={styles.registerActionBtn}
            onPress={onNavigateRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.registerActionBtnText}>
              {lang === 'tl' ? 'Mag-rehistro ng Bagong Pamilya' : 'Register New Household'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          {lang === 'tl'
            ? 'Lungsod ng Maynila • Kagawaran ng Katatagan at MDRRMO Operations'
            : 'City of Manila • Department of Resilience & MDRRMO Operations'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F7', // Pearl White
  },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 8,
    paddingBottom: hp(6),
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: hp(2),
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
  },
  brandLogoImg: {
    width: Math.min(280, wp(72)),
    height: 60,
    marginBottom: 8,
  },
  brandCityTitle: {
    fontSize: 14.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    letterSpacing: -0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  brandSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Clean Crisp Card Structure
  loginCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: RESPONSIVE.borderRadius + 2,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: RESPONSIVE.cardPadding,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  cardHeaderGroup: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  forgotPasswordUnderBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 12,
    color: '#1557B0',
    fontWeight: '700',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#1557B0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...SHADOWS.sm,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  demoSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  demoLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#E8F2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1557B0',
  },
  registerFooterBtn: {
    paddingVertical: 10,
  },
  registerFooterText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  registerCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: RESPONSIVE.borderRadius,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: RESPONSIVE.cardPadding - 2,
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  registerCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    textAlign: 'center',
  },
  registerActionBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1557B0',
  },
  footerNote: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
});
