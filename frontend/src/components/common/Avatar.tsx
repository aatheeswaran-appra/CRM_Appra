import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials?: string;
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  name,
  src,
  size = 'md',
  bgColor,
  className,
  ...props
}) => {
  const getInitials = (n?: string) => {
    if (initials) return initials;
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  const defaultBg = bgColor || 'bg-blue-100 text-blue-700';

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={twMerge(clsx('rounded-full object-cover', sizeStyles[size], className))}
      />
    );
  }

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center rounded-full font-semibold select-none shrink-0',
          sizeStyles[size],
          defaultBg,
          className
        )
      )}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
};
