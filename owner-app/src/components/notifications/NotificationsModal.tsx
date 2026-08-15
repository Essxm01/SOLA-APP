import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BottomSheet } from '../ui/BottomSheet';
import {
  Bell,
  Calendar,
  MessageSquare,
  Sparkles,
  Wallet,
  Scale,
  AlertTriangle,
  CheckCheck,
  ChevronLeft,
} from 'lucide-react';

export const NotificationsModal: React.FC = () => {
  const {
    isNotificationsOpen,
    setIsNotificationsOpen,
    notifications,
    markAllNotificationsAsRead,
    handleNotificationClick,
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    if (type.startsWith('DISPUTE')) {
      return <Scale className="w-5 h-5 text-rose-600" />;
    }
    if (type.startsWith('DEPOSIT') || type.startsWith('REFUND') || type.startsWith('BOOKING_FINANCIALLY')) {
      return <Wallet className="w-5 h-5 text-emerald-600" />;
    }
    if (type.startsWith('BOOKING_MODIFICATION')) {
      return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
    if (type.startsWith('CANCELLATION')) {
      return <AlertTriangle className="w-5 h-5 text-rose-500" />;
    }
    if (type.startsWith('BOOKING')) {
      return <Calendar className="w-5 h-5 text-[#0059FF]" />;
    }
    if (type === 'CHAT') {
      return <MessageSquare className="w-5 h-5 text-purple-500" />;
    }
    return <Bell className="w-5 h-5 text-slate-500" />;
  };

  return (
    <BottomSheet
      isOpen={isNotificationsOpen}
      onClose={() => setIsNotificationsOpen(false)}
      title="مركز الإشعارات والتنبيهات 🔔"
    >
      <div className="space-y-3 dir-rtl text-right">
        {/* Actions & Filters Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-white text-[#0059FF] font-bold shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === 'unread'
                  ? 'bg-white text-[#0059FF] font-bold shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              غير مقروءة ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="text-[#0059FF] font-bold hover:underline flex items-center gap-1 text-[11px]"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تعليم الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Notifications Stream */}
        {filteredNotifs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 hover:shadow-xs ${
                  n.isRead
                    ? 'bg-white border-slate-200'
                    : 'bg-blue-50/60 border-blue-300 shadow-xs'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-white shadow-xs border border-slate-100 shrink-0">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {n.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-[#0059FF] font-bold flex items-center gap-0.5">
                      عرض التفاصيل <ChevronLeft className="w-3 h-3" />
                    </span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#0059FF]" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
