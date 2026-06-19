import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Root ───────────────────────────────────────────────────────────────────
const Accordion = AccordionPrimitive.Root;

// ─── Item ───────────────────────────────────────────────────────────────────
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      'border border-white/5 rounded-xl overflow-hidden mb-1.5',
      'last:mb-0',
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

// ─── Trigger ─────────────────────────────────────────────────────────────────
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between px-4 py-3',
        'text-sm font-semibold text-gray-200',
        'bg-white/[0.03] hover:bg-white/[0.06]',
        'transition-all duration-150 outline-none cursor-pointer',
        'focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-inset',
        '[&[data-state=open]>svg]:rotate-180',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        size={16}
        className="text-gray-400 shrink-0 transition-transform duration-200"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

// ─── Content ─────────────────────────────────────────────────────────────────
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      'overflow-hidden text-sm text-gray-400',
      'data-[state=open]:animate-accordion-down',
      'data-[state=closed]:animate-accordion-up',
      className
    )}
    {...props}
  >
    <div className="px-4 py-3 bg-black/10 border-t border-white/5">
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
