import React from 'react';
import { useApp } from '../../context/AppContext';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

export const MobileContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { deviceViewMode, setDeviceViewMode } = useApp();

  if (deviceViewMode === 'full-screen') {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex justify-center">
        {/* Device Switcher Floating Bar */}
        <div className="fixed top-3 left-3 z-50 bg-white/95 text-slate-800 px-3.5 py-2 rounded-2xl backdrop-blur-md flex items-center gap-2 text-xs font-extrabold shadow-lg border border-slate-200 dir-rtl">
          <button
            onClick={() => setDeviceViewMode('mobile-frame')}
            className="flex items-center gap-1.5 text-[#0059FF] hover:text-blue-700 transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-[#F59E0B]" />
            <span>عرض إطار الهاتف (Mobile View)</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-20">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 flex flex-col items-center justify-center p-2 sm:p-6 dir-rtl select-none">
      {/* Device Switcher Header Control */}
      <div className="mb-4 flex items-center justify-between w-full max-w-md bg-white/95 text-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-md text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-slate-900">Sola Owner App — Mobile Simulator</span>
        </div>
        <button
          onClick={() => setDeviceViewMode('full-screen')}
          className="flex items-center gap-1.5 text-[#0059FF] hover:text-blue-700 font-extrabold cursor-pointer"
        >
          <Monitor className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>ملء الشاشة</span>
        </button>
      </div>

      {/* Phone Shell — Crisp Light Titanium Frame */}
      <div className="relative w-full max-w-[410px] h-[840px] bg-white rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,89,255,0.18)] ring-1 ring-slate-200/90 flex flex-col overflow-hidden">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full z-50 flex items-center justify-end px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 ring-1 ring-slate-700" />
        </div>

        {/* Status Bar */}
        <div className="w-full h-8 bg-white text-slate-800 flex items-center justify-between px-6 text-[11px] font-mono z-40 pt-1 shrink-0 border-b border-slate-100">
          <span className="font-extrabold text-slate-900">18:30</span>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Signal className="w-3 h-3 text-[#0059FF]" />
            <Wifi className="w-3 h-3 text-[#0059FF]" />
            <Battery className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
        </div>

        {/* Mobile Screen Content */}
        <div className="flex-1 bg-white overflow-y-auto rounded-[36px] relative pb-16 scrollbar-none">
          {children}
        </div>

        {/* Bottom Home Indicator Bar */}
        <div className="w-full h-4 bg-white flex items-center justify-center shrink-0 pt-1 border-t border-slate-100">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};
