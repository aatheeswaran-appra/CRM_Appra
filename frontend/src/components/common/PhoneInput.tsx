import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  requiredStar?: boolean;
  countryCode?: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, requiredStar, countryCode = '+91', className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700">
            {label}
            {requiredStar && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-crm-primary focus-within:ring-2 focus-within:ring-blue-100 transition-all overflow-hidden">
          {/* Country Code Pill */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 border-r border-slate-200 text-slate-700 text-sm font-medium shrink-0 select-none">
            {/* India Flag SVG */}
            <span className="inline-flex items-center justify-center w-5 h-3.5 rounded-sm overflow-hidden shadow-xs">
              <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
                <path fill="#f93" d="M0 0h640v160H0z"/>
                <path fill="#fff" d="M0 160h640v160H0z"/>
                <path fill="#128807" d="M0 320h640v160H0z"/>
                <circle cx="320" cy="240" r="40" fill="#008"/>
                <circle cx="320" cy="240" r="32" fill="#fff"/>
                <circle cx="320" cy="240" r="8" fill="#008"/>
              </svg>
            </span>
            <span className="text-xs text-slate-600 font-semibold">{countryCode}</span>
          </div>

          <input
            id={inputId}
            ref={ref}
            type="tel"
            className={twMerge(
              clsx(
                'w-full bg-white text-slate-900 text-sm px-3.5 py-2.5 placeholder:text-slate-400 focus:outline-none',
                error && 'border-red-500',
                props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
                className
              )
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
