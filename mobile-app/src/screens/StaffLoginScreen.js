import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftIcon, ShieldCheckIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/AppIcons';
import { COLORS, RADIUS, FONT_WEIGHT, SHADOWS, SPACING, RESPONSIVE, hp } from '../theme';
import { MotionPressable } from '../components/motion';
import { API_BASE_URL } from '../config';

export default function StaffLoginScreen({ onLoginSuccess, onBack }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef(null);
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
  const [errorMsg, setErrorMsg] = useState('');

  const handleStaffLogin = async () => {
    if (!emailOrPhone.trim()) {
      setErrorMsg('Wrong Username');
      return;
    }
    if (!password) {
      setErrorMsg('Wrong Password');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone.trim(),
          password,
          requiredRole: 'field_staff',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = (data.message || '').toLowerCase();
        if (msg.includes('password')) {
          throw new Error('Wrong Password');
        } else {
          throw new Error('Wrong Username');
        }
      }

      onLoginSuccess(data);
    } catch (err) {
      setErrorMsg(err.message || 'Wrong Username or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#071D3A', '#0D3C75', '#154A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientHeader}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <ArrowLeftIcon size={14} color="#FFFFFF" />
          <Text style={styles.backText}>Pumili ng Portal</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.badgePill}>
            <ShieldCheckIcon size={12} color="#FCD34D" />
            <Text style={styles.badgeText}>OPISYAL NA DISPATCH PORTAL</Text>
          </View>
          <Text style={styles.title}>LGU Field Staff Portal</Text>
          <Text style={styles.sub}>Para sa mga awtorisadong kawani ng Pamahalaang Lungsod ng Maynila sa pamamahagi ng ayuda</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={styles.scrollBody} contentContainerStyle={[styles.content, { paddingBottom: 90 + keyboardHeight }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Field Staff Email o Username:</Text>
          <TextInput
            style={styles.input}
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            placeholder="Enter Username"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password ng Kawani:</Text>
          <View style={{ position: 'relative', justifyContent: 'center' }}>
            <TextInput
              style={[styles.input, { paddingRight: 44 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 12, top: 14, padding: 4 }}
              activeOpacity={0.7}
            >
              {showPassword ? <EyeOffIcon size={19} color="#1557B0" /> : <EyeIcon size={19} color="#64748B" />}
            </TouchableOpacity>
          </View>

          <MotionPressable
            style={[styles.loginBtn, loading && { opacity: 0.75 }]}
            onPress={handleStaffLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>Mag-Log In sa Staff Scanner </Text>
            )}
          </MotionPressable>
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
             <Text style={{ fontWeight: '800' }}>Paunawa sa Seguridad:</Text> Ang mga Field Staff accounts ay direktang nililikha ng LGU Admin. Walang public self-registration upang matiyak ang integridad ng pamamahagi.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F7' },
  gradientHeader: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 4,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  backText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  header: { marginTop: 4 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(252, 211, 77, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: { fontSize: 9.5, fontWeight: '800', color: '#FCD34D', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: FONT_WEIGHT.black, color: '#FFFFFF', letterSpacing: -0.3 },
  sub: { fontSize: 12, color: '#E2E8F0', marginTop: 4, lineHeight: 17 },
  scrollBody: { flex: 1 },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 20,
    paddingBottom: 90,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  label: { fontSize: 12, fontWeight: '800', color: '#172B4D', marginBottom: 6 },
  input: {
    backgroundColor: '#F8F9F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#D9E2EC',
    fontSize: 13.5,
    color: '#172B4D',
  },
  loginBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.sm,
  },
  loginBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  noticeBox: {
    marginTop: 18,
    backgroundColor: '#E8F2FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeText: { fontSize: 11.5, color: '#1557B0', lineHeight: 17 },
});
