import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * MotionShimmerCard (Motion Primitive)
 * - Subtle, high-security light sweep reflection across official digital passes
 * - Periodically traverses every 6 seconds with ultra-soft 6% opacity
 * - Gives digital IDs and QR cards an authentic government/Apple Wallet physical sheen
 */
export default function MotionShimmerCard({ children, style, intervalMs = 6000 }) {
  const transX = useRef(new Animated.Value(-250)).current;

  useEffect(() => {
    let isMounted = true;

    const runShimmer = () => {
      if (!isMounted) return;
      transX.setValue(-250);

      Animated.sequence([
        Animated.timing(transX, {
          toValue: 450,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.delay(intervalMs),
      ]).start(() => {
        if (isMounted) runShimmer();
      });
    };

    runShimmer();

    return () => {
      isMounted = false;
    };
  }, [intervalMs]);

  return (
    <View style={[styles.container, style]}>
      {children}
      {/* Light Sweep Layer */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmerLayer,
          {
            transform: [{ translateX: transX }],
          },
        ]}
      >
        <View style={{ transform: [{ rotate: '-20deg' }], flex: 1 }}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 160,
    zIndex: 99,
  },
  gradient: {
    flex: 1,
  },
});
