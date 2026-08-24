import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Platform, KeyboardAvoidingView, TextInput } from 'react-native';
import NeumorphicInput from '../components/NeumorphicInput';
import { ShieldCheckIcon, CheckIcon, ArrowRightIcon, ArrowLeftIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, NEUMORPHIC, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { MotionPressable } from '../components/motion';
import { API_BASE_URL } from '../config';

export default function ForgotPasswordScreen({ onBack, onResetComplete, lang = 'en' }) {
  const [stage, setStage] = useState(1); // 1: Find Account, 2: OTP Verification, 3: Reset Password
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [fallbackOtp, setFallbackOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const otpRefs = useRef([]);

  const handleSendOtp = async () => {
    if (!identifier.trim()) {
      setErrors({
        identifier: lang === 'tl'
          ? 'Pakilagay ang inyong 11-digit mobile number o email.'
          : 'Please enter your 11-digit mobile number or email.',
      });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.otpCode || data.debugOtp) setFallbackOtp(data.otpCode || data.debugOtp);
        setStage(2);
      } else {
        setErrors({ identifier: data.message || (lang === 'tl' ? 'Hindi maipadala ang OTP. Pakisuri ang numero o email.' : 'Failed to send OTP. Please check phone number or email.') });
      }
    } catch (err) {
      setErrors({ identifier: lang === 'tl' ? 'Hindi makakonekta sa server. Pakisuri ang internet.' : 'Network connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otp: otpCode.join('') }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setStage(3);
      else setErrors({ otp: data.message || (lang === 'tl' ? 'Maling OTP code o paso na. Pakisubukang muli.' : 'Invalid or expired OTP code.') });
    } catch (err) {
      setErrors({ otp: lang === 'tl' ? 'Hindi makakonekta sa server.' : 'Network connection error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const errs = {};
    if (!newPassword || newPassword.length < 6) {
      errs.newPassword = lang === 'tl'
        ? 'Kailangang may minimum 6 na characters ang password.'
        : 'Password must be at least 6 characters.';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = lang === 'tl'
        ? 'Hindi magkatugma ang mga password. Pakisuri ulit.'
        : 'Passwords do not match. Please verify.';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otp: otpCode.join(''), newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) onResetComplete();
      else setErrors({ newPassword: data.message || (lang === 'tl' ? 'Hindi napalitan ang password. Pakisubukang muli.' : 'Failed to reset password. Please try again.') });
    } catch (err) {
      setErrors({ newPassword: lang === 'tl' ? 'Hindi makakonekta sa server.' : 'Network connection error.' });
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <ArrowLeftIcon size={16} color="#1557B0" />
          <Text style={styles.backBtnText}>
            {lang === 'tl' ? 'Bumalik sa Login' : 'Back to Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.brandHeader}>
          <View style={styles.shieldLogoBox}>
            <Image
              source={require('../../assets/logo_secondary.png')}
              style={styles.logoSecondaryImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>MitigatePlus</Text>
          <Text style={styles.brandSub}>
            {lang === 'tl' ? 'Lungsod ng Maynila • Kagawaran ng Katatagan' : 'City of Manila • Department of Resilience'}
          </Text>
        </View>

        {stage === 1 ? (
          /* STAGE 1: FIND ACCOUNT */
          <View style={styles.cardPod}>
            <Text style={styles.cardTitle}>
              {lang === 'tl' ? 'Pagbawi ng Account' : 'Account Recovery'}
            </Text>
            <Text style={styles.cardSub}>
              {lang === 'tl'
                ? 'Ilagay ang inyong rehistradong Email Address o Mobile Number upang makatanggap ng 6-digit verification code.'
                : 'Enter your registered Email Address or Mobile Number to receive a 6-digit verification code.'}
            </Text>

            <NeumorphicInput
              label={lang === 'tl' ? 'Rehistradong Email o Mobile Number' : 'Registered Email or Mobile Number'}
              value={identifier}
              onChangeText={(txt) => {
                setIdentifier(txt);
                if (errors.identifier) setErrors({ ...errors, identifier: '' });
              }}
              placeholder="youremail@gmail.com"
              errorText={errors.identifier}
              required
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <MotionPressable
              style={[styles.actionBtn, loading && { opacity: 0.7 }]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {lang === 'tl' ? 'Ipadala ang Verification Code' : 'Send Verification Code'}
                </Text>
              )}
            </MotionPressable>
          </View>
        ) : stage === 2 ? (
          /* STAGE 2: OTP VERIFICATION */
          <View style={styles.cardPod}>
            <Text style={styles.cardTitle}>
              {lang === 'tl' ? 'Pag-beripika ng OTP' : 'OTP Verification'}
            </Text>
            <Text style={styles.cardSub}>
              {lang === 'tl' ? (
                <>Ilagay ang 6-digit code na ipinadala sa <Text style={{ fontWeight: 'bold', color: '#1557B0' }}>{identifier}</Text>.</>
              ) : (
                <>Enter the 6-digit code sent to <Text style={{ fontWeight: 'bold', color: '#1557B0' }}>{identifier}</Text>.</>
              )}
            </Text>




            <View style={styles.otpGrid}>
              {otpCode.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (otpRefs.current[i] = r)}
                  style={[styles.otpBoxInput, digit ? styles.otpBoxInputFilled : null]}
                  value={digit}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    const newDigits = [...otpCode];
                    newDigits[i] = clean.slice(-1);
                    setOtpCode(newDigits);
                    if (clean && i < 5) otpRefs.current[i + 1]?.focus();
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !digit && i > 0) {
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>

            {errors.otp && (
              <Text style={{ color: '#DC2626', fontSize: 12, textAlign: 'center', marginBottom: 10, fontWeight: '600' }}>
                ⚠️ {errors.otp}
              </Text>
            )}

            <MotionPressable style={styles.actionBtn} onPress={handleVerifyOtp} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {lang === 'tl' ? 'I-beripika ang Code' : 'Verify Code'}
                </Text>
              )}
            </MotionPressable>
          </View>
        ) : (
          /* STAGE 3: RESET PASSWORD */
          <View style={styles.cardPod}>
            <Text style={styles.cardTitle}>
              {lang === 'tl' ? 'Magtakda ng Bagong Password' : 'Set New Password'}
            </Text>
            <Text style={styles.cardSub}>
              {lang === 'tl' ? 'Gumawa ng bagong ligtas na password para sa inyong account.' : 'Create a new secure password for your account.'}
            </Text>

            <NeumorphicInput
              label={lang === 'tl' ? 'Bagong Password' : 'New Password'}
              value={newPassword}
              onChangeText={(txt) => {
                setNewPassword(txt);
                if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
              }}
              placeholder="••••••••"
              errorText={errors.newPassword}
              required
              secureTextEntry
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Kumpirmahin ang Bagong Password' : 'Confirm New Password'}
              value={confirmPassword}
              onChangeText={(txt) => {
                setConfirmPassword(txt);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              placeholder="••••••••"
              errorText={errors.confirmPassword}
              required
              secureTextEntry
            />

            <MotionPressable style={styles.actionBtn} onPress={handleResetPassword} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {lang === 'tl' ? 'I-save ang Bagong Password' : 'Save New Password'}
                </Text>
              )}
            </MotionPressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F6' },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 6,
    paddingBottom: hp(8),
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1557B0',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
  },
  shieldLogoBox: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoSecondaryImg: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
  },
  brandSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardPod: {
    ...NEUMORPHIC.raisedHero,
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    borderRadius: RESPONSIVE.borderRadius + 4,
    padding: RESPONSIVE.cardPadding,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 16,
  },
  demoOtpBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  demoOtpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  demoOtpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  autoFillBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoFillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  demoOtpCodeText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#15803D',
    textAlign: 'center',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  otpBoxInput: {
    width: 44,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 18,
    fontWeight: '800',
    color: '#002BB8',
    textAlign: 'center',
  },
  otpBoxInputFilled: {
    borderColor: '#002BB8',
    backgroundColor: '#EFF6FF',
  },
  actionBtn: {
    ...NEUMORPHIC.activePill,
    backgroundColor: '#002BB8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
