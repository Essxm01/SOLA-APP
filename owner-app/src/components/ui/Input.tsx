import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-right">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-slate-800">
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
            className={`w-full py-3 text-slate-900 bg-white border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 placeholder:text-slate-400 text-sm ${
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

interface PhoneInputProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  label = 'رقم الهاتف (مصر)',
  error,
  ...props
}) => {
  // Strip non-digits for raw input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    onChange(val);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 text-right">
      {label && <label className="text-sm font-semibold text-slate-800">{label}</label>}

      <div
        className={`flex items-center bg-white border rounded-xl overflow-hidden transition-all duration-200 focus-within:ring-2 ${
          error
            ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-200'
            : 'border-slate-200 focus-within:border-[#0059FF] focus-within:ring-blue-100'
        }`}
      >
        {/* Egyptian Country Flag and Code */}
        <div className="flex items-center gap-1.5 px-3 py-3 bg-slate-50 border-l border-slate-200 text-slate-700 font-medium text-sm select-none dir-ltr">
          <span className="text-base" role="img" aria-label="Egypt Flag">
            🇪🇬
          </span>
          <span className="font-bold text-slate-900">+20</span>
        </div>

        <input
          type="tel"
          dir="ltr"
          placeholder="100 123 4567"
          value={value}
          onChange={handleInputChange}
          maxLength={11}
          className="w-full py-3 px-4 text-slate-900 text-left bg-transparent focus:outline-none text-base tracking-wide font-mono placeholder:text-slate-300 placeholder:font-sans"
          {...props}
        />
      </div>

      {error ? (
        <span className="text-xs font-medium text-rose-600">{error}</span>
      ) : (
        <span className="text-xs text-slate-500">أدخل رقم الهاتف المسجل لدى Sola (مثال: 01001234567)</span>
      )}
    </div>
  );
};
