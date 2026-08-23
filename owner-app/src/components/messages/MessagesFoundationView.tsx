import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import type { ChatMessage } from '../../types';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import {
  MessageSquare,
  Send,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
} from 'lucide-react';

export const MessagesFoundationView: React.FC = () => {
  const {
    chatConversations,
    activeConversationId,
    setActiveConversationId,
    getChatMessages,
    sendChatMessage,
    approveModificationRequest,
    rejectModificationRequest,
    approveCancellationRequest,
    rejectCancellationRequest,
    openDisputeDetails,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const [modRejectionModal, setModRejectionModal] = useState<{
    isOpen: boolean;
    requestId: string | null;
    reason: string;
  }>({
    isOpen: false,
    requestId: null,
    reason: '',
  });

  const [cancRejectionModal, setCancRejectionModal] = useState<{
    isOpen: boolean;
    requestId: string | null;
    reason: string;
  }>({
    isOpen: false,
    requestId: null,
    reason: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = (chatConversations || []).find((c) => c.id === activeConversationId);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;
    setIsLoadingMessages(true);
    setMessageError(null);
    try {
      const msgs = await getChatMessages(activeConversationId);
      setMessages(msgs);
    } catch (err: any) {
      setMessageError(err?.message || 'تعذر تحميل الرسائل');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [activeConversationId, getChatMessages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversationId) return;

    const textToSend = inputText.trim();
    setInputText('');

    setMessageError(null);
    try {
      await sendChatMessage(activeConversationId, textToSend, 'TEXT');
      await fetchMessages();
    } catch (err: any) {
      setInputText(textToSend);
      setMessageError(err?.message || 'تعذر إرسال الرسالة');
    }
  };

  const handleApproveModification = async (requestId: string) => {
    try {
      await approveModificationRequest(requestId);
      await fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveCancellation = async (requestId: string) => {
    try {
      await approveCancellationRequest(requestId);
      await fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteModReject = async () => {
    if (!modRejectionModal.requestId) return;
    try {
      await rejectModificationRequest(modRejectionModal.requestId, modRejectionModal.reason);
      setModRejectionModal({ isOpen: false, requestId: null, reason: '' });
      await fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteCancReject = async () => {
    if (!cancRejectionModal.requestId) return;
    try {
      await rejectCancellationRequest(cancRejectionModal.requestId, cancRejectionModal.reason);
      setCancRejectionModal({ isOpen: false, requestId: null, reason: '' });
      await fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeConversationId || !activeConv) {
    return (
      <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20">
        <div>
          <h2 className="text-xl font-black text-slate-900">المحادثات الخاصة بالمالك</h2>
          <p className="text-xs text-slate-500">
            تواصل بشكل مباشر وآمن مع المستأجرين وبُتّ في طلبات التعديل والإلغاء وتتبع النزاعات
          </p>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-[#0059FF] shrink-0" />
          <span className="leading-tight">
            <strong>تواصل آمن:</strong> جميع المراسلات وقرارات التعديل والإلغاء والنزاعات تتم رسمياً عبر المحادثة لحفظ حقوق الطرفين.
          </span>
        </div>

        {chatConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 my-8 space-y-2">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">لا توجد محادثات نشطة حالياً</h3>
            <p className="text-xs text-slate-500">ستظهر محادثات المستأجرين وطلبات التعديل والنزاعات هنا فور إرسالها.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatConversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center justify-between gap-3 ${
                  c.unreadCount > 0 ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0059FF] flex items-center justify-center font-black ring-2 ring-slate-100">
                      {(c.renter?.name || 'م')[0]}
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0059FF] text-white text-[10px] flex items-center justify-center font-mono">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{c.renter?.name || 'مستأجر'}</h4>
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded-md">
                        ★ {c.renter?.rating || 5.0}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#0059FF] font-medium truncate">{c.propertyTitle}</p>
                    <p className="text-xs text-slate-600 truncate">{c.lastMessage}</p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {c.lastMessageTimestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] dir-rtl text-right bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setActiveConversationId(null)}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-[#0059FF]" />
          </button>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0059FF] flex items-center justify-center font-black ring-2 ring-slate-100 shrink-0">
            {(activeConv?.renter?.name || 'م')[0]}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 truncate">{activeConv?.renter?.name || 'مستأجر'}</h3>
            <p className="text-[11px] text-slate-500 truncate">{activeConv?.propertyTitle}</p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-[#0059FF] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          محادثة آمنة 🔒
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingMessages ? (
          <div className="text-center py-8 text-xs text-slate-400">جاري تحميل الرسائل...</div>
        ) : messageError ? (
          <div className="text-center py-8 space-y-3"><p className="text-xs font-bold text-rose-700">{messageError}</p><button onClick={() => void fetchMessages()} className="text-xs font-black text-[#0059FF] underline">إعادة المحاولة</button></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 font-bold">ابدأ المحادثة</div>
        ) : (
          messages.map((msg) => {
            const isOwner = msg.senderRole === 'OWNER';

            // Card type 1: Booking Modification Request Card
            if (msg.type === 'BOOKING_MODIFICATION_REQUEST' && msg.modificationRequest) {
              const req = msg.modificationRequest;
              return (
                <div key={msg.id} className="w-full my-3 animate-fade-in">
                  <div className="max-w-xs mx-auto bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0059FF]">
                        <Calendar className="w-4 h-4" />
                        <span>طلب تعديل حجز إقامة</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">الحجز الحالي</span>
                        <p className="font-bold text-slate-800 font-mono">
                          {req.originalCheckIn} ➔ {req.originalCheckOut} ({req.originalNights} ليالٍ)
                        </p>
                      </div>

                      <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 space-y-1">
                        <span className="text-[10px] text-[#0059FF] block font-bold">الفترة المطلوبة</span>
                        <p className="font-bold text-[#0059FF] font-mono">
                          {req.requestedCheckIn} ➔ {req.requestedCheckOut} ({req.requestedNights} ليالٍ)
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border text-xs flex items-center justify-between font-bold bg-amber-50 border-amber-200 text-amber-900">
                      <span>فرق السعر:</span>
                      <span className="font-mono text-sm">
                        {req.priceDifference > 0
                          ? `+${req.priceDifference.toLocaleString()} ج.م`
                          : req.priceDifference < 0
                          ? `${req.priceDifference.toLocaleString()} ج.م`
                          : 'بدون تغيير'}
                      </span>
                    </div>

                    <div className="text-center pt-1">
                      {req.status === 'PENDING_OWNER_REVIEW' && (
                        <span className="inline-block bg-amber-100 text-amber-900 text-[11px] font-bold px-3 py-1 rounded-full">
                          بانتظار موافقة المالك
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-block bg-emerald-100 text-emerald-900 text-[11px] font-bold px-3 py-1 rounded-full">
                          تمت موافقة المالك وتعديل التواريخ ✅
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-block bg-rose-100 text-rose-900 text-[11px] font-bold px-3 py-1 rounded-full">
                          تم رفض طلب التعديل ❌
                        </span>
                      )}
                    </div>

                    {req.status === 'PENDING_OWNER_REVIEW' && (
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() => handleApproveModification(req.id)}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs py-2"
                        >
                          قبول التعديل 🟢
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          onClick={() => setModRejectionModal({ isOpen: true, requestId: req.id, reason: '' })}
                          icon={<XCircle className="w-3.5 h-3.5" />}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs py-2"
                        >
                          رفض التعديل 🔴
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Card type 2: Booking Cancellation Request Card
            if (msg.type === 'BOOKING_CANCELLATION_REQUEST' && msg.cancellationRequest) {
              const req = msg.cancellationRequest;
              return (
                <div key={msg.id} className="w-full my-3 animate-fade-in">
                  <div className="max-w-xs mx-auto bg-white rounded-2xl border-2 border-rose-400 p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>طلب إلغاء حجز ⚠️</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                    </div>

                    <div className="space-y-1.5 text-xs text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      <p><strong>صاحب الطلب:</strong> {req.requestedBy === 'RENTER' ? 'المستأجر' : 'المالك'}</p>
                      <p><strong>سبب الإلغاء:</strong> {req.reason || 'لم يتم إدخال سبب'}</p>
                    </div>

                    <div className="text-center pt-1">
                      {req.status === 'PENDING_REVIEW' && (
                        <span className="inline-block bg-amber-100 text-amber-900 text-[11px] font-bold px-3 py-1 rounded-full">
                          طلب إلغاء معلق بانتظار قرار المالك
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-block bg-rose-100 text-rose-900 text-[11px] font-bold px-3 py-1 rounded-full">
                          تم إلغاء الحجز وتفريغ الأيام 🚫
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-block bg-emerald-100 text-emerald-900 text-[11px] font-bold px-3 py-1 rounded-full">
                          تم رفض الإلغاء وتأكيد الحجز 🟢
                        </span>
                      )}
                    </div>

                    {req.status === 'PENDING_REVIEW' && (
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() => handleApproveCancellation(req.id)}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs py-2"
                        >
                          قبول الإلغاء 🟢
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          onClick={() => setCancRejectionModal({ isOpen: true, requestId: req.id, reason: '' })}
                          icon={<XCircle className="w-3.5 h-3.5" />}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs py-2"
                        >
                          رفض الإلغاء 🔴
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Card type 3: Dispute Card Integration (Section 7)
            if ((msg.type === 'DISPUTE_OPENED' || msg.type === 'DISPUTE_OWNER_RESPONDED') && msg.dispute) {
              const disp = msg.dispute;
              return (
                <div key={msg.id} className="w-full my-3 animate-fade-in">
                  <div className="max-w-xs mx-auto bg-amber-50/90 rounded-2xl border-2 border-amber-400 p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Scale className="w-4 h-4 text-amber-700" />
                        <span>تم فتح نزاع بشأن هذا الحجز 🚨</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div className="space-y-1 text-xs text-amber-950 bg-white/80 p-2.5 rounded-xl border border-amber-200">
                      <p><strong>طبيعة النزاع:</strong> عدم مطابقة الوحدة 🏡</p>
                      <p><strong>شكوى المستأجر:</strong> {disp.description}</p>
                    </div>

                    <div className="pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={() => openDisputeDetails(disp.id)}
                        className="bg-[#0059FF] hover:bg-blue-700 font-bold text-xs py-2"
                      >
                        عرض النزاع والرد 👁️
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  isOwner ? 'self-start items-start' : 'self-end items-end'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isOwner
                      ? 'bg-[#0059FF] text-white rounded-br-none'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendText}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          placeholder="اكتب رسالتك للمستأجر هنا..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0059FF]"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          icon={<Send className="w-4 h-4" />}
          className="px-4 py-2.5 font-bold shadow-xs"
        >
          إرسال
        </Button>
      </form>

      <BottomSheet
        isOpen={modRejectionModal.isOpen}
        onClose={() => setModRejectionModal({ isOpen: false, requestId: null, reason: '' })}
        title="تأكيد رفض طلب تعديل الحجز"
      >
        <div className="space-y-4 dir-rtl text-right">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
            <p className="text-sm font-bold text-rose-900">
              هل أنت متأكد من رغبتك في رفض طلب التعديل؟
            </p>
            <p className="text-xs text-rose-700 leading-relaxed">
              سيتم الإبقاء على تواريخ الحجز الأصلية وتنبيه المستأجر بذلك عبر المحادثة.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              إضافة توضيح أو سبب الرفض (اختياري)
            </label>
            <textarea
              rows={3}
              placeholder="مثال: نعتذر، الفترة المطلوبة غير متاحة بالكامل أو مرتبطة بحجز آخر..."
              value={modRejectionModal.reason}
              onChange={(e) =>
                setModRejectionModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059FF]"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() =>
                setModRejectionModal({ isOpen: false, requestId: null, reason: '' })
              }
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={handleExecuteModReject}
              className="font-bold"
            >
              تأكيد الرفض 🔴
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={cancRejectionModal.isOpen}
        onClose={() => setCancRejectionModal({ isOpen: false, requestId: null, reason: '' })}
        title="تأكيد رفض طلب إلغاء الحجز"
      >
        <div className="space-y-4 dir-rtl text-right">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
            <p className="text-sm font-bold text-rose-900">
              هل أنت متأكد من رغبتك في رفض طلب الإلغاء وتأكيد الإقامة؟
            </p>
            <p className="text-xs text-rose-700 leading-relaxed">
              سيتم تأكيد الإقامة في حالتها وشغل الأيام على التقويم وتنبيه المستأجر عبر المحادثة.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              سبب رفض الإلغاء (اختياري)
            </label>
            <textarea
              rows={3}
              placeholder="مثال: نعتذر، تم تجاوز مهلة الإلغاء المسموح بها بحسب سياسة الإلغاء..."
              value={cancRejectionModal.reason}
              onChange={(e) =>
                setCancRejectionModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059FF]"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() =>
                setCancRejectionModal({ isOpen: false, requestId: null, reason: '' })
              }
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={handleExecuteCancReject}
              className="font-bold"
            >
              تأكيد الرفض 🔴
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
