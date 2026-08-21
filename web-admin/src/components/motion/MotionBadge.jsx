import React from 'react';
import { motion } from 'framer-motion';

/**
 * MotionBadge (Web Motion Primitive)
 * - Calm breathing pulse for live indicators, verified badges & real-time alerts
 * - 2.4s gentle rhythm with soft outer glow ring
 */
export default function MotionBadge({
  children,
  color = '#10B981',
  pulse = true,
  className = '',
  style = {},
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }} className={className}>
      {pulse && (
        <motion.span
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 999,
            backgroundColor: color,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}
