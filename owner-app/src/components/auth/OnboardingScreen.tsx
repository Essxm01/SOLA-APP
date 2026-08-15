import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Building2, CalendarCheck, MessageSquareCheck, ArrowLeft, ArrowRight } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <Building2 className="w-14 h-14 text-[#0059FF]" />,
      title: 'إدارة شاملة لوحداتك الساحلية',
      subtitle: 'اعرض شاليهاتك وفيلاتك في أجمل الوجهات المصرية مثل مراسي، الجونة، العين السخنة ورأس الحكمة بكل سهولة.',
      badge: 'إدارة الوحدات',
    },
    {
      icon: <CalendarCheck className="w-14 h-14 text-[#0059FF]" />,
      title: 'تحكّم كامل في الأسعار والتوفر',
      subtitle: 'استخدم التقويم المركزي لتحديد مواعيد التوفر وإدارة أسعار المواسم والعطلات الصيفية بلا تعارض.',
      badge: 'التقويم والأسعار',
    },
    {
      icon: <MessageSquareCheck className="w-14 h-14 text-[#0059FF]" />,
      title: 'استقبال الحجوزات والمحادثات المباشرة',
      subtitle: 'راجع طلبات الحجز والتعديل فوراً، وتواصل مع المستأجرين بأمان عبر شات Sola الداخلي.',
      badge: 'الحجوزات والدردشة',
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between p-6 dir-rtl">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pt-4">
        {currentSlide > 0 ? (
          <button
            onClick={prevSlide}
            className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowRight className="w-4 h-4" />
            <span>السابق</span>
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={onComplete}
          className="text-xs font-bold text-[#0059FF] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
        >
          تخطي
        </button>
      </div>

      {/* Main Slide Card */}
      <div className="flex flex-col items-center text-center my-auto px-2 animate-fade-in key={currentSlide}">
        <div className="w-28 h-28 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 shadow-inner relative">
          {slides[currentSlide].icon}
        </div>

        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full mb-3">
          {slides[currentSlide].badge}
        </span>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-3 leading-snug">
          {slides[currentSlide].title}
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
          {slides[currentSlide].subtitle}
        </p>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center gap-2 mt-8">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-8 bg-[#0059FF]' : 'w-2.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="w-full pb-6">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={nextSlide}
          icon={<ArrowLeft className="w-5 h-5" />}
          className="py-4 text-base font-bold shadow-lg shadow-blue-500/25"
        >
          {currentSlide === slides.length - 1 ? 'ابدأ الآن' : 'المتابعة'}
        </Button>
      </div>
    </div>
  );
};
