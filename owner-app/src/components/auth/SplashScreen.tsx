import React from 'react';
import { Button } from '../ui/Button';
import { Palmtree, ShieldCheck, ArrowLeft } from 'lucide-react';

interface SplashScreenProps {
  onContinue: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onContinue }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0059FF] via-[#0046CC] to-slate-900 text-white flex flex-col justify-between p-6 relative overflow-hidden dir-rtl">
      {/* Background coastal ambient circles */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-72 h-72 bg-[#FFD700]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header branding */}
      <div className="flex items-center justify-between pt-8 z-10">
        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
          <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
          <span className="text-xs font-semibold tracking-wide">تطبيق المالك المعتمد</span>
        </div>
        <span className="text-xs text-white/70 font-mono">v1.0.0</span>
      </div>

      {/* Hero Center Branding */}
      <div className="flex flex-col items-center text-center z-10 my-auto py-12 animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl mb-6 relative group">
          <Palmtree className="w-12 h-12 text-[#FFD700] transform -rotate-12 drop-shadow-md group-hover:scale-110 transition-transform" />
          <div className="absolute -bottom-2 -right-2 bg-[#FFD700] text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-md shadow">
            OWNER
          </div>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight mb-2 font-sans">
          Sola <span className="text-[#FFD700] font-light">| Owner</span>
        </h1>
        <p className="text-sm text-blue-100 font-medium tracking-wide mb-6">
          Vacation Rentals Manager
        </p>

        <div className="max-w-xs bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-inner">
          <p className="text-xs text-blue-50 leading-relaxed font-normal">
            منصتك الذكية والمتكاملة لإدارة وإيجار وحداتك الساحلية في مصر (الساحل الشمالي، العين السخنة، الجونة، دهب، رأس الحكمة).
          </p>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="w-full z-10 pb-6 flex flex-col gap-4 animate-fade-in">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onContinue}
          icon={<ArrowLeft className="w-5 h-5" />}
          className="py-4 text-base font-bold shadow-xl shadow-yellow-500/20"
        >
          الدخول للتطبيق
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-white/60">
          <span>© 2026 Sola Vacation Rentals Egypt</span>
        </div>
      </div>
    </div>
  );
};
