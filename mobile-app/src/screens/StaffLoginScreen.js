import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftIcon, ShieldCheckIcon, LockIcon, EyeIcon, EyeOffIcon, AlertTriangleIcon } from '../components/AppIcons';
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
        colors={['#5A0515', '#8B0A20', '#C8102E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientHeader}
      >
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Pumili ng Portal, Back to portal selection"
          accessibilityHint="Returns to portal selection screen"
        >
          <View style={styles.backIconCircle}>
            <ArrowLeftIcon size={14} color="#C8102E" />
          </View>
          <Text style={styles.backText}>Pumili ng Portal</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.badgePill}>
            <ShieldCheckIcon size={12} color="#C9A84C" />
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
            <AlertTriangleIcon size={14} color="#DC2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Field Staff Email o Username:</Text>
          <TextInput
            style={styles.input}
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            placeholder="Enter Username"
            placeholderTextColor="#334155"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password ng Kawani:</Text>
          <View style={{ position: 'relative', justifyContent: 'center' }}>
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#334155"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 6, top: 6, width: 44, height: 44, borderRadius: 8, backgroundColor: '#EDF1FB', borderWidth: 1, borderColor: '#D6DEFA', alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Itago ang password" : "Ipakita ang password"}
              accessibilityHint="Toggles password visibility"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {showPassword ? <EyeOffIcon size={19} color="#9E0B24" strokeWidth={2.4} /> : <EyeIcon size={19} color="#0B1525" strokeWidth={2.4} />}
            </TouchableOpacity>
          </View>

          <MotionPressable
            style={[styles.loginBtn, loading && { opacity: 0.75 }]}
            onPress={handleStaffLogin}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Mag-Log In sa Staff Scanner"
            accessibilityHint="Submits credentials to log into the field staff portal"
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
  container: { flex: 1, backgroundColor: '#F3F6FC' },
  gradientHeader: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 4,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 3,
    borderBottomColor: '#C9A84C',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(11, 29, 78, 0.20)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 5,
    }),
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
    paddingVertical: 10,
    borderRadius: 9999,
    marginBottom: 14,
    minHeight: 48,
    justifyContent: 'center',
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
  backText: { fontSize: 13, fontWeight: '800', color: '#C8102E', letterSpacing: 0.2 },
  header: { marginTop: 4 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(201, 168, 76, 0.20)',
    borderWidth: 1,
    borderColor: '#C9A84C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: { fontSize: 9.5, fontWeight: '800', color: '#C9A84C', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: FONT_WEIGHT.black, color: '#FFFFFF', letterSpacing: -0.3 },
  sub: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', marginTop: 4, lineHeight: 17 },
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
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderTopColor: '#C9A84C',
    borderTopWidth: 3.5,
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
  label: { fontSize: 12, fontWeight: '800', color: '#0B1525', marginBottom: 6 },
  input: {
    backgroundColor: '#F3F6FC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#DDE4F0',
    fontSize: 13.5,
    color: '#0B1525',
    minHeight: 48,
  },
  loginBtn: {
    backgroundColor: '#C8102E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
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
  loginBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '700', flex: 1 },
  noticeBox: {
    marginTop: 18,
    backgroundColor: '#FEF0F2',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  noticeText: { fontSize: 11.5, color: '#9E0B24', lineHeight: 17 },
});
