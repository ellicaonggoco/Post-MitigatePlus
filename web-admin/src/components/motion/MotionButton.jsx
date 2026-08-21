import React from 'react';
import { motion } from 'framer-motion';

/**
 * MotionButton (Web Motion Primitive)
 * - Tactile spring feedback on click (scale: 0.96)
 * - Subtle hover elevation (scale: 1.015)
 * - Zero layout jump
 */
export default function MotionButton({
  children,
  onClick,
  className = '',
  style = {},
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.015 } : undefined}
      whileTap={!disabled ? { scale: 0.965 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      style={{ ...style, cursor: disabled ? 'not-allowed' : 'pointer' }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
