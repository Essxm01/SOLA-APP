import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glass?: boolean;
  accentBorder?: 'blue' | 'yellow' | 'emerald' | 'rose' | 'amber' | 'sky';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  glass = false,
  accentBorder,
  ...props
}) => {
  const accentStyles = {
    blue: 'border-l-4 border-l-[#0059FF]',
    yellow: 'border-l-4 border-l-[#FFD700]',
    emerald: 'border-l-4 border-l-emerald-500',
    rose: 'border-l-4 border-l-rose-500',
    amber: 'border-l-4 border-l-amber-500',
    sky: 'border-l-4 border-l-sky-500',
  };

  const glassStyle = glass
    ? 'glass-panel'
    : 'bg-white border border-slate-200/80 shadow-xs';

  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-200 ${glassStyle} ${
        accentBorder ? accentStyles[accentBorder] : ''
      } ${
        hoverEffect
          ? 'hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
