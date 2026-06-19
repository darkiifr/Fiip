import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnimatedCounterProps {
  value: number;
  duration?: number; // ms
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatValue?: (v: number) => string;
  'aria-label'?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * AnimatedCounter — smoothly animates from the previous value to a new value.
 * Respects prefers-reduced-motion. Accessible via aria-live.
 */
export function AnimatedCounter({
  value,
  duration = 800,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  formatValue,
  'aria-label': ariaLabel,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  // Respect prefers-reduced-motion
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) {
      fromRef.current = value;
      setDisplayValue(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    const diff = to - from;

    if (diff === 0) return;

    cancelAnimationFrame(rafRef.current!);
    startRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      setDisplayValue(from + diff * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to;
        setDisplayValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [value, duration, prefersReduced]);

  const formatted = formatValue
    ? formatValue(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={ariaLabel ?? `${prefix}${value.toFixed(decimals)}${suffix}`}
      aria-atomic="true"
      className={cn('tabular-nums', className)}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

// ─── Stat Card variant ────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  trend?: number; // percentage +/-
  icon?: React.ReactNode;
  decimals?: number;
  className?: string;
}

export function StatCard({ label, value, suffix, prefix, trend, icon, decimals = 0, className }: StatCardProps) {
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <div className={cn(
      'relative flex flex-col gap-2 p-4 rounded-2xl overflow-hidden',
      /* Liquid Glass */
      'bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl',
      'shadow-[0_0_0_0.5px_rgba(255,255,255,0.06)_inset,0_4px_16px_rgba(0,0,0,0.2)]',
      className
    )}>
      {/* Top specular */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
        {icon && <div className="text-white/25">{icon}</div>}
      </div>

      <div className="flex items-end gap-2">
        <AnimatedCounter
          value={value}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          className="text-[28px] font-bold text-white leading-none"
        />
        {trend !== undefined && (
          <span className={cn(
            'text-[11px] font-semibold mb-0.5 px-1.5 py-0.5 rounded-md',
            trendPositive
              ? 'text-green-400 bg-green-500/10'
              : 'text-red-400 bg-red-500/10'
          )}>
            {trendPositive ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
