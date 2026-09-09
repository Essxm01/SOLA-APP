import React from 'react';

// KONFRM Customer Welcome — Screen 02 (Phase 5 / C1).
//
// ONE coherent first-entry screen (supersedes the older three-slide onboarding
// model per the Customer Master UX PRD v2). Arabic-first RTL, white-dominant,
// restrained KONFRM brand artwork (never stock/AI property photography), and
// an obvious Guest Browse action.
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
      className="fixed inset-0 z-[80] bg-white overflow-y-auto flex flex-col"
      role="main"
      aria-label="مرحبًا بك في كونفرم"
    >
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-full">
        {/* Skip — explicit exit, 44px+ target */}
        <div className="flex justify-start px-4 pt-3">
          <button
            onClick={onGuestBrowse}
            className="min-h-[44px] min-w-[44px] px-4 rounded-2xl text-sm font-bold text-[#475569] hover:bg-[#F1F5F9] transition-colors flex items-center"
            aria-label="تخطي والتصفح كضيف"
          >
            تخطي
          </button>
        </div>

        {/* Editorial brand artwork — restrained KONFRM coastal abstraction.
            Deliberately NOT a property photograph: no fake listing media. */}
        <div className="w-full h-[47vh] max-h-[48vh] min-h-[300px] shrink-0 px-4">
          <svg
            viewBox="0 0 360 270"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="360" height="270" rx="24" fill="#EAF1FF" />
            {/* sun — the single yellow signature accent */}
            <circle cx="292" cy="64" r="30" fill="#FFD700" />
            <circle cx="292" cy="64" r="30" fill="none" stroke="#0059FF" strokeOpacity="0.25" strokeWidth="2" />
            {/* horizon + sea */}
            <rect x="0" y="120" width="360" height="150" fill="#0059FF" fillOpacity="0.08" />
            <path d="M0 150 Q 45 138 90 150 T 180 150 T 270 150 T 360 150 V270 H0 Z" fill="#0059FF" fillOpacity="0.16" />
            <path d="M0 180 Q 45 168 90 180 T 180 180 T 270 180 T 360 180 V270 H0 Z" fill="#0059FF" fillOpacity="0.26" />
            <path d="M0 214 Q 45 202 90 214 T 180 214 T 270 214 T 360 214 V270 H0 Z" fill="#0059FF" fillOpacity="0.4" />
            {/* coastline umbrella — hospitality without a fake property */}
            <g>
              <path d="M96 196 a44 44 0 0 1 88 0 Z" fill="#FFFFFF" />
              <path d="M96 196 a44 44 0 0 1 44 -44 v44 Z" fill="#0059FF" fillOpacity="0.85" />
              <path d="M140 196 a44 44 0 0 1 44 0 Z" fill="#FFFFFF" />
              <rect x="138" y="196" width="4" height="42" rx="2" fill="#0F172A" fillOpacity="0.7" />
              <rect x="86" y="236" width="108" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.8" />
            </g>
            {/* small blue boat accent */}
            <path d="M246 224 q10 12 24 0 z" fill="#0059FF" />
            <rect x="255" y="210" width="3" height="14" rx="1.5" fill="#0059FF" />
          </svg>
        </div>

        {/* Logo lockup */}
        <div className="px-6 pt-5 flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 88 88" fill="none" aria-hidden="true">
            <rect x="6" y="6" width="76" height="76" rx="22" fill="#0059FF" />
            <path d="M26 45.5 38.5 58 62 32" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="62" cy="26" r="5.5" fill="#FFD700" />
          </svg>
          <span className="text-lg font-extrabold text-[#0F172A]">KONFRM</span>
          <span className="text-sm font-bold text-[#64748B]">كونفرم</span>
        </div>

        {/* Headline + support copy */}
        <div className="px-6 pt-3">
          <h1 className="text-[26px] leading-snug font-extrabold text-[#0F172A]">
            اكتشف إقامتك المثالية على الساحل
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed font-medium text-[#475569]">
            أسعار حقيقية وتواريخ متاحة بوضوح، وطلب حجز يروح للمالك الأول قبل أي دفع.
            تقدر تتصفح دلوقتي كضيف — والحساب يشتغل وقت ما تحتاجه.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pt-6 pb-4 mt-auto flex flex-col gap-3 customer-welcome-stagger">
          <button
            onClick={onCreateAccount}
            className="w-full min-h-[56px] rounded-2xl bg-[#0059FF] text-white text-base font-extrabold
                       hover:bg-[#0046CC] transition-colors active:scale-[0.99]
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/25"
          >
            إنشاء حساب
          </button>
          <button
            onClick={onLogin}
            className="w-full min-h-[52px] rounded-2xl bg-white border-2 border-[#0059FF] text-[#0059FF]
                       text-base font-extrabold hover:bg-[#EAF1FF] transition-colors active:scale-[0.99]
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/15"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={onGuestBrowse}
            className="w-full min-h-[48px] rounded-2xl text-[#0059FF] text-[15px] font-extrabold underline
                       decoration-2 underline-offset-[6px] hover:bg-[#F1F5F9] transition-colors
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/15"
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
