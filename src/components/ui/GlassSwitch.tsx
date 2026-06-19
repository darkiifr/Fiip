import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import { useFocusRing } from 'react-aria';
import { cn } from './LiquidGlassPrimitive';

interface GlassSwitchProps extends Switch.SwitchProps {
  label?: string;
  className?: string;
}

/**
 * GlassSwitch - macOS Style Switch.
 * Combines Radix UI's state management with React Aria's focus ring.
 */
export function GlassSwitch({ label, checked, onCheckedChange, disabled, className, ...props }: GlassSwitchProps) {
  const { isFocusVisible, focusProps } = useFocusRing();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && (
        <label className="text-sm font-medium text-white/70 select-none cursor-default">
          {label}
        </label>
      )}
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative h-6 w-11 cursor-default rounded-full transition-colors duration-200 outline-none",
          checked ? "bg-blue-600" : "bg-white/10",
          disabled && "opacity-50 cursor-not-allowed",
          isFocusVisible && "ring-2 ring-blue-500 ring-offset-2 ring-offset-sidebar-dark"
        )}
        {...focusProps}
        {...props}
      >
        <Switch.Thumb
          className={cn(
            "block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 will-change-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
            "flex items-center justify-center"
          )}
        >
          {/* Subtle inner reflection on the switch thumb */}
          <div className="h-4 w-4 rounded-full bg-linear-to-b from-white to-gray-200" />
        </Switch.Thumb>
      </Switch.Root>
    </div>
  );
}
