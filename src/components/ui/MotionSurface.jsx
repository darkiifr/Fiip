import { motion, useReducedMotion } from 'framer-motion';

export function MotionSurface({ children, className = '', ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
