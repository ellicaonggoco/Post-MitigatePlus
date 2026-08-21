import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, FONT_WEIGHT, SPACING } from '../theme';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [loadingText, setLoadingText] = useState('Initializing Manila LGU Engine...');

  useEffect(() => {
    // 1. Entrance animation (Fade-in + Spring Scale)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Progress bar animation (0% -> 100%)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false,
    }).start(() => {
      // 3. Smooth exit transition
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    });

    // Dynamic loading text updates
    const t1 = setTimeout(() => setLoadingText('Authenticating Household Profile...'), 800);
    const t2 = setTimeout(() => setLoadingText('Connecting Live Real-Time Socket...'), 1500);
    const t3 = setTimeout(() => setLoadingText('Ready!'), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#071D3A', '#0D3C75']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Glowing Seal Logo Frame */}
          <View style={styles.logoFrame}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* App Branding */}
          <Text style={styles.brandTitle}>MitigatePlus</Text>
          <Text style={styles.brandTagline}>PAMAHALAANG LUNGSOD NG MAYNILA</Text>
          <Text style={styles.brandSub}>Post-Disaster Recovery & Relief System</Text>

          {/* Modern Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </Animated.View>

        {/* Footer Authority Badge */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>OFFICIAL LGU BENEFICIARY APP • VERSION 2.4</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  content: { alignItems: 'center', width: '100%', maxWidth: 360 },
  logoFrame: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#0D3C75',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  logo: { width: 110, height: 110 },
  brandTitle: {
    fontSize: 34,
    fontWeight: FONT_WEIGHT.black,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: '#F59E0B',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  brandSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 40,
    alignItems: 'center',
  },
  progressTrack: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  loadingText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 10,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    fontWeight: '700',
  },
});
