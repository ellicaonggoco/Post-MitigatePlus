import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from './src/components/SplashScreen';
import ResidentLoginScreen from './src/screens/ResidentLoginScreen';
import ResidentRegisterScreen from './src/screens/ResidentRegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResidentHomeScreen from './src/screens/ResidentHomeScreen';
import StaffScannerScreen from './src/screens/StaffScannerScreen';

function ScreenTransition({ children, transitionKey }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    translateYAnim.setValue(8);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [transitionKey]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: translateYAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'register' | 'forgot'
  const [userSession, setUserSession] = useState(null);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    (async () => {
      try {
        const savedLang = await AsyncStorage.getItem('mitigateplus_user_lang');
        if (savedLang) setLang(savedLang);

        // ── Persistent Auto-Login Recovery from Storage ──
        const savedToken = await AsyncStorage.getItem('mitigateplus_token');
        const savedSessionJson = await AsyncStorage.getItem('mitigateplus_user_session');

        if (savedToken && savedSessionJson) {
          const parsedSession = JSON.parse(savedSessionJson);
          if (parsedSession && parsedSession.token) {
            setUserSession(parsedSession);
          }
        }
      } catch (e) {
        console.warn('Auto-login session restore error:', e);
      }
    })();
  }, []);

  const handleSelectLang = async (newLang) => {
    setLang(newLang);
    try {
      await AsyncStorage.setItem('mitigateplus_user_lang', newLang);
    } catch (e) {}
  };

  const handleAuthSuccess = async (session) => {
    setUserSession(session);
    if (session?.token) {
      try {
        await AsyncStorage.setItem('mitigateplus_token', session.token);
        await AsyncStorage.setItem('mitigateplus_user_session', JSON.stringify(session));
        await AsyncStorage.setItem('mitigateplus_session_start', Date.now().toString());
      } catch (e) {}
    }
  };

  const handleLogout = async () => {
    setUserSession(null);
    setCurrentScreen('login');
    try {
      await AsyncStorage.removeItem('mitigateplus_token');
      await AsyncStorage.removeItem('mitigateplus_user_session');
      await AsyncStorage.removeItem('mitigateplus_session_start');
    } catch (e) {}
  };

  const isStaff = userSession?.role === 'staff' || userSession?.role === 'field_staff';
  const activeKey = userSession ? (isStaff ? 'staff' : 'resident') : currentScreen;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* 1. Minimal Pure White Splash Screen with Cross-Fade Transition */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      {/* 2. Main Authenticated / Unauthenticated App Routing with Smooth Transitions */}
      <ScreenTransition transitionKey={activeKey}>
        {userSession ? (
          // Role-Based Operations Portal
          isStaff ? (
            <StaffScannerScreen
              token={userSession.token}
              user={userSession}
              lang={lang}
              onSelectLang={handleSelectLang}
              onLogout={handleLogout}
            />
          ) : (
            <ResidentHomeScreen
              user={userSession}
              household={userSession.household}
              token={userSession.token}
              lang={lang}
              onSelectLang={handleSelectLang}
              onLogout={handleLogout}
            />
          )
        ) : currentScreen === 'login' ? (
          <ResidentLoginScreen
            lang={lang}
            onSelectLang={handleSelectLang}
            onLoginSuccess={handleAuthSuccess}
            onNavigateRegister={() => setCurrentScreen('register')}
            onNavigateForgot={() => setCurrentScreen('forgot')}
          />
        ) : currentScreen === 'register' ? (
          <ResidentRegisterScreen
            lang={lang}
            onSelectLang={handleSelectLang}
            onRegisterSuccess={handleAuthSuccess}
            onBack={() => setCurrentScreen('login')}
          />
        ) : (
          <ForgotPasswordScreen
            lang={lang}
            onSelectLang={handleSelectLang}
            onBack={() => setCurrentScreen('login')}
            onResetComplete={() => setCurrentScreen('login')}
          />
        )}
      </ScreenTransition>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
