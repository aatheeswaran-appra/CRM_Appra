import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  growthText?: string;
  growthType?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  variant = 'blue',
  growthText,
  growthType = 'positive',
  className,
}) => {
  const variantStyles = {
    blue: {
      card: 'bg-[#eef6ff] border-[#dbeafe]',
      iconContainer: 'bg-[#dbeafe] text-[#1d4ed8]',
      title: 'text-slate-600',
    },
    green: {
      card: 'bg-[#ecfdf5] border-[#d1fae5]',
      iconContainer: 'bg-[#d1fae5] text-[#059669]',
      title: 'text-slate-600',
    },
    orange: {
      card: 'bg-[#fff7ed] border-[#ffedd5]',
      iconContainer: 'bg-[#ffedd5] text-[#d97706]',
      title: 'text-slate-600',
    },
    purple: {
      card: 'bg-[#f5f3ff] border-[#ede9fe]',
      iconContainer: 'bg-[#ede9fe] text-[#7c3aed]',
      title: 'text-slate-600',
    },
    red: {
      card: 'bg-[#fff1f2] border-[#ffe4e6]',
      iconContainer: 'bg-[#ffe4e6] text-[#e11d48]',
      title: 'text-slate-600',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={twMerge(
        clsx(
          'p-4 sm:p-5 rounded-xl border transition-all duration-200 hover:shadow-xs flex items-start justify-between gap-3',
          style.card,
          className
        )
      )}
    >
      <div className="flex flex-col justify-between h-full space-y-1">
        <span className={clsx('text-xs font-medium text-slate-500', style.title)}>
          {title}
        </span>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>
        {growthText && (
          <div className="flex items-center gap-1 text-[11px] font-semibold mt-1">
            {growthType === 'positive' && (
              <span className="text-[#059669] flex items-center gap-0.5">
                {growthText}
              </span>
            )}
            {growthType === 'negative' && (
              <span className="text-[#e11d48] flex items-center gap-0.5">
                {growthText}
              </span>
            )}
            {growthType === 'neutral' && (
              <span className="text-slate-500">{growthText}</span>
            )}
          </div>
        )}
      </div>

      <div className={clsx('p-2.5 rounded-lg shrink-0 flex items-center justify-center', style.iconContainer)}>
        {icon}
      </div>
    </div>
  );
};
