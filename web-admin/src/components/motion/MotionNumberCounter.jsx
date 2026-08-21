import React, { useEffect, useState } from 'react';

/**
 * MotionNumberCounter (Web Motion Primitive)
 * - Smooth rolling counter animation on KPI load (0 -> target value)
 * - 60FPS fluid ease-out animation curve
 * - Handles integers, commas, and percentage strings
 */
export default function MotionNumberCounter({
  value = 0,
  duration = 1.2,
  prefix = '',
  suffix = '',
  className = '',
  style = {},
}) {
  const numericTarget = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0
    : Number(value) || 0;

  const [displayValue, setDisplayValue] = useState(numericTarget);

  useEffect(() => {
    const numericTarget = typeof value === 'string'
      ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0
      : Number(value) || 0;

    let start = 0;
    const startTime = performance.now();
    const durationMs = duration * 1000;

    let animationFrameId;

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease-out cubic curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (numericTarget - start) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}
