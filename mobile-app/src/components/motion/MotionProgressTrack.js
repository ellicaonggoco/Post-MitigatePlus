import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * MotionProgressTrack (Motion Primitive)
 * - Liquid animated progress bar for 5-Stage Recovery Stepper
 * - Smooth cubic ease-out interpolation on mount and status progression
 * - Clean, non-jittery 60FPS fluid fill
 */
export default function MotionProgressTrack({ percentage = 65, height = 8, color = '#1557B0', style }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(Math.max(percentage, 8), 100),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.trackBg, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.trackFill,
          {
            width: widthInterpolated,
            height,
            borderRadius: height / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trackBg: {
    width: '100%',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
