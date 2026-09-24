import React from 'react';
import { cn } from '@/lib/utils';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageOpen className="w-12 h-12 text-amber-500/70" />,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 space-y-4',
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        {icon}
      </div>
      <div className="max-w-sm space-y-1.5">
        <h4 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
          {title}
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
