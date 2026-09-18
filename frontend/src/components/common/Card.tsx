import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'pastel-blue' | 'pastel-green' | 'pastel-orange' | 'pastel-purple' | 'pastel-red';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  noPadding = false,
  className,
  ...props
}) => {
  const baseStyles = 'rounded-xl transition-all';
  
  const variantStyles = {
    default: 'bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]',
    flat: 'bg-white border border-slate-100',
    'pastel-blue': 'bg-[#eff6ff] border border-[#dbeafe]',
    'pastel-green': 'bg-[#ecfdf5] border border-[#d1fae5]',
    'pastel-orange': 'bg-[#fff7ed] border border-[#ffedd5]',
    'pastel-purple': 'bg-[#f5f3ff] border border-[#ede9fe]',
    'pastel-red': 'bg-[#fff1f2] border border-[#ffe4e6]',
  };

  const paddingStyles = noPadding ? '' : 'p-5 sm:p-6';

  return (
    <div className={twMerge(clsx(baseStyles, variantStyles[variant], paddingStyles, className))} {...props}>
      {children}
    </div>
  );
};
