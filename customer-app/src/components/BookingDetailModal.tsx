import React, { useCallback, useEffect, useState } from 'react';
import { Bath, BedDouble, CalendarDays, ChevronRight, ImageOff, MapPin, MessageSquare, RefreshCw, Send, Users, X } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { CustomerPaymentService } from '../services/customerPaymentService';

export interface CustomerBookingRecord {
  id: string;
  bookingNumber: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  locationName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  status: string;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  property?: {
    id: string;
    title: string;
    images: string[];
    address: string;
    region: string;
    resortName: string;
    locationName: string;
    description: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    pricePerNight: number;
    amenities: string[];
    houseRules: Record<string, unknown>;
  };
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'OWNER' | 'RENTER';
  text: string;
  timestamp: string;
}

const canChat = (status: string) => status === 'APPROVED_PENDING_PAYMENT' || status === 'CONFIRMED';

const statusLabel = (status: string) => ({
  PENDING_OWNER_APPROVAL: 'قيد مراجعة المالك',
  APPROVED_PENDING_PAYMENT: 'وافق المالك — العربون مطلوب',
  CONFIRMED: 'الحجز مؤكد',
  REJECTED: 'تم الرفض',
}[status] || status);

export const BookingDetailModal: React.FC<{
  bookingId: string;
  authToken: string;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}> = ({ bookingId, authToken, onClose, onPaymentSuccess }) => {
  const [booking, setBooking] = useState<CustomerBookingRecord | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl(`/customer/bookings/${bookingId}`), { headers: { Authorization: `Bearer ${authToken}` } });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data?.property || json.data.property.id !== json.data.propertyId) {
        throw new Error(json?.error?.message || 'تعذر تحميل تفاصيل الحجز والوحدة من الخادم');
      }
      setBooking(json.data);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل تفاصيل الحجز والوحدة من الخادم');
    } finally {
      setLoading(false);
    }
  }, [authToken, bookingId]);

  useEffect(() => { void fetchDetail(); }, [fetchDetail]);

  const loadMessages = useCallback(async (id: string) => {
    const res = await fetch(getApiUrl(`/customer/conversations/${id}/messages`), { headers: { Authorization: `Bearer ${authToken}` } });
    const json = await res.json();
    if (!res.ok || !json?.success || !Array.isArray(json.data)) throw new Error(json?.error?.message || 'تعذر تحميل الرسائل');
    setMessages(json.data);
  }, [authToken]);

  const openChat = async () => {
    if (!booking || !canChat(booking.status)) return;
    setChatLoading(true);
    setChatError('');
    try {
      const res = await fetch(getApiUrl(`/customer/bookings/${booking.id}/conversation`), { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data?.id) throw new Error(json?.error?.message || 'تعذر فتح المحادثة');
      setConversationId(json.data.id);
      await loadMessages(json.data.id);
    } catch (err: any) {
      setChatError(err?.message || 'تعذر فتح المحادثة');
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversationId || !messageText.trim()) return;
    const text = messageText.trim();
    setChatLoading(true);
    setChatError('');
    try {
      const res = await fetch(getApiUrl(`/customer/conversations/${conversationId}/messages`), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'تعذر إرسال الرسالة');
      setMessageText('');
      await loadMessages(conversationId);
    } catch (err: any) {
      setChatError(err?.message || 'تعذر إرسال الرسالة');
    } finally {
      setChatLoading(false);
    }
  };

  const completePrototypePayment = async () => {
    if (!booking || booking.status !== 'APPROVED_PENDING_PAYMENT') return;
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const idempotencyKey = `prototype_deposit_${booking.id}`;
      const initiated = await CustomerPaymentService.initiatePayment(booking.id, idempotencyKey, authToken);
      await CustomerPaymentService.completePrototypePayment(booking.id, initiated.paymentTransactionId, authToken);
      await fetchDetail();
      onPaymentSuccess?.();
      setPaymentSheetOpen(false);
      setPaymentSuccess('تم دفع العربون وتأكيد الحجز');
    } catch (err: any) {
      setPaymentError(err?.message || 'تعذر إتمام الدفع التجريبي، يمكنك المحاولة مرة أخرى');
    } finally {
      setPaymentLoading(false);
    }
  };

  const property = booking?.property;
  const images = property?.images?.filter(Boolean) || [];

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/45 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="bg-slate-50 w-full max-w-[430px] h-[94dvh] sm:h-[90vh] rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><X className="w-5 h-5" /></button>
          <div className="text-right"><p className="text-xs font-black text-slate-900">تفاصيل الحجز</p><p className="text-[10px] text-slate-500">رقم {booking?.bookingNumber || '—'}</p></div>
          <ChevronRight className="w-5 h-5 text-[#0059FF]" />
        </div>

        {loading ? <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-500">جاري تحميل التفاصيل...</div> : error ? (
          <div className="m-4 p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3"><p className="text-xs font-bold text-rose-900">{error}</p><button onClick={() => void fetchDetail()} className="inline-flex gap-1 items-center px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-black"><RefreshCw className="w-3.5 h-3.5" />إعادة المحاولة</button></div>
        ) : booking && property ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
            {conversationId ? (
              <section className="flex flex-col min-h-[calc(94dvh-84px)] -m-4 bg-slate-50">
                <div className="bg-white p-4 border-b border-slate-200"><p className="text-xs font-black text-slate-900">محادثة المالك</p><p className="text-[11px] text-slate-500 truncate">{property.title} · {booking.checkIn} ← {booking.checkOut}</p></div>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.length === 0 ? <div className="text-center py-14 text-sm text-slate-500 font-bold">ابدأ المحادثة</div> : messages.map((message) => <div key={message.id} className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${message.senderRole === 'RENTER' ? 'mr-auto bg-[#0059FF] text-white rounded-tr-sm' : 'ml-auto bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}><p>{message.text}</p><span className="block text-[9px] opacity-70 mt-1" dir="ltr">{new Date(message.timestamp).toLocaleString('ar-EG')}</span></div>)}
                  {chatError && <p className="text-xs text-rose-700 text-center">{chatError}</p>}
                </div>
                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2"><button disabled={chatLoading || !messageText.trim()} className="w-11 h-11 bg-[#0059FF] disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center"><Send className="w-4 h-4" /></button><input value={messageText} maxLength={2000} onChange={(e) => setMessageText(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1 min-w-0 rounded-xl bg-slate-100 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></form>
              </section>
            ) : <>
              <div className="rounded-2xl overflow-hidden bg-slate-200 h-52">{images[0] ? <img src={images[0]} alt={property.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2"><ImageOff className="w-8 h-8" /><span className="text-xs font-bold">لا توجد صور للوحدة</span></div>}</div>
              {images.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{images.slice(1).map((src) => <img key={src} src={src} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />)}</div>}
              <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2"><div className="flex justify-between gap-3"><h2 className="font-black text-slate-950">{property.title}</h2><span className="text-[10px] bg-blue-50 text-[#0059FF] font-black px-2 py-1 rounded-full h-fit">{statusLabel(booking.status)}</span></div><p className="text-xs text-slate-600 flex gap-1.5"><MapPin className="w-4 h-4 text-[#0059FF] shrink-0" />{[property.resortName, property.region, property.address].filter(Boolean).join(' — ') || 'الموقع غير مسجل'}</p>{property.description && <p className="text-xs text-slate-600 leading-relaxed pt-1">{property.description}</p>}</section>
              <section className="grid grid-cols-3 gap-2 text-center text-xs"><div className="bg-white rounded-xl border border-slate-200 py-3"><BedDouble className="w-4 h-4 mx-auto text-[#0059FF] mb-1" />{property.bedrooms} غرف</div><div className="bg-white rounded-xl border border-slate-200 py-3"><Bath className="w-4 h-4 mx-auto text-[#0059FF] mb-1" />{property.bathrooms} حمام</div><div className="bg-white rounded-xl border border-slate-200 py-3"><Users className="w-4 h-4 mx-auto text-[#0059FF] mb-1" />{property.maxGuests} ضيوف</div></section>
              <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs"><h3 className="font-black text-slate-900">معلومات الحجز</h3><div className="grid grid-cols-2 gap-2"><div className="bg-slate-50 p-2.5 rounded-xl"><CalendarDays className="w-4 h-4 text-[#0059FF] mb-1" /><p>الوصول</p><strong dir="ltr">{booking.checkIn}</strong></div><div className="bg-slate-50 p-2.5 rounded-xl"><CalendarDays className="w-4 h-4 text-[#0059FF] mb-1" /><p>المغادرة</p><strong dir="ltr">{booking.checkOut}</strong></div></div><div className="flex justify-between"><span>{booking.nights} ليالٍ · {booking.guestsCount} ضيوف</span><span>سعر الليلة {Number(property.pricePerNight).toLocaleString()} ج.م</span></div><div className="border-t pt-2 space-y-1"><div className="flex justify-between"><span>إجمالي الحجز</span><strong>{Number(booking.totalStay).toLocaleString()} ج.م</strong></div><div className="flex justify-between text-[#0059FF]"><span>العربون</span><strong>{Number(booking.depositAmount).toLocaleString()} ج.م</strong></div><div className="flex justify-between"><span>المتبقي</span><strong>{Number(booking.remainingAmount).toLocaleString()} ج.م</strong></div></div></section>
              {paymentSuccess && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-black text-center">{paymentSuccess}</div>}
              {booking.status === 'APPROVED_PENDING_PAYMENT' && <button onClick={() => { setPaymentError(''); setPaymentSheetOpen(true); }} className="w-full bg-[#0059FF] text-white min-h-12 rounded-xl font-black text-sm shadow-lg shadow-blue-500/20">دفع العربون {Number(booking.depositAmount).toLocaleString()} ج.م</button>}
              {canChat(booking.status) ? <button onClick={() => void openChat()} disabled={chatLoading} className="w-full bg-[#0059FF] text-white min-h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:bg-slate-300"><MessageSquare className="w-4 h-4" />{chatLoading ? 'جاري فتح المحادثة...' : 'محادثة المالك'}</button> : <div className="p-3 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold text-center">تتاح المحادثة بعد موافقة المالك على الطلب</div>}
              {chatError && <p className="text-xs text-rose-700 text-center">{chatError}</p>}
            </>}
          </div>
        ) : null}
      </div>
      {paymentSheetOpen && booking && <div className="fixed inset-0 z-[100] bg-slate-950/45 flex items-end justify-center" onClick={() => !paymentLoading && setPaymentSheetOpen(false)}><div className="w-full max-w-[430px] bg-white rounded-t-[28px] p-5 space-y-4 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h3 className="font-black text-slate-950">تأكيد دفع العربون</h3><button onClick={() => setPaymentSheetOpen(false)} disabled={paymentLoading} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div><div className="rounded-2xl bg-slate-50 p-4 space-y-2 text-xs"><p className="font-black text-sm text-slate-900">{property?.title}</p><p className="text-slate-500">رقم الحجز: {booking.bookingNumber}</p><div className="flex justify-between"><span>إجمالي الحجز</span><strong>{Number(booking.totalStay).toLocaleString()} ج.م</strong></div><div className="flex justify-between text-[#0059FF]"><span>المبلغ المدفوع الآن · العربون</span><strong>{Number(booking.depositAmount).toLocaleString()} ج.م</strong></div><div className="flex justify-between"><span>المتبقي بعد العربون</span><strong>{Number(booking.remainingAmount).toLocaleString()} ج.م</strong></div></div><p className="rounded-xl bg-blue-50 text-[#0059FF] px-3 py-2 text-[11px] font-bold">دفع تجريبي للنسخة الحالية — لن يتم خصم أموال حقيقية</p>{paymentError && <p className="text-xs font-bold text-rose-700 text-center">{paymentError}</p>}<button onClick={() => void completePrototypePayment()} disabled={paymentLoading} className="w-full min-h-12 rounded-xl bg-[#0059FF] text-white font-black disabled:bg-slate-300">{paymentLoading ? 'جاري تأكيد الدفع...' : 'إتمام الدفع التجريبي'}</button></div></div>}
    </div>
  );
};
