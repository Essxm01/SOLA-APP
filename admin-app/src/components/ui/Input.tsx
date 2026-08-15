import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-right dir-rtl">
        {label && (
          <label htmlFor={inputId} className="text-xs sm:text-sm font-semibold text-slate-800">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full py-2.5 text-slate-900 bg-white border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 placeholder:text-slate-400 text-xs sm:text-sm ${
              icon ? 'pr-11 pl-4' : 'px-4'
            } ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-200 focus:border-[#0059FF] focus:ring-blue-100'
            } ${className}`}
            {...props}
          />
        </div>

        {error ? (
          <span className="text-xs font-medium text-rose-600">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-slate-500">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, icon, className = '', children, id, ...props }, ref) => {
    const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-right dir-rtl">
        {label && (
          <label htmlFor={selectId} className="text-xs sm:text-sm font-semibold text-slate-800">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}

          <select
            id={selectId}
            ref={ref}
            className={`w-full py-2.5 text-slate-900 bg-white border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 font-bold text-xs sm:text-sm ${
              icon ? 'pr-11 pl-4' : 'px-4'
            } ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-200 focus:border-[#0059FF] focus:ring-blue-100'
            } ${className}`}
            {...props}
          >
            {children}
          </select>
        </div>

        {error ? (
          <span className="text-xs font-medium text-rose-600">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-slate-500">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
