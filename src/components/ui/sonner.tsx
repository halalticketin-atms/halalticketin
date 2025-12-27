'use client';

import { Toaster as SonnerToaster } from 'sonner';
import type { ToasterProps } from 'sonner';

/**
 * Custom Toaster component with Halal Ticketin branding.
 * 
 * Features:
 * - Islamic geometric-inspired styling
 * - Glassmorphism effects
 * - Dark mode support
 * - Mobile responsive
 */
export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'halal-toast group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          title: 'halal-toast-title group-[.toast]:text-sm group-[.toast]:font-semibold',
          description: 'halal-toast-description group-[.toast]:text-xs group-[.toast]:opacity-90',
          success: 'halal-toast-success group-[.toast]:bg-gradient-to-br group-[.toast]:from-emerald-600 group-[.toast]:to-emerald-500 group-[.toast]:text-white',
          error: 'halal-toast-error group-[.toast]:bg-red-500 group-[.toast]:text-white',
          warning: 'halal-toast-warning group-[.toast]:bg-amber-500 group-[.toast]:text-white',
          info: 'halal-toast-info group-[.toast]:bg-sky-500 group-[.toast]:text-white',
          loading: 'halal-toast-loading group-[.toast]:bg-gradient-to-br group-[.toast]:from-purple-600 group-[.toast]:to-purple-500 group-[.toast]:text-white',
          actionButton: 'halal-toast-action group-[.toast]:bg-gray-100 group-[.toast]:hover:bg-gray-200',
        },
      }}
      duration={4000}
      closeButton
      richColors={false}
      {...props}
    />
  );
}
