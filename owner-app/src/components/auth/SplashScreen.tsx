import React, { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timeoutId = window.setTimeout(onComplete, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [onComplete]);

  return (
    <main className="min-h-screen w-full bg-[var(--konfrm-surface-primary)] flex flex-col items-center justify-center px-6 text-center dir-rtl" aria-label="بداية تجربة كونفرم للمالك">
      <div className="owner-entry-reveal flex flex-col items-center gap-5">
        <img src="/LOGO.svg" alt="KONFRM / كونفرم" className="h-20 w-20 object-contain" />
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--konfrm-text-primary)]">KONFRM</h1>
          <p className="mt-1 text-base font-semibold text-[var(--konfrm-color-primary)]">كونفرم للمالك</p>
        </div>
        <span className="h-1.5 w-10 rounded-full bg-[var(--konfrm-color-accent)]" aria-hidden="true" />
      </div>
      <span className="sr-only">جارٍ بدء التجربة</span>
    </main>
  );
};
