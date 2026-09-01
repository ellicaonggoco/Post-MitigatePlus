import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
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
      errs.emailOrPhone = 'Wrong Phone Number';
    }
    if (!password) {
      errs.password = 'Wrong Password';
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
          setErrors({ password: 'Wrong Password' });
        } else if (msg.includes('not found') || msg.includes('user') || msg.includes('phone') || msg.includes('mobile')) {
          setErrors({ emailOrPhone: 'Wrong Phone Number' });
        } else {
          setErrors({
            emailOrPhone: 'Wrong Phone Number',
            password: 'Wrong Password',
          });
        }
      }
    } catch (err) {
      const errMsg = (err?.message || '').toLowerCase();
      if (errMsg.includes('password')) {
        setErrors({ password: 'Wrong Password' });
      } else if (errMsg.includes('not found') || errMsg.includes('user')) {
        setErrors({ emailOrPhone: 'Wrong Phone Number' });
      } else {
        setErrors({
          emailOrPhone: 'Wrong Phone Number',
          password: 'Wrong Password',
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

          {/* Mobile Number Input */}
          <NeumorphicInput
            label={lang === 'tl' ? 'Phone Number' : 'Phone Number'}
            value={emailOrPhone}
            onChangeText={handleEmailOrPhoneChange}
            placeholder="Enter Phone Number"
            errorText={errors.emailOrPhone}
            required
            keyboardType="phone-pad"
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
              <Text style={styles.biometricBtnText}>
                {lang === 'tl' ? '🔐 Mag-login gamit ang Fingerprint / Face ID' : '🔐 Sign in with Fingerprint / Face ID'}
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
    backgroundColor: '#F8F9F7',
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
  loginCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: RESPONSIVE.borderRadius + 2,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: RESPONSIVE.cardPadding,
    marginBottom: 16,
    ...SHADOWS.card,
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
    marginTop: -4,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 12,
    color: '#1557B0',
    fontWeight: '700',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#1557B0',
    borderRadius: RESPONSIVE.borderRadius,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
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
    borderRadius: RESPONSIVE.borderRadius,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.card,
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
    height: 44,
    borderRadius: RESPONSIVE.borderRadius,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
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
  biometricBtn: {
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: RESPONSIVE.borderRadius,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1557B0',
  },
});