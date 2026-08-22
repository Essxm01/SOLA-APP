import React from 'react';

export const MobileContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-slate-100/70 flex justify-center dir-rtl">
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-md flex flex-col relative pb-20 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};

