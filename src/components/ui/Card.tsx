import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  festiveBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  festiveBorder = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl p-6 transition-all duration-200 border',
        festiveBorder
          ? 'border-amber-500/30 shadow-festive hover:border-amber-500/60'
          : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={cn(
        'font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return <div className={cn('pt-0', className)} {...props}>{children}</div>;
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('flex items-center pt-4 border-t border-slate-100 dark:border-slate-800', className)}
      {...props}
    >
      {children}
    </div>
  );
};
