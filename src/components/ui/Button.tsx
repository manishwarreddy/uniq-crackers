import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'festive' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'festive',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5',
      md: 'px-4 py-2.5 text-sm font-semibold gap-2',
      lg: 'px-6 py-3.5 text-base font-bold gap-2.5',
    };

    const variantStyles = {
      festive:
        'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-md hover:shadow-festive hover:brightness-105 focus:ring-amber-400 border border-amber-400/30',
      primary:
        'bg-festive-deepNavy text-white hover:bg-slate-800 focus:ring-slate-400 shadow-sm border border-slate-700',
      secondary:
        'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-slate-300',
      outline:
        'border-2 border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 focus:ring-amber-400',
      ghost:
        'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 shadow-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
