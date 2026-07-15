import * as React from 'react';

import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-[18px] border border-white/12 bg-black/20 px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] shadow-inner outline-none transition-colors placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)]/60 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
