import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type GlassVariant = 'default' | 'card' | 'prominent' | 'subtle';

interface LiquidGlassPrimitiveProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  interactive?: boolean;
}

/**
 * LiquidGlassPrimitive - The base layer for all macOS 26 style components.
 * Provides the characteristic blur, saturation, and subtle border.
 */
export const LiquidGlassPrimitive = React.forwardRef<HTMLDivElement, LiquidGlassPrimitiveProps>(({ 
  className, 
  variant = 'default', 
  interactive = false,
  children,
  ...props 
}, ref) => {
  const variants: Record<GlassVariant, string> = {
    default: 'glass',
    card: 'glass-card',
    prominent: 'bg-blue-600/80 backdrop-blur-3xl saturate-200 border-white/20 shadow-xl',
    subtle: 'bg-white/[0.03] backdrop-blur-lg border-white/[0.05]'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-300',
        variants[variant],
        interactive && 'hover:brightness-110 active:scale-[0.98] cursor-default select-none',
        className
      )}
      {...props}
    >
      {/* Specular top highlight */}
      <div className="absolute inset-x-2 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      
      {children}
      
      {/* Interactive Shine effect (optional via CSS or JS) */}
      {interactive && (
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-tr from-transparent via-white/5 to-white/10" />
      )}
    </div>
  );
});

LiquidGlassPrimitive.displayName = 'LiquidGlassPrimitive';
