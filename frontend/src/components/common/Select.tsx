import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: (SelectOption | string)[];
  error?: string;
  helperText?: string;
  requiredStar?: boolean;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, requiredStar, placeholder, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-slate-700">
            {label}
            {requiredStar && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full appearance-none bg-white border border-slate-200 text-slate-900 text-sm rounded-lg pl-3.5 pr-9 py-2.5 transition-all cursor-pointer',
                'focus:outline-none focus:border-crm-primary focus:ring-2 focus:ring-blue-100',
                error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
                props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
                className
              )
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-slate-400">
                {placeholder}
              </option>
            )}
            {options.map((option) => {
              const val = typeof option === 'string' ? option : option.value;
              const lbl = typeof option === 'string' ? option : option.label;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
          <div className="absolute right-3 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
