import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45 disabled:pointer-events-none disabled:shadow-none disabled:saturate-75 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--accent)] text-white shadow-[0_10px_28px_rgba(0,122,255,.24)] hover:brightness-110 disabled:bg-white/[0.09] disabled:text-[color:var(--text-secondary)]',
        destructive: 'bg-[color:var(--destructive)] text-white shadow-[0_10px_28px_rgba(255,90,82,.2)] hover:brightness-110 disabled:bg-white/[0.09] disabled:text-[color:var(--text-secondary)]',
        outline: 'border border-white/12 bg-white/[0.055] text-[color:var(--text-primary)] hover:bg-white/[0.09] disabled:border-white/10 disabled:bg-white/[0.045] disabled:text-[color:var(--text-secondary)]',
        secondary: 'bg-white/[0.08] text-[color:var(--text-primary)] hover:bg-white/[0.12] disabled:bg-white/[0.055] disabled:text-[color:var(--text-secondary)]',
        ghost: 'text-[color:var(--text-secondary)] hover:bg-white/[0.08] hover:text-[color:var(--text-primary)] disabled:text-[color:var(--text-muted)]',
        link: 'text-[color:var(--accent)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
