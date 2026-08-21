import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * MotionPulseBadge (Motion Primitive)
 * - Calm, continuous breathing presence for official "VERIFIED" badges & real-time connectivity
 * - 2.8s gentle breathing rhythm (0.96 <-> 1.04 scale & 0.85 <-> 1.0 opacity)
 * - Professional, non-distracting, reassuring civic UI
 */
export default function MotionPulseBadge({ children, color = '#10B981', style }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const haloAnim = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    // 1. Subtle Badge Breathing
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.97,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Gentle Outer Halo Ping
    const halo = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloAnim, {
            toValue: 1.25,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(haloAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.45,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1200),
      ])
    );

    breathe.start();
    halo.start();

    return () => {
      breathe.stop();
      halo.stop();
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      {/* Outer Halo Glow */}
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: color,
            opacity: haloOpacity,
            transform: [{ scale: haloAnim }],
          },
        ]}
      />
      {/* Active Content */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    zIndex: -1,
  },
});
