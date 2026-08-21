import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, StyleSheet, View } from 'react-native';

/**
 * MotionSeverityTile (Motion Primitive)
 * - Tactile selection card with spring pop & colored border illumination
 * - Subtle scale pop (1.025) on active selection
 * - Smooth, high-taste visual feedback for disaster damage assessments
 */
export default function MotionSeverityTile({
  isSelected,
  onPress,
  children,
  activeColor = '#DC2626',
  badgeBg = '#FEE2E2',
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.02 : 1)).current;
  const borderAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.02 : 1,
        tension: 180,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(borderAnim, {
        toValue: isSelected ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isSelected]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 240,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.02 : 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E2E8F0', activeColor],
  });

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Animated.View
        style={[
          styles.card,
          {
            borderColor: borderColor,
            borderWidth: isSelected ? 2 : 1.5,
            backgroundColor: isSelected ? badgeBg : '#FFFFFF',
            shadowColor: isSelected ? activeColor : 'rgba(15,23,42,0.06)',
            shadowOpacity: isSelected ? 0.18 : 0.04,
            shadowRadius: isSelected ? 8 : 4,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={styles.innerTouchable}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  innerTouchable: {
    padding: 12,
  },
});
