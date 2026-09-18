import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  requiredStar?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, requiredStar, className, id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-slate-700">
            {label}
            {requiredStar && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={twMerge(
            clsx(
              'w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg px-3.5 py-2.5 transition-all placeholder:text-slate-400',
              'focus:outline-none focus:border-crm-primary focus:ring-2 focus:ring-blue-100',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
              props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
