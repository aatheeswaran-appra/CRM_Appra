import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-3.5',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'animate-pulse bg-slate-200/70',
          variantStyles[variant],
          className
        )
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start justify-between gap-4 animate-pulse">
      <div className="space-y-2.5 flex-1">
        <Skeleton variant="text" className="w-24" />
        <Skeleton className="w-16 h-7 rounded-md" />
        <Skeleton variant="text" className="w-28 h-3" />
      </div>
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => {
  return (
    <div className={`w-full ${height} bg-slate-50/50 rounded-lg p-4 flex flex-col justify-between animate-pulse border border-slate-100`}>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-16 h-4" />
      </div>
      <div className="flex items-end justify-between gap-3 flex-1 px-4 pb-2">
        <Skeleton className="w-10 h-24 rounded-t" />
        <Skeleton className="w-10 h-36 rounded-t" />
        <Skeleton className="w-10 h-48 rounded-t" />
        <Skeleton className="w-10 h-32 rounded-t" />
        <Skeleton className="w-10 h-56 rounded-t" />
      </div>
    </div>
  );
};
