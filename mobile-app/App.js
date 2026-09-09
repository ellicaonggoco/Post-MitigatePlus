import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Animated, Platform, StatusBar as RNStatusBar, LogBox, BackHandler, ToastAndroid } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ignore benign Expo Go development warnings
LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
  'The <CameraView> component does not support children',
  'Require cycle:',
  'VirtualizedLists should never be nested',
]);

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
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [transitionKey]);

  return (
    <Animated.View
      style={{
        flex: 1,
        width: '100%',
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

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Master failsafe: Guarantee splash never stalls past 3.5s under any condition
  useEffect(() => {
    const splashFailsafeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);
    return () => clearTimeout(splashFailsafeTimer);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('mitigateplus-google-fonts')) {
        const link = document.createElement('link');
        link.id = 'mitigateplus-google-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap';
        document.head.appendChild(link);
      }
      if (!document.getElementById('mitigateplus-global-font-style')) {
        const style = document.createElement('style');
        style.id = 'mitigateplus-global-font-style';
        style.innerHTML = `
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow-x: hidden !important;
            background-color: #F3F6FC !important;
          }
          * {
            box-sizing: border-box !important;
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          }
        `;
        document.head.appendChild(style);
      }
    }

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

  const lastBackPressRef = useRef(0);

  useEffect(() => {
    const onHardwareBackPress = () => {
      // If user is currently on 'register' or 'forgot' screen, return to login
      if (!userSession && currentScreen !== 'login') {
        setCurrentScreen('login');
        return true; // consumed
      }

      // If user is on 'login' root screen, prevent accidental immediate exit
      if (!userSession && currentScreen === 'login') {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          return false; // let Android exit gracefully
        }
        lastBackPressRef.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            lang === 'tl' ? 'Pindutin muli ang Back upang lumabas' : 'Press Back again to exit',
            ToastAndroid.SHORT
          );
        }
        return true; // consumed
      }

      return false;
    };

    const backHandlerSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress
    );

    return () => backHandlerSub.remove();
  }, [userSession, currentScreen, lang]);

  const isStaff = userSession?.role === 'staff' || userSession?.role === 'field_staff';
  const activeKey = userSession ? (isStaff ? 'staff' : 'resident') : currentScreen;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* 1. Minimal Pure White Splash Screen with Cross-Fade Transition */}
      {showSplash ? (
        <SplashScreen onFinish={handleSplashFinish} />
      ) : (
        /* 2. Adaptive Responsive Shell for All Screen Sizes */
        <View style={styles.adaptiveWrapper}>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F3F6FC',
  },
  adaptiveWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F3F6FC',
    position: 'relative',
    overflow: 'hidden',
  },
});
