import React from 'react';
import { cn } from './LiquidGlassPrimitive';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

/**
 * GlassInput - macOS 26 style input with glass background and focus effects.
 */
export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, icon, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white",
              "placeholder:text-white/20 outline-none transition-all duration-300",
              "focus:bg-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10",
              icon && "pl-10",
              error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[10px] text-red-400 font-medium ml-1 animate-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
