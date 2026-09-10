import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform, StatusBar as RNStatusBar, LogBox, BackHandler, ToastAndroid } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ignore benign Expo Go development warnings
LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
  'The <CameraView> component does not support children',
  'Require cycle:',
  'VirtualizedLists should never be nested',
  'Cannot record touch end without a touch start',
  'Ended a touch event which was not counted in trackedTouchCount',
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

function MainApp() {
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
    backgroundColor: '#FFFFFF',
  },
  adaptiveWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F3F6FC',
    position: 'relative',
    overflow: 'hidden',
  },
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[MitigatePlus ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  handleResetAndRestart = async () => {
    try {
      await AsyncStorage.removeItem('mitigateplus_token');
      await AsyncStorage.removeItem('mitigateplus_user_session');
    } catch (e) {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.card}>
            <View style={errorStyles.badge}>
              <Text style={errorStyles.badgeText}>MITIGATE+ RESCUE MODE</Text>
            </View>
            <Text style={errorStyles.title}>Pansamantalang Aberya sa App</Text>
            <Text style={errorStyles.subtitle}>
              {this.state.error?.message || 'Nagkaroon ng hindi inaasahang error habang binubuksan ang application.'}
            </Text>
            <TouchableOpacity style={errorStyles.btnPrimary} onPress={this.handleRestart} activeOpacity={0.8}>
              <Text style={errorStyles.btnTextPrimary}>Buksan Muli / Restart App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={errorStyles.btnSecondary} onPress={this.handleResetAndRestart} activeOpacity={0.8}>
              <Text style={errorStyles.btnTextSecondary}>I-clear ang Session Cache at Mag-restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE4F0',
  },
  badge: {
    backgroundColor: '#FEF0F2',
    borderColor: '#F5E0E3',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginBottom: 16,
  },
  badgeText: {
    color: '#C8102E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1525',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#3D5070',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#1C3F94',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    width: '100%',
    backgroundColor: '#F3F6FC',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE4F0',
  },
  btnTextSecondary: {
    color: '#3D5070',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

