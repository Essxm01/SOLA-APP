import React, { useEffect, useState } from 'react';

// KONFRM Customer Splash — Screen 01 (Phase 5 / C1).
//
// Brand recognition only: white canvas, KONFRM mark + wordmark, one restrained
// yellow signature accent. No progress percentage, no carousel, no data
// dependency. The transition is a fixed short timer (deterministic), never
// tied to Explore API success. Motion is disabled under
// prefers-reduced-motion via CSS (see .customer-splash-* in index.css).

const SPLASH_DURATION_MS = 1200;

export const CustomerSplashScreen: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const [leaving, setLeaving] = useState(false);
  const onFinishedRef = React.useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const fadeAt = window.setTimeout(() => setLeaving(true), SPLASH_DURATION_MS - 180);
    const finishAt = window.setTimeout(() => onFinishedRef.current(), SPLASH_DURATION_MS);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(finishAt);
    };
  }, []);

  return (
    <div
      dir="rtl"
      role="status"
      aria-label="كونفرم"
      className={`fixed inset-0 z-[90] bg-white flex flex-col items-center justify-center customer-splash-fade ${
        leaving ? 'customer-splash-leaving' : ''
      }`}
    >
      {/* Brand mark with restrained yellow signature accent */}
      <div className="customer-splash-logo relative flex items-center justify-center mb-5">
        <svg
          width="88"
          height="88"
          viewBox="0 0 88 88"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Rounded brand tile */}
          <rect x="6" y="6" width="76" height="76" rx="22" fill="#0059FF" />
          {/* Stylized coastal check — KONFRM confirmation mark */}
          <path
            d="M26 45.5 38.5 58 62 32"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Single yellow signature accent */}
          <circle cx="62" cy="26" r="5.5" fill="#FFD700" />
        </svg>
      </div>

      {/* Wordmark */}
      <h1 className="customer-splash-logo text-[34px] leading-none font-extrabold text-[#0F172A] tracking-tight select-none" style={{ fontFamily: "'Cairo', sans-serif" }}>
        KONFRM
      </h1>
      <p className="customer-splash-logo mt-2 text-sm font-bold text-[#475569] select-none">كونفرم</p>
    </div>
  );
};
