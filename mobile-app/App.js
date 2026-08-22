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
      } catch (e) {}
    })();
  }, []);

  const handleSelectLang = async (newLang) => {
    setLang(newLang);
    try {
      await AsyncStorage.setItem('mitigateplus_user_lang', newLang);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mitigateplus_user_lang', newLang);
      }
    } catch (e) {}
  };

  const handleAuthSuccess = async (session) => {
    setUserSession(session);
    if (session?.token) {
      try {
        await AsyncStorage.setItem('mitigateplus_token', session.token);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('mitigateplus_token', session.token);
        }
      } catch (e) {}
    }
  };

  const handleLogout = async () => {
    setUserSession(null);
    setCurrentScreen('login');
    try {
      await AsyncStorage.removeItem('mitigateplus_token');
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('mitigateplus_token');
      }
    } catch (e) {}
  };

  const activeKey = userSession ? (userSession.role === 'staff' ? 'staff' : 'resident') : currentScreen;

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
          userSession.role === 'staff' ? (
            <StaffScannerScreen
              token={userSession.token}
              lang={lang}
              onSelectLang={handleSelectLang}
              onLogout={handleLogout}
            />
          ) : (
            <ResidentHomeScreen
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
