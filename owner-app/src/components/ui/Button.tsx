import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex min-h-11 items-center justify-center transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] [border-radius:var(--konfrm-radius-control)] [font-size:14px] [font-weight:700] [line-height:1.4] [--tw-ring-color:var(--konfrm-interaction-focus-ring)]';

  const variants = {
    primary:
      '[background:var(--konfrm-color-primary)] hover:[background:var(--konfrm-color-primary-hover)] [color:var(--konfrm-text-inverse)] [box-shadow:var(--konfrm-shadow-none)]',
    secondary:
      '[background:var(--konfrm-surface-secondary)] hover:[background:var(--konfrm-interaction-hover)] [color:var(--konfrm-text-primary)] [box-shadow:var(--konfrm-shadow-none)]',
    outline:
      '[border:1px_solid_var(--konfrm-border-default)] hover:[background:var(--konfrm-interaction-hover)] [background:var(--konfrm-surface-primary)] [color:var(--konfrm-text-primary)]',
    ghost:
      'bg-transparent hover:[background:var(--konfrm-interaction-hover)] [color:var(--konfrm-text-secondary)]',
    danger:
      '[background:var(--konfrm-semantic-danger-solid)] hover:opacity-90 [color:var(--konfrm-text-inverse)] [box-shadow:var(--konfrm-shadow-none)]',
  };

  const sizes = {
    sm: 'min-h-11 px-3 gap-1.5',
    md: 'min-h-12 px-4 gap-2',
    lg: 'min-h-14 px-6 gap-2.5',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
