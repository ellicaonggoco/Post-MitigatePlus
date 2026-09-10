import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, Dimensions, Platform, Pressable } from 'react-native';
import { FONT_WEIGHT } from '../theme';

const win = Dimensions.get('window') || {};
const SCREEN_WIDTH = win.width && win.width > 0 ? win.width : 375;
const SCREEN_HEIGHT = win.height && win.height > 0 ? win.height : 812;

/**
 * Bulletproof, Clean & Responsive Civic Splash Screen
 * -------------------------------------------------------------
 * 1. Rapid, Snappy Lifecycle (~2.2s total) to avoid stalling the user.
 * 2. Multi-Tiered Fail-Safe:
 *    - Strict component-level timeout (2.8s ceiling) guarantees dismiss even if animations stall.
 *    - Tap-to-skip allows immediate exit at any moment.
 *    - All timers tracked and cleaned up on unmount or re-render.
 * 3. Full-Screen Non-Collapsing Canvas:
 *    - Full screen dimensions prevent Android Flexbox percentage height collapse.
 *    - Proper vertical lockup keeps the bottom civic anchor cleanly anchored.
 * 4. Refined Civic Aesthetics:
 *    - Logo 1: Crisp primary horizontal wordmark banner.
 *    - Logo 2: Authentic Manila Clock Tower emblem.
 */
export default function SplashScreen({ onFinish }) {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const hasFinishedRef = useRef(false);
  const timersRef = useRef([]);

  // Logo 1 Animation values
  const logo1Opacity = useRef(new Animated.Value(0)).current;
  const logo1Scale = useRef(new Animated.Value(0.92)).current;

  // Logo 2 Animation values
  const logo2Opacity = useRef(new Animated.Value(0)).current;
  const logo2Scale = useRef(new Animated.Value(0.92)).current;

  // Persistent Civic Typography Fade-in
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Screen Exit Transition
  const screenExitOpacity = useRef(new Animated.Value(1)).current;

  const useNative = Platform.OS !== 'web';

  const finishSplash = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    // Clear all pending timeouts
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (onFinishRef.current) {
      onFinishRef.current();
    }
  }, []);

  const triggerExitAnimation = useCallback(() => {
    Animated.timing(screenExitOpacity, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: useNative,
    }).start(() => {
      finishSplash();
    });
  }, [screenExitOpacity, useNative, finishSplash]);

  // Tap-to-skip handler: immediate clean handoff
  const handleTapToSkip = useCallback(() => {
    finishSplash();
  }, [finishSplash]);

  useEffect(() => {
    const smoothEaseOut = Easing.bezier(0.16, 1, 0.3, 1);
    const smoothEaseIn = Easing.bezier(0.7, 0, 0.84, 0);

    // ── Hard Safety Timeout (2.8s Ceiling) ──────────────────────
    // If animations fail to fire callbacks due to dropped frames or Expo Go delays,
    // this unconditionally finishes the splash.
    const hardSafetyTimer = setTimeout(() => {
      finishSplash();
    }, 2800);
    timersRef.current.push(hardSafetyTimer);

    // ============================================================
    // STAGE 1: Logo 1 Entrance + Civic Typography (400ms)
    // ============================================================
    Animated.parallel([
      Animated.timing(logo1Opacity, {
        toValue: 1,
        duration: 400,
        easing: smoothEaseOut,
        useNativeDriver: useNative,
      }),
      Animated.timing(logo1Scale, {
        toValue: 1,
        duration: 400,
        easing: smoothEaseOut,
        useNativeDriver: useNative,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        easing: smoothEaseOut,
        useNativeDriver: useNative,
      }),
    ]).start();

    // ============================================================
    // STAGE 2: Cross-Fade to Logo 2 (at 850ms)
    // ============================================================
    const tStage2 = setTimeout(() => {
      // Dissolve Logo 1
      Animated.parallel([
        Animated.timing(logo1Opacity, {
          toValue: 0,
          duration: 250,
          easing: smoothEaseIn,
          useNativeDriver: useNative,
        }),
        Animated.timing(logo1Scale, {
          toValue: 1.04,
          duration: 250,
          easing: smoothEaseIn,
          useNativeDriver: useNative,
        }),
      ]).start();

      // Bloom Logo 2
      Animated.parallel([
        Animated.timing(logo2Opacity, {
          toValue: 1,
          duration: 350,
          easing: smoothEaseOut,
          useNativeDriver: useNative,
        }),
        Animated.timing(logo2Scale, {
          toValue: 1,
          duration: 350,
          easing: smoothEaseOut,
          useNativeDriver: useNative,
        }),
      ]).start();
    }, 850);
    timersRef.current.push(tStage2);

    // ============================================================
    // STAGE 3: Exit Transition into Login / App (at 1950ms)
    // ============================================================
    const tStage3 = setTimeout(() => {
      triggerExitAnimation();
    }, 1950);
    timersRef.current.push(tStage3);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [
    logo1Opacity,
    logo1Scale,
    logo2Opacity,
    logo2Scale,
    textOpacity,
    useNative,
    finishSplash,
    triggerExitAnimation,
  ]);

  return (
    <Animated.View style={[styles.container, { opacity: screenExitOpacity }]}>
      {/* Background Tap-To-Skip Touch Surface */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleTapToSkip}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Skip splash screen"
      />

      {/* Centered Civic & Brand Lockup */}
      <View style={styles.centerContent} pointerEvents="none">
        {/* LOGO STAGE */}
        <View style={styles.logoStage}>
          {/* LOGO 1: MITIGATE+ BANNER */}
          <Animated.View
            style={[
              styles.logoAbsolute,
              {
                opacity: logo1Opacity,
                transform: [{ scale: logo1Scale }],
              },
            ]}
          >
            <Image
              source={require('../../assets/logo_primary.png')}
              style={styles.massiveLogo1}
              resizeMode="contain"
            />
          </Animated.View>

          {/* LOGO 2: SLANTED 'M' CLOCK TOWER */}
          <Animated.View
            style={[
              styles.logoAbsolute,
              {
                opacity: logo2Opacity,
                transform: [{ scale: logo2Scale }],
              },
            ]}
          >
            <View style={{ transform: [{ rotate: '-4deg' }] }}>
              <Image
                source={require('../../assets/logo_secondary.png')}
                style={styles.slantedLogoImg}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </View>

        {/* PERSISTENT CIVIC TYPOGRAPHY */}
        <Animated.View style={[styles.textGroup, { opacity: textOpacity }]}>
          <Text style={styles.civicTitle}>Pamahalaang Lungsod ng Maynila</Text>
          <Text style={styles.platformSub}>Disaster Mitigation & Recovery Platform</Text>
        </Animated.View>
      </View>

      {/* BOTTOM CIVIC ANCHOR */}
      <View style={styles.footerAnchor} pointerEvents="none">
        <Text style={styles.footerAnchorText}>CITY OF MANILA • MDRRMO OPERATIONS</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoStage: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  logoAbsolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  massiveLogo1: {
    width: Math.max(200, Math.min(SCREEN_WIDTH - 32, 360)),
    height: 76,
  },
  slantedLogoImg: {
    width: 145,
    height: 145,
  },
  textGroup: {
    alignItems: 'center',
    marginTop: 6,
  },
  civicTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    letterSpacing: -0.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  platformSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#3D5070',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  footerAnchor: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 26 : 40,
    alignItems: 'center',
    width: '100%',
  },
  footerAnchorText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D6DEFA',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});

