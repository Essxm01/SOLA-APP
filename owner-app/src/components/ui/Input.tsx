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
          <label htmlFor={inputId} className="text-sm font-semibold" style={{ color: 'var(--konfrm-text-primary)' }}>
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--konfrm-text-muted)' }}>
              {icon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full py-3 border transition-all duration-200 focus:outline-none focus:ring-2 text-sm ${
              icon ? 'pr-11 pl-4' : 'px-4'
            } ${
              error
                ? '[border-color:var(--konfrm-semantic-danger-border)] [--tw-ring-color:var(--konfrm-semantic-danger-background)]'
                : '[border-color:var(--konfrm-border-default)] focus:[border-color:var(--konfrm-border-focus)] [--tw-ring-color:var(--konfrm-interaction-focus-ring)]'
            } ${className}`}
            style={{ color: 'var(--konfrm-text-primary)', background: 'var(--konfrm-surface-primary)', borderRadius: 'var(--konfrm-radius-control)' }} {...props}
          />
        </div>

        {error ? (
          <span className="text-xs font-medium" style={{ color: 'var(--konfrm-semantic-danger-text)' }}>{error}</span>
        ) : helperText ? (
          <span className="text-xs" style={{ color: 'var(--konfrm-text-muted)' }}>{helperText}</span>
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
      {label && <label className="text-sm font-semibold" style={{ color: 'var(--konfrm-text-primary)' }}>{label}</label>}

      <div
        className={`flex items-center border overflow-hidden transition-all duration-200 focus-within:ring-2 ${
          error
            ? '[border-color:var(--konfrm-semantic-danger-border)] [--tw-ring-color:var(--konfrm-semantic-danger-background)]'
            : '[border-color:var(--konfrm-border-default)] focus-within:[border-color:var(--konfrm-border-focus)] [--tw-ring-color:var(--konfrm-interaction-focus-ring)]'
        }`} style={{ background: 'var(--konfrm-surface-primary)', borderRadius: 'var(--konfrm-radius-control)' }}
      >
        {/* Egyptian Country Flag and Code */}
        <div className="flex items-center gap-1.5 px-3 py-3 border-l font-medium text-sm select-none dir-ltr" style={{ background: 'var(--konfrm-surface-secondary)', borderColor: 'var(--konfrm-border-default)', color: 'var(--konfrm-text-secondary)' }}>
          <span className="text-base" role="img" aria-label="Egypt Flag">
            🇪🇬
          </span>
          <span className="font-bold" style={{ color: 'var(--konfrm-text-primary)' }}>+20</span>
        </div>

        <input
          type="tel"
          dir="ltr"
          placeholder="100 123 4567"
          value={value}
          onChange={handleInputChange}
          maxLength={11}
          className="w-full py-3 px-4 text-left bg-transparent focus:outline-none text-base tracking-wide placeholder:font-sans"
          style={{ color: 'var(--konfrm-text-primary)' }}
          {...props}
        />
      </div>

      {error ? (
        <span className="text-xs font-medium" style={{ color: 'var(--konfrm-semantic-danger-text)' }}>{error}</span>
      ) : (
        <span className="text-xs" style={{ color: 'var(--konfrm-text-muted)' }}>أدخل رقم الهاتف المسجل لحساب المالك (مثال: 01001234567)</span>
      )}
    </div>
  );
};
