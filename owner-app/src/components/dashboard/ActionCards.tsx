import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  MessageSquare,
  Building,
  Wallet,
  Scale,
} from 'lucide-react';

export const ActionCards: React.FC = () => {
  const { metrics, openPendingBookings, setActiveTab } = useApp();

  return (
    <div className="space-y-3 dir-rtl text-right">
      {/* Primary Financial Metric Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-4 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[#FFD700]" />
            <span>المؤشرات المالية للحجوزات المؤكدة (EGP)</span>
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
            صافي المالك 💵
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs space-y-1">
            <span className="text-[10px] text-slate-300 block font-bold">أرباحك الصافية من العربون</span>
            <span className="text-lg font-black text-[#FFD700] font-mono">
              {metrics.totalConfirmedDepositsOwnerNet.toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block">بعد خصم عمولة Sola (20%)</span>
          </div>

          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs space-y-1">
            <span className="text-[10px] text-slate-300 block font-bold">المتبقي المتوقع عند الوصول</span>
            <span className="text-lg font-black text-white font-mono">
              {metrics.totalExpectedBalanceOnArrival.toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block">يُدفع لك شخصياً بعد المعاينة</span>
          </div>
        </div>
      </div>

      {/* Grid of Operational Action Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Disputes Card */}
        <div
          onClick={() => setActiveTab('disputes')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between h-24 ${
            metrics.openDisputesCount > 0
              ? 'bg-rose-50/80 border-rose-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">نزاعات عدم المطابقة</span>
            <Scale className={`w-4 h-4 ${metrics.openDisputesCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.openDisputesCount}
            </span>
            <span className="text-[10px] font-bold text-[#0059FF] hover:underline">
              مركز النزاعات ➔
            </span>
          </div>
        </div>

        {/* Pending Booking Requests Card */}
        <div
          onClick={openPendingBookings}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between h-24 ${
            metrics.newBookingRequestsCount > 0
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">طلبات حجز جديدة</span>
            <Clock className={`w-4 h-4 ${metrics.newBookingRequestsCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.newBookingRequestsCount}
            </span>
            <span className="text-[10px] font-bold text-[#0059FF] hover:underline">
              مراجعة الطلبات ➔
            </span>
          </div>
        </div>

        {/* Unread Messages Card */}
        <div
          onClick={() => setActiveTab('messages')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between h-24 ${
            metrics.unreadMessagesCount > 0
              ? 'bg-blue-50/80 border-blue-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">محادثات المستأجرين</span>
            <MessageSquare className={`w-4 h-4 ${metrics.unreadMessagesCount > 0 ? 'text-[#0059FF]' : 'text-slate-400'}`} />
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.unreadMessagesCount}
            </span>
            <span className="text-[10px] font-bold text-[#0059FF] hover:underline">
              فتح المحادثات ➔
            </span>
          </div>
        </div>

        {/* Units Under Review Card */}
        <div
          onClick={() => setActiveTab('properties')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between h-24"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">وحدات قيد المراجعة</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.underReviewPropertiesCount}
            </span>
            <span className="text-[10px] font-bold text-[#0059FF] hover:underline">
              عرض الوحدات ➔
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
