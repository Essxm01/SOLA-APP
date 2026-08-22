import React from 'react';

export const MobileContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-slate-100/80 flex justify-center dir-rtl">
      <div 
        className="w-full min-h-screen bg-white shadow-md flex flex-col relative pb-20 overflow-x-hidden"
        style={{ maxWidth: '430px', margin: '0 auto' }}
      >
        {children}
      </div>
    </div>
  );
};

