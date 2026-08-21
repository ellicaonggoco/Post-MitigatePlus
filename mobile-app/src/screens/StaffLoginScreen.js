import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { ArrowLeftIcon } from '../components/AppIcons';
import { COLORS, RADIUS, TOUCH_TARGET, FONT_WEIGHT, SHADOWS, SPACING, RESPONSIVE, wp, hp } from '../theme';
import { API_BASE_URL } from '../config';

export default function StaffLoginScreen({ onLoginSuccess, onBack }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStaffLogin = async () => {
    if (!emailOrPhone || !password) {
      setErrorMsg('Please enter staff credentials.');
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
        throw new Error(data.message || 'Staff authentication failed.');
      }

      onLoginSuccess(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
        <ArrowLeftIcon size={16} color="#1557B0" />
        <Text style={styles.backText}>Change User Portal</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 180, height: 75, resizeMode: 'contain', marginBottom: SPACING.sm }}
        />
        <Text style={styles.title}>LGU Field Staff Sign In</Text>
        <Text style={styles.sub}>Authorized access portal for relief distribution & QR scanning staff</Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={[styles.card, SHADOWS.card]}>
        <Text style={styles.label}>Field Staff Email or Username:</Text>
        <TextInput
          style={styles.input}
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          placeholder="Enter your staff email"
          placeholderTextColor={COLORS.inkFaint}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { marginTop: SPACING.md }]}>Staff Security Password:</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter staff password"
          placeholderTextColor={COLORS.inkFaint}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.loginBtn, SHADOWS.button]}
          onPress={handleStaffLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.loginBtnText}>
            {loading ? 'Authenticating...' : 'Access Staff QR Dispatcher'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          Notice: Field Staff accounts are provisioned exclusively by LGU Admins. Self-registration is disabled for security compliance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sampaguita },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 6,
    paddingBottom: hp(8),
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
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  backText: { fontSize: 12.5, fontWeight: FONT_WEIGHT.bold, color: '#1557B0' },
  header: { marginBottom: SPACING.lg },
  title: { fontSize: 22, fontWeight: FONT_WEIGHT.black, color: COLORS.manilaBlue },
  sub: { fontSize: 13, color: COLORS.inkSoft, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: { fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: COLORS.ink, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.sampaguita,
    borderRadius: RADIUS.inner,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.ink,
    minHeight: TOUCH_TARGET,
  },
  loginBtn: {
    backgroundColor: COLORS.manilaBlue,
    borderRadius: RADIUS.inner,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    minHeight: TOUCH_TARGET,
  },
  loginBtnText: { color: '#FFF', fontWeight: FONT_WEIGHT.bold, fontSize: 15 },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    padding: SPACING.md,
    borderRadius: RADIUS.inner,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(198,86,75,0.3)',
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: FONT_WEIGHT.medium },
  noticeBox: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.manilaBlueLight,
    padding: SPACING.md,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    borderColor: 'rgba(23, 63, 86, 0.2)',
  },
  noticeText: { fontSize: 12, color: COLORS.manilaBlue, textAlign: 'center', lineHeight: 17 },
});
