import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  dot = false,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    red: 'bg-rose-50 text-rose-700 border border-rose-100',
    orange: 'bg-amber-50 text-amber-700 border border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border border-purple-100',
    gray: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const dotStyles = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-rose-500',
    orange: 'bg-amber-500',
    purple: 'bg-purple-500',
    gray: 'bg-slate-400',
  };

  return (
    <span className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))} {...props}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
};
