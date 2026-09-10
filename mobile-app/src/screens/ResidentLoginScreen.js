import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
      errs.emailOrPhone = lang === 'tl' ? 'Ilagay ang inyong Email Address' : 'Please enter your Email Address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone.trim()) && !/^09\d{9}$/.test(emailOrPhone.trim().replace(/[\s-+]/g, ''))) {
      errs.emailOrPhone = lang === 'tl' ? 'Pakilagay ang wastong email address' : 'Please enter a valid email address';
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
          setErrors({ emailOrPhone: lang === 'tl' ? 'Hindi nahanap ang Email Account' : 'Email Account Not Found' });
        } else {
          setErrors({
            emailOrPhone: lang === 'tl' ? 'Maling Email o Password' : 'Wrong Email or Password',
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
        setErrors({ emailOrPhone: lang === 'tl' ? 'Hindi nahanap ang Email Account' : 'Email Account Not Found' });
      } else {
        setErrors({
          emailOrPhone: lang === 'tl' ? 'Maling Email o Password' : 'Wrong Email or Password',
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
        contentContainerStyle={[
          styles.content,
          keyboardHeight > 0 && { justifyContent: 'flex-start', paddingBottom: keyboardHeight + 20 }
        ]}
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
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={lang === 'tl' ? 'Logo ng MitigatePlus Lungsod ng Maynila' : 'MitigatePlus City Government of Manila Logo'}
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
                ? 'Gamitin ang inyong rehistradong email address at password upang ma-access ang inyong account.'
                : 'Use your registered email address and password to access your account.'}
            </Text>
          </View>

          {errors.general ? (
            <View style={{ backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 }}>
                {errors.general}
              </Text>
            </View>
          ) : null}

          {/* Required Email Address Input */}
          <NeumorphicInput
            label={lang === 'tl' ? 'Email Address' : 'Email Address'}
            value={emailOrPhone}
            onChangeText={handleEmailOrPhoneChange}
            placeholder={lang === 'tl' ? 'Ilagay ang Email Address (hal. resident@gmail.com)' : 'Enter Email Address (e.g. resident@gmail.com)'}
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

          <MotionPressable
            onPress={onNavigateForgot}
            style={styles.forgotPasswordUnderBtn}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'Nakalimutan ang Password?' : 'Forgot Password?'}
            accessibilityHint={lang === 'tl' ? 'Pindutin upang i-recover ang password' : 'Tap to recover your password'}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.forgotText}>
              {lang === 'tl' ? 'Nakalimutan ang Password?' : 'Forgot Password?'}
            </Text>
          </MotionPressable>

          <MotionPressable
            style={[styles.submitBtn, loading && { opacity: 0.85 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={loading
              ? (lang === 'tl' ? 'Pumapasok sa System...' : 'Signing in...')
              : (lang === 'tl' ? 'Mag-Log In sa Account' : 'Sign In to Account')}
            accessibilityState={{ busy: loading, disabled: loading }}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {lang === 'tl' ? 'Pumapasok sa System...' : 'Signing in...'}
                </Text>
              </View>
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
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'Mag-rehistro ng Bagong Pamilya' : 'Register New Household'}
            accessibilityHint={lang === 'tl' ? 'Pindutin upang gumawa ng bagong account' : 'Tap to create a new household account'}
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: Math.max(RESPONSIVE.topSafe + 12, 28),
    paddingBottom: Math.max(RESPONSIVE.botSafe + 12, 28),
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
  },
  brandLogoImg: {
    width: Math.min(280, wp(72)),
    height: 62,
    marginBottom: 8,
  },
  brandCityTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#0B1525',
    letterSpacing: -0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  brandSub: {
    fontSize: 11.5,
    color: '#3D5070',
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
    borderBottomColor: '#F3F6FC',
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
    color: '#3D5070',
    marginTop: 3,
    lineHeight: 17,
  },
  forgotPasswordUnderBtn: {
    alignSelf: 'flex-end',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginTop: -4,
    marginBottom: 12,
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
    height: 52,
    minHeight: 52,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
    marginBottom: 18,
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
    color: '#3D5070',
    marginBottom: 10,
    textAlign: 'center',
  },
  registerActionBtn: {
    width: '100%',
    height: 52,
    minHeight: 52,
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
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '500',
    marginTop: 14,
    textAlign: 'center',
  },
});