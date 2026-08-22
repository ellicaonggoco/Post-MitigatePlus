import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { FONT_WEIGHT } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Clean, Proportionate & Frame-Free Splash Screen
 * -------------------------------------------------------------
 * 1. Logo 1: Tight, trimmed, massive "MITIGATE+" banner with commanding presence.
 * 2. Frame-Free: Zero glass/card/box background around Logo 2 - raw pure artwork.
 * 3. Zero-Ghosting Transition: Logo 1 cleanly dissolves before Logo 2 blooms.
 * 4. Logo 2: Proportionate Slanted 'M' Clock Tower with calm sinusoidal breathing pulse.
 * 5. Tight Lockup: Persistent civic typography tightly seated under the logo stage.
 */
export default function SplashScreen({ onFinish }) {
  // Logo 1 Animations
  const logo1Opacity = useRef(new Animated.Value(0)).current;
  const logo1Scale = useRef(new Animated.Value(0.92)).current;

  // Logo 2 Animations (Direct Emblem, No Card Box)
  const logo2Opacity = useRef(new Animated.Value(0)).current;
  const logo2Scale = useRef(new Animated.Value(0.88)).current;
  const slowPumpScale = useRef(new Animated.Value(1)).current;

  // Persistent Civic Typography Fade-in
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Overall Exit Screen Opacity
  const screenExitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const smoothEaseOut = Easing.bezier(0.16, 1, 0.3, 1);
    const smoothEaseIn = Easing.bezier(0.7, 0, 0.84, 0);

    // =========================================================================
    // 1. BOOT SEQUENCE: Massive Logo 1 Entrance + Persistent Text (600ms)
    // =========================================================================
    Animated.parallel([
      Animated.timing(logo1Opacity, {
        toValue: 1,
        duration: 600,
        easing: smoothEaseOut,
        useNativeDriver: true,
      }),
      Animated.timing(logo1Scale, {
        toValue: 1,
        duration: 600,
        easing: smoothEaseOut,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        easing: smoothEaseOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Hold Logo 1 on screen for 1.3 seconds
      const timer1 = setTimeout(() => {
        // =====================================================================
        // 2. CLEAN GHOSTING-FREE TRANSITION: Logo 1 dissolves -> Logo 2 blooms
        // =====================================================================
        // Step A: Logo 1 dissolves completely
        Animated.parallel([
          Animated.timing(logo1Opacity, {
            toValue: 0,
            duration: 350,
            easing: smoothEaseIn,
            useNativeDriver: true,
          }),
          Animated.timing(logo1Scale, {
            toValue: 1.04,
            duration: 350,
            easing: smoothEaseIn,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Step B: Logo 2 blooms in directly (No card frame)
          Animated.parallel([
            Animated.timing(logo2Opacity, {
              toValue: 1,
              duration: 450,
              easing: smoothEaseOut,
              useNativeDriver: true,
            }),
            Animated.timing(logo2Scale, {
              toValue: 1,
              duration: 450,
              easing: smoothEaseOut,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // ===================================================================
            // 3. SLOW, CALM & ORGANIC SINUSOIDAL BREATHING PUMP PULSE
            // ===================================================================
            const slowPumpLoop = Animated.loop(
              Animated.sequence([
                Animated.timing(slowPumpScale, {
                  toValue: 1.06,
                  duration: 950,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(slowPumpScale, {
                  toValue: 0.96,
                  duration: 900,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(slowPumpScale, {
                  toValue: 1.0,
                  duration: 750,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.delay(100),
              ])
            );
            slowPumpLoop.start();

            // ===================================================================
            // 4. STAGE 3 EXIT: Hold pulse for 2.0s, then smooth handoff to Auth
            // ===================================================================
            const timer2 = setTimeout(() => {
              Animated.timing(screenExitOpacity, {
                toValue: 0,
                duration: 500,
                easing: smoothEaseIn,
                useNativeDriver: true,
              }).start(() => {
                slowPumpLoop.stop();
                if (onFinish) onFinish();
              });
            }, 2000);

            return () => clearTimeout(timer2);
          });
        });
      }, 1300);

      return () => clearTimeout(timer1);
    });
  }, [logo1Opacity, logo1Scale, logo2Opacity, logo2Scale, slowPumpScale, textOpacity, screenExitOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: screenExitOpacity }]}>
      <View style={styles.centerContent}>
        {/* =================================================================== */}
        {/* IN-PLACE LOGO STAGE (Proportionally Balanced & Frame-Free)           */}
        {/* =================================================================== */}
        <View style={styles.logoStage}>
          {/* LOGO 1: MASSIVE PROPORTIONATE 'MITIGATE+' BANNER */}
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

          {/* LOGO 2: SLANTED 'M' CLOCK TOWER (Pure Emblem, No Glass / Card Box) */}
          <Animated.View
            style={[
              styles.logoAbsolute,
              {
                opacity: logo2Opacity,
                transform: [
                  { scale: logo2Scale },
                ],
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

        {/* =================================================================== */}
        {/* PERSISTENT CIVIC TYPOGRAPHY (Snugly Positioned Right Under Logo)    */}
        {/* =================================================================== */}
        <Animated.View style={[styles.textGroup, { opacity: textOpacity }]}>
          <Text style={styles.civicTitle}>Pamahalaang Lungsod ng Maynila</Text>
          <Text style={styles.platformSub}>Disaster Mitigation & Recovery Platform</Text>
        </Animated.View>
      </View>

      {/* Persistent Bottom Civic Anchor */}
      <View style={styles.footerAnchor}>
        <Text style={styles.footerAnchorText}>CITY OF MANILA • MDRRMO OPERATIONS</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF', // Solid Pure White Canvas
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  centerContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // In-Place Logo Viewport
  logoStage: {
    width: '100%',
    height: 170, // Balanced height for both logos
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  logoAbsolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  // Massive & Proportionate Logo 1 (Trimmed bounds fill width)
  massiveLogo1: {
    width: Math.min(SCREEN_WIDTH - 24, 380),
    height: 80,
  },
  // Slanted Logo 2 (Pure raw image, no card/glass frame)
  slantedLogoImg: {
    width: 155,
    height: 155,
  },
  // Tightly Positioned Text Lockup
  textGroup: {
    alignItems: 'center',
    marginTop: 4,
  },
  civicTitle: {
    fontSize: 14.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    letterSpacing: -0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  platformSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  footerAnchor: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
  },
  footerAnchorText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#CBD5E1',
    letterSpacing: 1.2,
  },
});
