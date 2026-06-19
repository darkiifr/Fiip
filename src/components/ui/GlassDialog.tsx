import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './LiquidGlassPrimitive';

interface GlassDialogProps extends Dialog.DialogProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * GlassDialog - High-fidelity modal container.
 * Uses Radix UI Dialog primitives for accessibility (portal, focus trap, aria attributes).
 */
export function GlassDialog({ trigger, title, description, children, className, ...props }: GlassDialogProps) {
  return (
    <Dialog.Root {...props}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-overlayShow" 
        />
        
        <Dialog.Content 
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "glass rounded-3xl p-6 shadow-2xl animate-contentShow outline-none",
            className
          )}
        >
          <div className="flex items-center justify-between mb-4">
            {title && (
              <Dialog.Title className="text-xl font-sora font-semibold text-white">
                {title}
              </Dialog.Title>
            )}
            <Dialog.Close asChild>
              <button 
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className="text-sm text-gray-400 mb-6 leading-relaxed">
              {description}
            </Dialog.Description>
          )}

          <div className="relative">
            {children}
          </div>
          
          {/* Subtle specular line for that macOS 26 look */}
          <div className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const DialogClose = Dialog.Close;
export const DialogTitle = Dialog.Title;
export const DialogDescription = Dialog.Description;
