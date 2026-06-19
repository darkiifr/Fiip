import React from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ShortcutKey = string;

interface ShortcutBadgeProps {
  keys: ShortcutKey[];
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const sizeMap = {
  xs: 'h-4 min-w-[16px] px-1 text-[9px] rounded-[4px]',
  sm: 'h-5 min-w-[20px] px-1.5 text-[10px] rounded-md',
  md: 'h-6 min-w-[24px] px-2 text-[11px] rounded-[7px]',
};

// Normalize common shortcut names to symbols
const normalizeKey = (key: string): string => {
  const map: Record<string, string> = {
    cmd: '⌘', command: '⌘', meta: '⌘',
    ctrl: '⌃', control: '⌃',
    alt: '⌥', option: '⌥',
    shift: '⇧',
    enter: '↵', return: '↵',
    backspace: '⌫', delete: '⌦',
    escape: 'Esc', esc: 'Esc',
    tab: '⇥',
    up: '↑', down: '↓', left: '←', right: '→',
    space: '␣',
  };
  return map[key.toLowerCase()] ?? key.toUpperCase();
};

/**
 * ShortcutBadge — renders keyboard shortcut keys in macOS 26 glass style.
 *
 * @example
 * <ShortcutBadge keys={['cmd', 'k']} />          // ⌘ K
 * <ShortcutBadge keys={['shift', 'enter']} />    // ⇧ ↵
 */
export function ShortcutBadge({ keys, size = 'sm', className }: ShortcutBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`Raccourci : ${keys.join(' + ')}`}
    >
      {keys.map((key, i) => (
        <kbd
          key={i}
          className={cn(
            'inline-flex items-center justify-center font-mono font-semibold',
            /* Liquid Glass key cap */
            'bg-white/[0.07] border border-white/[0.10]',
            'shadow-[0_1.5px_0_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.06)_inset]',
            'text-white/50',
            'select-none',
            sizeMap[size],
          )}
        >
          {normalizeKey(key)}
        </kbd>
      ))}
    </span>
  );
}

// ─── Inline usage helper ──────────────────────────────────────────────────────
interface ShortcutHintProps {
  label: string;
  keys: string[];
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * ShortcutHint — a label + shortcut badge pair for menu items / tooltips.
 *
 * @example
 * <ShortcutHint label="Nouvelle note" keys={['cmd', 'n']} />
 */
export function ShortcutHint({ label, keys, size = 'xs', className }: ShortcutHintProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span className="text-[13px] text-white/70 font-medium">{label}</span>
      <ShortcutBadge keys={keys} size={size} />
    </div>
  );
}
