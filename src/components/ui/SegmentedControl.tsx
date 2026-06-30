import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}

const sizeConfig = {
  sm: { list: 'h-7 p-0.5 gap-0.5', item: 'px-2.5 py-0.5 text-[11px]' },
  md: { list: 'h-9 p-1 gap-0.5', item: 'px-3 py-1 text-[12px]' },
  lg: { list: 'h-11 p-1 gap-1', item: 'px-4 py-1.5 text-[13px]' },
};

/**
 * SegmentedControl — macOS 26 Liquid Glass style.
 * Accessible: ARIA radiogroup, keyboard arrow navigation, focus ring.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className,
  'aria-label': ariaLabel = 'Contrôle segmenté',
}: SegmentedControlProps<T>) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());

  // Animate indicator to active segment
  useEffect(() => {
    const btn = buttonRefs.current.get(value);
    const list = listRef.current;
    if (!btn || !list) return;

    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    setIndicatorStyle({
      left: btnRect.left - listRect.left,
      width: btnRect.width,
    });
  }, [value]);

  // Arrow key navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentValue: T) => {
      const enabledOptions = options.filter((o) => !o.disabled);
      const currentIdx = enabledOptions.findIndex((o) => o.value === currentValue);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = enabledOptions[(currentIdx + 1) % enabledOptions.length];
        onChange(next.value);
        buttonRefs.current.get(next.value)?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = enabledOptions[(currentIdx - 1 + enabledOptions.length) % enabledOptions.length];
        onChange(prev.value);
        buttonRefs.current.get(prev.value)?.focus();
      }
    },
    [options, onChange]
  );

  const sz = sizeConfig[size];

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center rounded-xl',
        /* Liquid Glass container */
        'bg-white/[0.06] border border-white/[0.08]',
        'shadow-[0_0_0_0.5px_rgba(255,255,255,0.06)_inset,0_2px_8px_rgba(0,0,0,0.2)]',
        fullWidth && 'w-full',
        sz.list,
        className
      )}
    >
      {/* Animated glass indicator */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute rounded-[9px] transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          /* Floating glass pill */
          'bg-white/[0.12] border border-white/[0.12]',
          'shadow-[0_0_0_0.5px_rgba(255,255,255,0.10)_inset,0_2px_8px_rgba(0,0,0,0.25)]',
          /* Vertical fill: subtract padding */
          'top-[var(--padding)] bottom-[var(--padding)]',
          size === 'sm' && '[--padding:2px]',
          size === 'md' && '[--padding:4px]',
          size === 'lg' && '[--padding:4px]',
        )}
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />

      {/* Segments */}
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) buttonRefs.current.set(opt.value, el);
            }}
            role="radio"
            aria-checked={isActive}
            aria-label={opt.ariaLabel ?? (typeof opt.label === 'string' ? opt.label : undefined)}
            disabled={opt.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !opt.disabled && onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, opt.value)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-[9px]',
              'font-semibold outline-none cursor-default select-none',
              'transition-colors duration-150',
              sz.item,
              fullWidth && 'flex-1',
              isActive ? 'text-white' : 'text-white/40 hover:text-white/70',
              opt.disabled && 'opacity-30 cursor-not-allowed',
              'focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent'
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
