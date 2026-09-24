import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'info',
  title,
  children,
  ...props
}) => {
  const icons = {
    info: <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
  };

  const variantStyles = {
    info: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200',
    error: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 p-4 rounded-xl border text-sm',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="space-y-1">
        {title && <h5 className="font-semibold">{title}</h5>}
        <div className="text-xs sm:text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};
