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

        {/* Editorial hospitality visual — licensed KONFRM welcome hero */}
        <div className="w-full h-[47vh] max-h-[48vh] min-h-[300px] shrink-0 px-4">
          <img
            src="/welcome-hero.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover rounded-3xl"
          />
        </div>

        {/* Logo lockup */}
        <div className="px-6 pt-5 flex items-center gap-2.5">
          <img
            src="/konfrm-mark.svg"
            alt=""
            aria-hidden="true"
            width="30"
            height="30"
            className="w-[30px] h-[30px] object-contain"
          />
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
