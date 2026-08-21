import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

/**
 * MotionPressable (Motion Primitive)
 * - Apple-grade subtle spring physics on press (0.975 scale on pressIn -> 1.0 on release)
 * - Zero lag, runs 100% on Native Driver (60-120 FPS)
 * - Gives every card and button an authentic, premium tactile feel
 */
export default function MotionPressable({
  children,
  onPress,
  style,
  activeOpacity = 0.92,
  scaleTo = 0.975,
  disabled = false,
  ...props
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      tension: 220,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={activeOpacity}
        disabled={disabled}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
