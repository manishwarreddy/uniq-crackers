import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Lighting the fireworks...',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center space-y-4',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
        <Sparkles className="w-6 h-6 text-amber-500 absolute animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 font-heading tracking-wide">
        {message}
      </p>
    </div>
  );
};
