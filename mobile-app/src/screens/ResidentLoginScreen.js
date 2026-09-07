import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { loginUser } from '../services/api';
import NeumorphicInput from '../components/NeumorphicInput';
import { ShieldCheckIcon, UsersIcon, ArrowRightIcon, FingerprintIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { MotionPressable } from '../components/motion';

export default function ResidentLoginScreen({ onLoginSuccess, onNavigateRegister, onNavigateForgot, lang = 'en', onSelectLang }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Check biometric availability and attempt auto-login on mount
  useEffect(() => {
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const savedSession = await AsyncStorage.getItem('mitigateplus_session');
        if (compatible && enrolled && savedSession) {
          setBiometricAvailable(true);
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: lang === 'tl' ? 'I-verify ang inyong pagkakakilanlan' : 'Verify your identity to continue',
            cancelLabel: lang === 'tl' ? 'Gumamit ng Password' : 'Use Password',
            fallbackLabel: lang === 'tl' ? 'Gumamit ng Password' : 'Use Password',
            disableDeviceFallback: false,
          });
          if (result.success && savedSession) {
            const session = JSON.parse(savedSession);
            if (session?.token) onLoginSuccess(session);
          }
        }
      } catch {
        // Biometric unavailable - fall through to password login
      }
    })();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleEmailOrPhoneChange = (txt) => {
    setEmailOrPhone(txt);
    if (errors.emailOrPhone) {
      setErrors(prev => ({ ...prev, emailOrPhone: '' }));
    }
  };

  const handlePasswordChange = (txt) => {
    setPassword(txt);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleLogin = async () => {
    const errs = {};
    if (!emailOrPhone.trim()) {
      errs.emailOrPhone = lang === 'tl' ? 'Ilagay ang Phone Number o Email' : 'Please enter Phone Number or Email';
    }
    if (!password) {
      errs.password = lang === 'tl' ? 'Ilagay ang Password' : 'Please enter Password';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await loginUser({
        emailOrPhone: emailOrPhone.trim(),
        password: password,
      });

      const session = res?.data || res;
      if (session?.token) {
        await AsyncStorage.setItem('mitigateplus_session', JSON.stringify(session));
        onLoginSuccess(session);
      } else {
        const msg = (res?.message || '').toLowerCase();
        if (msg.includes('password')) {
          setErrors({ password: lang === 'tl' ? 'Maling Password' : 'Wrong Password' });
        } else if (msg.includes('not found') || msg.includes('user') || msg.includes('account')) {
          setErrors({ emailOrPhone: lang === 'tl' ? 'Hindi nahanap ang Account' : 'Account Not Found' });
        } else {
          setErrors({
            emailOrPhone: lang === 'tl' ? 'Maling Phone o Email' : 'Wrong Phone or Email',
            password: lang === 'tl' ? 'Maling Password' : 'Wrong Password',
          });
        }
      }
    } catch (err) {
      const errMsg = (err?.message || '').toLowerCase();
      if (errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('connect')) {
        setErrors({
          general: lang === 'tl'
            ? 'Hindi makakonekta sa backend server sa port 5000. Pakisuri kung tumatakbo ang backend.'
            : 'Cannot connect to backend server on port 5000. Please ensure the backend is running.',
        });
      } else if (errMsg.includes('password')) {
        setErrors({ password: lang === 'tl' ? 'Maling Password' : 'Wrong Password' });
      } else if (errMsg.includes('not found') || errMsg.includes('user') || errMsg.includes('account')) {
        setErrors({ emailOrPhone: lang === 'tl' ? 'Hindi nahanap ang Account' : 'Account Not Found' });
      } else {
        setErrors({
          emailOrPhone: lang === 'tl' ? 'Maling Phone o Email' : 'Wrong Phone or Email',
          password: lang === 'tl' ? 'Maling Password' : 'Wrong Password',
        });
      }
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
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 90 + keyboardHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Brand Header */}
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

          {errors.general ? (
            <View style={{ backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 }}>
                {errors.general}
              </Text>
            </View>
          ) : null}

          {/* Mobile Number / Email Input */}
          <NeumorphicInput
            label={lang === 'tl' ? 'Phone Number o Email' : 'Phone Number or Email'}
            value={emailOrPhone}
            onChangeText={handleEmailOrPhoneChange}
            placeholder={lang === 'tl' ? 'Ilagay ang Phone Number o Email' : 'Enter Phone Number or Email'}
            errorText={errors.emailOrPhone}
            required
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Password Input */}
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

          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricBtn}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: lang === 'tl' ? 'I-verify ang inyong pagkakakilanlan' : 'Use biometrics to sign in',
                    cancelLabel: lang === 'tl' ? 'Kanselahin' : 'Cancel',
                    disableDeviceFallback: false,
                  });
                  if (result.success) {
                    const savedSession = await AsyncStorage.getItem('mitigateplus_session');
                    if (savedSession) {
                      const session = JSON.parse(savedSession);
                      if (session?.token) onLoginSuccess(session);
                    }
                  }
                } catch { /* silently fail */ }
              }}
            >
              <FingerprintIcon size={18} color="#C8102E" />
              <Text style={styles.biometricBtnText}>
                {lang === 'tl' ? 'Mag-login gamit ang Fingerprint / Face ID' : 'Sign in with Fingerprint / Face ID'}
              </Text>
            </TouchableOpacity>
          )}

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
    backgroundColor: '#F3F6FC',
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
    color: '#0B1525',
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
  loginCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderTopColor: '#C9A84C',
    borderTopWidth: 3.5,
    padding: RESPONSIVE.cardPadding,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 28px rgba(11, 29, 78, 0.08), 0 2px 8px rgba(11, 29, 78, 0.04)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    }),
  },
  cardHeaderGroup: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.black,
    color: '#0B1525',
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
    marginTop: -4,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 12,
    color: '#C8102E',
    fontWeight: '700',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#C8102E',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 14px rgba(200, 16, 46, 0.35)',
    } : {
      shadowColor: '#C8102E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  registerCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderTopColor: '#C9A84C',
    borderTopWidth: 2.5,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 20px rgba(11, 29, 78, 0.06)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    }),
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
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C8102E',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(200, 16, 46, 0.12)',
    } : {
      shadowColor: '#C8102E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.10,
      shadowRadius: 4,
      elevation: 1,
    }),
  },
  registerActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#C8102E',
  },
  footerNote: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  biometricBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FEF0F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(200, 16, 46, 0.08)',
    } : {
      shadowColor: '#C8102E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    }),
  },
  biometricBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C8102E',
  },
});