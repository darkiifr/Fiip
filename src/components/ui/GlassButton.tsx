import React, { useRef } from 'react';
import { useButton, useFocusRing, useHover, type AriaButtonProps } from 'react-aria';
import { cn } from './LiquidGlassPrimitive';

interface GlassButtonProps extends AriaButtonProps {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  className?: string;
}

/**
 * GlassButton - A high-fidelity macOS 26 style button.
 * Integrates React Aria for robust interaction handling and accessibility.
 */
export function GlassButton(props: GlassButtonProps) {
  const { 
    children, 
    variant = 'default', 
    className,
    isDisabled,
  } = props;
  
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps, isPressed } = useButton({
    ...props,
    elementType: 'button'
  }, ref);

  const { isFocusVisible, focusProps } = useFocusRing();
  const { hoverProps, isHovered } = useHover(props);

  const variants = {
    default: 'glass border-white/10 hover:border-white/20 text-white/90',
    primary: 'bg-blue-600 border border-blue-400/30 text-white shadow-[0_8px_20px_-4px_rgba(59,130,246,0.4)]',
    ghost: 'hover:bg-white/5 text-white/50 hover:text-white border border-transparent hover:border-white/10',
    danger: 'bg-red-500/90 border border-red-400/30 text-white shadow-[0_8px_20px_-4px_rgba(239,68,68,0.4)]'
  };

  return (
    <button
      {...buttonProps}
      {...focusProps}
      {...hoverProps}
      ref={ref}
      className={cn(
        'relative px-5 py-2.5 rounded-xl font-sora text-sm font-semibold transition-all duration-300 ease-out outline-none flex items-center justify-center gap-2 tracking-wide uppercase',
        variants[variant],
        isHovered && 'brightness-110 -translate-y-0.5 shadow-md shadow-black/10',
        isPressed && 'scale-97 brightness-95 shadow-inner',
        isFocusVisible && 'ring-2 ring-blue-500/50',
        isDisabled && 'opacity-50 cursor-not-allowed filter grayscale',
        className
      )}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent opacity-50" />
        {isHovered && (
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
        )}
      </div>

      {/* Top Highlight Line */}
      <div className="absolute inset-x-3 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}
