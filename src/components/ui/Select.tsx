import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── macOS 26 Liquid Glass Select ────────────────────────────────────────────
const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

// ─── Trigger ─────────────────────────────────────────────────────────────────
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between gap-2 rounded-xl px-3 py-2',
      'text-[13px] font-medium text-warm-text-primary-light dark:text-white/90',
      'bg-white/80 dark:bg-white/7 border border-warm-border-light dark:border-white/8',
      'backdrop-blur-xl',
      'shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)_inset]',
      'transition-all duration-150 outline-none cursor-default',
      'hover:bg-warm-sidebar-item-active dark:hover:bg-white/11 hover:border-amber-500/25 dark:hover:border-white/13',
      'focus:bg-white dark:focus:bg-white/11 focus:border-amber-500/50',
      'focus:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)_inset,0_0_0_3px_rgba(59,130,246,0.25)]',
      'data-placeholder:text-warm-text-muted-light dark:data-placeholder:text-white/30',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={14} className="text-warm-text-muted-light dark:text-white/40 shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

// ─── ScrollUp/Down Buttons ────────────────────────────────────────────────────
const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1 text-warm-text-muted-light dark:text-white/40', className)}
    {...props}
  >
    <ChevronUp size={14} />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1 text-warm-text-muted-light dark:text-white/40', className)}
    {...props}
  >
    <ChevronDown size={14} />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

// ─── Content ─────────────────────────────────────────────────────────────────
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 min-w-32 overflow-hidden rounded-2xl',
        /* Liquid Glass */
        'bg-white/95 dark:bg-zinc-950/92 backdrop-blur-2xl',
        'border border-warm-border-light dark:border-white/8',
        'shadow-[0_0_0_0.5px_rgba(255,255,255,0.12)_inset,0_20px_60px_-12px_rgba(0,0,0,0.6),0_8px_20px_-4px_rgba(0,0,0,0.3)]',
        'animate-in fade-in-0 zoom-in-[0.97] duration-150',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97]',
        position === 'popper' && [
          'data-[side=bottom]:translate-y-1.5',
          'data-[side=top]:-translate-y-1.5',
          'data-[side=bottom]:slide-in-from-top-2',
          'data-[side=top]:slide-in-from-bottom-2',
        ],
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1.5',
          position === 'popper' && 'h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

// ─── Label ────────────────────────────────────────────────────────────────────
const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
      <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-warm-text-muted-light dark:text-white/30', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

// ─── Item ─────────────────────────────────────────────────────────────────────
const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center gap-2.5',
      'rounded-[10px] pl-8 pr-2.5 py-[5px]',
      'text-[13px] font-medium text-warm-text-primary-light dark:text-white/90',
      'outline-none transition-colors duration-75',
      'focus:bg-amber-500/10 dark:focus:bg-white/12 focus:text-warm-text-primary-light dark:focus:text-white',
      'data-disabled:pointer-events-none data-disabled:opacity-40',
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={12} strokeWidth={3} className="text-amber-500" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

// ─── Separator ───────────────────────────────────────────────────────────────
const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1.5 my-1.5 h-px bg-warm-border-light dark:bg-white/[0.07]', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
