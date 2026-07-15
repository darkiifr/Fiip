import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/45',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[color:var(--accent)] text-white',
        secondary: 'border-white/10 bg-white/[0.08] text-[color:var(--text-primary)]',
        destructive: 'border-transparent bg-[color:var(--destructive)] text-white',
        outline: 'border-white/12 text-[color:var(--text-secondary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
