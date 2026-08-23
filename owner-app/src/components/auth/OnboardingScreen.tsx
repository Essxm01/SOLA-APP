import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, ClipboardCheck, WalletCards } from 'lucide-react';
import { getOwnerOnboardingSwipeAction } from '../../utils/ownerFirstRun';
import { Button } from '../ui/Button';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: ClipboardCheck,
    title: 'طلبات الحجز تحت سيطرتك',
    subtitle: 'راجع طلبات الحجز واتخذ قرار القبول أو الرفض قبل أن ينتقل الحجز للخطوة التالية.',
  },
  {
    icon: Building2,
    title: 'وحداتك في مكان واحد',
    subtitle: 'أضف وحداتك وتابع حالتها والحجوزات المرتبطة بها بسهولة.',
  },
  {
    icon: WalletCards,
    title: 'فلوسك واضحة',
    subtitle: 'تابع رصيدك المعلق والمتاح للسحب وتفاصيل العربون المرتبطة بحجوزاتك.',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const gestureStartX = useRef<number | null>(null);
  const slide = slides[currentSlide];
  const Icon = slide.icon;

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((current) => current + 1);
      return;
    }
    onComplete();
  };

  const previousSlide = () => {
    if (currentSlide > 0) setCurrentSlide((current) => current - 1);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    gestureStartX.current = event.clientX;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gestureStartX.current === null) return;
    const action = getOwnerOnboardingSwipeAction(event.clientX - gestureStartX.current);
    gestureStartX.current = null;
    if (action === 'NEXT') nextSlide();
    if (action === 'PREVIOUS') previousSlide();
  };

  return (
    <main className="min-h-screen w-full bg-[var(--konfrm-surface-canvas)] flex flex-col justify-between px-6 py-8 dir-rtl">
      <div className="flex min-h-11 items-center justify-between">
        {currentSlide > 0 ? (
          <button
            type="button"
            onClick={previousSlide}
            className="inline-flex min-h-11 items-center gap-1 rounded-[var(--konfrm-radius-control)] text-sm font-semibold text-[var(--konfrm-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--konfrm-interaction-focus-ring)]"
          >
            <ArrowRight className="h-4 w-4" />
            <span>السابق</span>
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={onComplete}
          className="min-h-11 rounded-[var(--konfrm-radius-control)] px-3 text-sm font-bold text-[var(--konfrm-color-primary)] hover:bg-[var(--konfrm-interaction-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--konfrm-interaction-focus-ring)]"
        >
          تخطي
        </button>
      </div>

      <div
        className="owner-entry-reveal touch-pan-y flex flex-col items-center px-2 text-center"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { gestureStartX.current = null; }}
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-color-primary-soft)] text-[var(--konfrm-color-primary)]">
          <Icon className="h-12 w-12" aria-hidden="true" />
        </div>
        <h1 className="text-balance mb-3 text-2xl font-extrabold leading-snug text-[var(--konfrm-text-primary)]">{slide.title}</h1>
        <p className="max-w-sm text-base leading-7 text-[var(--konfrm-text-secondary)]">{slide.subtitle}</p>

        <div className="mt-8 flex items-center gap-2" aria-label={`الخطوة ${currentSlide + 1} من ${slides.length}`}>
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`الانتقال إلى الخطوة ${index + 1}`}
              aria-current={index === currentSlide ? 'step' : undefined}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--konfrm-radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--konfrm-interaction-focus-ring)]"
            >
              <span className={`h-2.5 rounded-full transition-[width,background-color] duration-200 ${index === currentSlide ? 'w-7 bg-[var(--konfrm-color-primary)]' : 'w-2.5 bg-[var(--konfrm-border-strong)]'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="w-full pb-2">
        <Button type="button" variant="primary" size="lg" fullWidth onClick={nextSlide} icon={<ArrowLeft className="h-5 w-5" />} className="min-h-12 py-3 text-base font-bold">
          {currentSlide === slides.length - 1 ? 'ابدأ الآن' : 'المتابعة'}
        </Button>
      </div>
    </main>
  );
};
