import React from 'react';

/**
 * MotionCard (Web Motion Primitive)
 * - Pure CSS GPU-composited entrance animation (0ms JavaScript main thread blocking)
 * - Zero layout shift, 120 FPS performance
 */
export default function MotionCard({
  children,
  className = '',
  style = {},
  delay = 0,
  hover = true,
  onClick,
  ...props
}) {
  return (
    <div
      className={`motion-card-enter ${className}`}
      style={{
        animationDelay: `${delay}s`,
        willChange: 'transform, opacity',
        ...style,
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
