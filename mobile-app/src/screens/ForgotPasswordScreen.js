import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Platform, KeyboardAvoidingView, TextInput, Keyboard, BackHandler } from 'react-native';
import NeumorphicInput from '../components/NeumorphicInput';
import { ShieldCheckIcon, CheckIcon, ArrowRightIcon, ArrowLeftIcon, AlertTriangleIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, NEUMORPHIC, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { MotionPressable } from '../components/motion';
import { API_BASE_URL } from '../config';

export default function ForgotPasswordScreen({ onBack, onResetComplete, lang = 'en' }) {
  const [stage, setStage] = useState(1); // 1: Find Account, 2: OTP Verification, 3: Reset Password, 4: Success
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [fallbackOtp, setFallbackOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const otpRefs = useRef([]);
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
        body: JSON.stringify({ identifier: identifier.trim(), purpose: 'recovery', isRecovery: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.otpCode || data.debugOtp) setFallbackOtp(data.otpCode || data.debugOtp);
        setResendCooldown(60);
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
    const enteredOtp = otpCode.join('').trim();
    if (enteredOtp.length !== 6) {
      setErrors({ otp: lang === 'tl' ? 'Pakilagay ang kumpletong 6-digit code.' : 'Please enter the complete 6-digit code.' });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otp: enteredOtp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.resetToken) setResetToken(data.resetToken);
        setStage(3);
      } else {
        setErrors({ otp: data.message || (lang === 'tl' ? 'Maling OTP code o paso na. Pakisubukang muli.' : 'Invalid or expired OTP code.') });
      }
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
        body: JSON.stringify({
          emailOrPhone: identifier.trim(),
          identifier: identifier.trim(),
          otpCode: otpCode.join(''),
          otp: otpCode.join(''),
          resetToken,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStage(4);
      } else {
        const msg = data.message || (lang === 'tl' ? 'Hindi napalitan ang password. Pakisubukang muli.' : 'Failed to reset password. Please try again.');
        if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('expired')) {
          setErrors({ general: msg });
        } else {
          setErrors({ newPassword: msg });
        }
      }
    } catch (err) {
      setErrors({ newPassword: lang === 'tl' ? 'Hindi makakonekta sa server.' : 'Network connection error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (stage === 4) {
      onResetComplete();
    } else if (stage === 3) {
      setStage(2);
      setErrors({});
    } else if (stage === 2) {
      setStage(1);
      setErrors({});
    } else {
      onBack();
    }
  };

  useEffect(() => {
    const onHardwareBackPress = () => {
      handleBack();
      return true; // consumed
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => backSub.remove();
  }, [stage]);

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
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
          <View style={styles.backIconCircle}>
            <ArrowLeftIcon size={14} color="#C8102E" />
          </View>
          <Text style={styles.backBtnText}>
            {stage > 1 && stage < 4
              ? (lang === 'tl' ? 'Bumalik sa Nakaraan' : 'Back to Previous')
              : (lang === 'tl' ? 'Bumalik sa Login' : 'Back to Sign In')}
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
                <>Ilagay ang 6-digit code na ipinadala sa <Text style={{ fontWeight: 'bold', color: '#C8102E' }}>{identifier}</Text>.</>
              ) : (
                <>Enter the 6-digit code sent to <Text style={{ fontWeight: 'bold', color: '#C8102E' }}>{identifier}</Text>.</>
              )}
            </Text>

            {fallbackOtp ? (
              <View style={{
                backgroundColor: '#EDF1FB',
                borderColor: '#D6DEFA',
                borderWidth: 1,
                borderRadius: 8,
                padding: 10,
                marginBottom: 14,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 11.5, color: '#1C3F94', fontWeight: '700' }}>
                  {lang === 'tl' ? 'Verification Code (SMS / System Backup):' : 'Verification Code (SMS / System Backup):'}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1C3F94', letterSpacing: 4, marginTop: 4 }}>
                  {fallbackOtp}
                </Text>
              </View>
            ) : null}

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
                    if (errors.otp) setErrors({ ...errors, otp: '' });
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                <AlertTriangleIcon size={14} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>
                  {errors.otp}
                </Text>
              </View>
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

            <View style={{ marginTop: 14, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={loading || resendCooldown > 0}
                style={{ paddingVertical: 6, paddingHorizontal: 12 }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: resendCooldown > 0 ? '#8A9BB8' : '#C8102E',
                }}>
                  {resendCooldown > 0
                    ? (lang === 'tl' ? `Muling magpadala sa loob ng ${resendCooldown}s` : `Resend code in ${resendCooldown}s`)
                    : (lang === 'tl' ? 'Hindi natanggap ang code? Ipadala Muli' : "Didn't receive code? Resend OTP")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : stage === 3 ? (
          /* STAGE 3: RESET PASSWORD */
          <View style={styles.cardPod}>
            <Text style={styles.cardTitle}>
              {lang === 'tl' ? 'Magtakda ng Bagong Password' : 'Set New Password'}
            </Text>
            <Text style={styles.cardSub}>
              {lang === 'tl' ? 'Gumawa ng bagong ligtas na password para sa inyong account.' : 'Create a new secure password for your account.'}
            </Text>

            {errors.general && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(220, 38, 38, 0.3)',
                padding: 10,
                borderRadius: 8,
                marginBottom: 14,
              }}>
                <AlertTriangleIcon size={16} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600', flex: 1 }}>
                  {errors.general}
                </Text>
              </View>
            )}

            <NeumorphicInput
              label={lang === 'tl' ? 'Bagong Password' : 'New Password'}
              value={newPassword}
              onChangeText={(txt) => {
                setNewPassword(txt);
                if (errors.newPassword || errors.general) {
                  setErrors({ ...errors, newPassword: '', general: '' });
                }
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
                if (errors.confirmPassword || errors.general) {
                  setErrors({ ...errors, confirmPassword: '', general: '' });
                }
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
        ) : stage === 4 ? (
          /* STAGE 4: SUCCESS */
          <View style={[styles.cardPod, { alignItems: 'center' }]}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(21, 138, 100, 0.12)',
              borderWidth: 2,
              borderColor: '#158A64',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              alignSelf: 'center',
            }}>
              <CheckIcon size={32} color="#158A64" />
            </View>

            <Text style={[styles.cardTitle, { textAlign: 'center', color: '#158A64', marginBottom: 8 }]}>
              {lang === 'tl' ? 'Matagumpay na Napalitan ang Password!' : 'Password Reset Successfully!'}
            </Text>
            <Text style={[styles.cardSub, { textAlign: 'center', marginBottom: 24 }]}>
              {lang === 'tl'
                ? 'Nai-update na ang password ng inyong account. Maaari ka nang mag-sign in gamit ang inyong bagong password.'
                : 'Your account password has been updated. You can now sign in using your new credentials.'}
            </Text>

            <MotionPressable style={styles.actionBtn} onPress={onResetComplete} activeOpacity={0.85}>
              <Text style={styles.actionBtnText}>
                {lang === 'tl' ? 'Mag-sign In Ngayon' : 'Sign In Now'}
              </Text>
            </MotionPressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FC' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: Math.max(RESPONSIVE.topSafe + 12, 28),
    paddingBottom: Math.max(RESPONSIVE.botSafe + 12, 28),
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(200, 16, 46, 0.08)',
    } : {
      shadowColor: '#C8102E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    }),
  },
  backIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C8102E',
    letterSpacing: 0.2,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
  },
  shieldLogoBox: {
    width: 76,
    height: 76,
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
    color: '#0B1525',
  },
  brandSub: {
    fontSize: 11.5,
    color: '#3D5070',
    marginTop: 2,
  },
  cardPod: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderTopColor: '#C9A84C',
    borderTopWidth: 3.5,
    padding: RESPONSIVE.cardPadding,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.black,
    color: '#0B1525',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#3D5070',
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
    borderColor: '#DDE4F0',
    fontSize: 18,
    fontWeight: '800',
    color: '#C8102E',
    textAlign: 'center',
  },
  otpBoxInputFilled: {
    borderColor: '#C8102E',
    backgroundColor: '#FEF0F2',
  },
  actionBtn: {
    backgroundColor: '#C8102E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
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
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
