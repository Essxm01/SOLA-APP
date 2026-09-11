import React from 'react';

// KONFRM Customer Welcome — Screen 02 (Phase 5 / C1).
//
// Real-device responsive mobile layout:
// Content-aware adaptive height sizing based on available viewport (100dvh).
// Prevents unnecessary vertical scrolling on real mobile devices (e.g. Samsung
// Galaxy A56 with browser chrome) while keeping all CTA touch targets >= 44px,
// all Arabic copy intact, and the licensed hero image cleanly proportioned without distortion.
//
// Legal links: approved Terms/Privacy content does not exist yet — no dead
// clickable controls are rendered (LEGAL_CONTENT_DEPENDENCY recorded for C6).

export interface CustomerWelcomeScreenProps {
  onGuestBrowse: () => void;
  onLogin: () => void;
  onCreateAccount: () => void;
}

export const CustomerWelcomeScreen: React.FC<CustomerWelcomeScreenProps> = ({
  onGuestBrowse,
  onLogin,
  onCreateAccount,
}) => {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[80] bg-white overflow-y-auto overflow-x-hidden flex flex-col justify-between"
      style={{
        minHeight: '100dvh',
        height: '100dvh',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
      }}
      role="main"
      aria-label="مرحبًا بك في كونفرم"
    >
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between min-h-0">
        {/* Top visual hero — full-width, dominant hospitality anchor.
            The lower part dissolves smoothly via a multi-stop eased white gradient
            into the pure white content background, eliminating any hard boundary. */}
        <div
          className="w-full relative shrink-0 overflow-hidden"
          style={{
            height: 'clamp(200px, 38dvh, 360px)',
          }}
        >
          <img
            src="/welcome-hero.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />

          {/* Smooth photographic blend: gradual fade from transparent to pure white */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '40%',
              background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 20%, rgba(255, 255, 255, 0.18) 40%, rgba(255, 255, 255, 0.40) 60%, rgba(255, 255, 255, 0.70) 78%, rgba(255, 255, 255, 0.92) 88%, #ffffff 96%, #ffffff 100%)',
            }}
          />

          {/* Top bar: Skip — free text over hero, >=44px tap target, no button styling */}
          <button
            onClick={onGuestBrowse}
            className="absolute z-10 min-h-[44px] min-w-[44px] px-3 py-2 text-white text-sm sm:text-base font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] hover:opacity-90 active:opacity-75 transition-opacity flex items-center justify-center focus:outline-none"
            style={{
              top: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)',
              right: '16px',
            }}
            aria-label="تخطي والتصفح كضيف"
          >
            تخطي
          </button>
        </div>

        {/* Middle content: Brand mark + headline + truthful copy */}
        <div className="shrink-0 flex flex-col justify-center">
          {/* Logo lockup */}
          <div className="px-5 pt-1.5 sm:pt-3 flex items-center gap-2">
            <img
              src="/konfrm-mark.svg"
              alt=""
              aria-hidden="true"
              width="28"
              height="28"
              className="w-7 h-7 object-contain"
            />
            <span className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight">KONFRM</span>
            <span className="text-xs sm:text-sm font-bold text-[#64748B]">كونفرم</span>
          </div>

          {/* Headline + support copy */}
          <div className="px-5 pt-1 sm:pt-2">
            <h1 className="text-[20px] sm:text-[24px] leading-snug font-extrabold text-[#0F172A]">
              اكتشف إقامتك المثالية على الساحل
            </h1>
            <p className="mt-1 sm:mt-1.5 text-[14px] leading-[1.65] font-medium text-[#475569]">
              أسعار حقيقية وتواريخ متاحة بوضوح، وطلب حجز يروح للمالك الأول قبل أي دفع.
              تقدر تتصفح دلوقتي كضيف — والحساب يشتغل وقت ما تحتاجه.
            </p>
          </div>
        </div>

        {/* Bottom actions — all >=44px, prioritized for immediate reachability */}
        <div className="px-5 pt-2 pb-6 sm:pt-3 flex flex-col gap-2 sm:gap-2.5 customer-welcome-stagger shrink-0">
          <button
            onClick={onCreateAccount}
            className="w-full min-h-[48px] sm:min-h-[52px] rounded-2xl bg-[#0059FF] text-white text-[15px] sm:text-base font-extrabold
                       hover:bg-[#0046CC] transition-colors active:scale-[0.99]
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/25 flex items-center justify-center"
          >
            إنشاء حساب
          </button>
          <button
            onClick={onLogin}
            className="w-full min-h-[46px] sm:min-h-[50px] rounded-2xl bg-white border-2 border-[#0059FF] text-[#0059FF]
                       text-[15px] sm:text-base font-extrabold hover:bg-[#EAF1FF] transition-colors active:scale-[0.99]
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/15 flex items-center justify-center"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={onGuestBrowse}
            className="w-full min-h-[44px] rounded-2xl text-[#0F172A] text-sm sm:text-[15px] font-bold
                       hover:bg-[#F8FAFC] active:opacity-75 transition-colors
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/15 flex items-center justify-center"
          >
            تصفح كضيف
          </button>
        </div>
        {/* LEGAL_CONTENT_DEPENDENCY (C6): no Terms/Privacy links until approved
            legal content exists — dead clickable controls are forbidden. */}
      </div>
    </div>
  );
};
