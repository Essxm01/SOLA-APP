import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Dispute } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { BottomSheet } from '../ui/BottomSheet';
import {
  DISPUTE_STATUS_CONFIG,
  DISPUTE_SEVERITY_CONFIG,
  DISPUTE_TYPE_CONFIG,
  DISPUTE_RESOLUTION_CONFIG,
} from '../../constants/theme';
import {
  AlertTriangle,
  Building,
  Image as ImageIcon,
  MessageSquare,
  Lock,
  ChevronLeft,
  MapPin,
  Send,
  Scale,
} from 'lucide-react';

export const DisputesFoundationView: React.FC = () => {
  const {
    disputes,
    selectedDisputeId,
    setSelectedDisputeId,
    respondToDispute,
    openChatForBooking,
    isEmptyDashboard,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'pending_response' | 'admin_review' | 'waiting_evidence' | 'closed'
  >('all');

  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(Boolean(selectedDisputeId));
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(() => {
    return (disputes || []).find((d) => d.id === selectedDisputeId) || (disputes || [])[0] || null;
  });

  const filteredDisputes = (disputes || []).filter((d) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending_response') {
      return d.status === 'OPENED' || d.status === 'UNDER_OWNER_RESPONSE' || d.status === 'WAITING_FOR_MORE_EVIDENCE';
    }
    if (activeFilter === 'admin_review') {
      return d.status === 'OWNER_RESPONDED' || d.status === 'UNDER_ADMIN_REVIEW' || d.status === 'RESOLUTION_PROPOSED';
    }
    if (activeFilter === 'closed') {
      return d.status === 'RESOLVED' || d.status === 'REJECTED' || d.status === 'CANCELLED';
    }
    return true;
  });

  // Owner Response BottomSheet State
  const [isResponseSheetOpen, setIsResponseSheetOpen] = useState<boolean>(false);
  const [responseText, setResponseText] = useState<string>('');
  const [evidenceUrlInput, setEvidenceUrlInput] = useState<string>('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const openDetails = (dispute: Dispute) => {
    setActiveDispute(dispute);
    setSelectedDisputeId(dispute.id);
    setIsDetailsOpen(true);
  };

  const handleAddEvidenceUrl = () => {
    if (!evidenceUrlInput.trim()) return;
    setEvidenceUrls((prev) => [...prev, evidenceUrlInput.trim()]);
    setEvidenceUrlInput('');
  };

  const handleRemoveEvidenceUrl = (index: number) => {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitResponse = async () => {
    if (!activeDispute || !responseText.trim()) return;
    setIsSubmitting(true);
    try {
      const updated = await respondToDispute(activeDispute.id, responseText.trim(), evidenceUrls);
      setActiveDispute(updated);
      setIsResponseSheetOpen(false);
      setResponseText('');
      setEvidenceUrls([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20">
      {/* Header Title */}
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Scale className="w-6 h-6 text-[#0059FF]" />
          <span>مركز النزاعات وعدم مطابقة الوحدات</span>
        </h2>
        <p className="text-xs text-slate-500">
          متابعة شكاوى المستأجرين والرد بالأدلة لإدارة المنصة Sola الباتة إدارياً
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center justify-between text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-white text-[#0059FF] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          الكل ({disputes.length})
        </button>

        <button
          onClick={() => setActiveFilter('pending_response')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
            activeFilter === 'pending_response'
              ? 'bg-white text-[#0059FF] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>تحتاج ردي</span>
          {disputes.filter((d) => d.status === 'OPENED' || d.status === 'UNDER_OWNER_RESPONSE').length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-mono">
              {disputes.filter((d) => d.status === 'OPENED' || d.status === 'UNDER_OWNER_RESPONSE').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('admin_review')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeFilter === 'admin_review'
              ? 'bg-white text-[#0059FF] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          قيد مراجعة Sola
        </button>

        <button
          onClick={() => setActiveFilter('closed')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeFilter === 'closed'
              ? 'bg-white text-[#0059FF] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          محسومة ومغلقة
        </button>
      </div>

      {/* Disputes List Stream */}
      {isEmptyDashboard || filteredDisputes.length === 0 ? (
        <EmptyState
          type="bookings"
          title="لا توجد نزاعات حالياً"
          description="جميع حجوزاتك ووحداتك الساحلية تسير بسلاسة بدون شكاوى عدم مطابقة معلنة."
        />
      ) : (
        <div className="space-y-3">
          {filteredDisputes.map((dispute) => {
            const statusConfig = DISPUTE_STATUS_CONFIG[dispute.status];
            const severityConfig = DISPUTE_SEVERITY_CONFIG[dispute.severity];
            const typeConfig = DISPUTE_TYPE_CONFIG[dispute.type];

            return (
              <div
                key={dispute.id}
                onClick={() => openDetails(dispute)}
                className={`bg-white rounded-2xl p-4 border-2 shadow-xs space-y-3 hover:shadow-md transition-all cursor-pointer ${
                  statusConfig.actionRequiredByOwner ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                }`}
              >
                {/* Header Badge Row */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${severityConfig.bg} ${severityConfig.text} ${severityConfig.border}`}>
                      {severityConfig.label}
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {typeConfig.label}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Property & Renter Info */}
                <div className="flex gap-3">
                  <img
                    src={dispute.propertyImage}
                    alt={dispute.propertyTitle}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 truncate">{dispute.propertyTitle}</h4>
                    <p className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{dispute.locationName}</span>
                    </p>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>المستأجر: <strong className="text-slate-900">{dispute.renterName}</strong></span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-400">{dispute.openedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Complaint Snippet */}
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1 line-clamp-2">
                  <span className="font-bold text-slate-900 block">شكوى المستأجر:</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{dispute.description}</p>
                </div>

                {/* Action Required Banner for Owner */}
                {statusConfig.actionRequiredByOwner && (
                  <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>مطلوب ردك ودلائلك لتوضيح الموقف لإدارة Sola</span>
                    </span>
                    <span className="text-xs text-[#0059FF] underline font-bold">
                      إرسال الرد ➔
                    </span>
                  </div>
                )}

                {/* Action Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <ImageIcon className="w-3.5 h-3.5" /> {dispute.evidence.length} أدلة مرفقة
                  </span>
                  <span className="text-[#0059FF] font-bold flex items-center gap-1">
                    عرض مقارنة الشكوى والتفاصيل <ChevronLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DISPUTE DETAILS BOTTOMSHEET */}
      <BottomSheet
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="تفاصيل النزاع ومقارنة الوحدة"
      >
        {activeDispute && (
          <div className="space-y-4 dir-rtl text-right">
            {/* Status & Severity Bar */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">حالة النزاع:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold ${DISPUTE_STATUS_CONFIG[activeDispute.status].bg} ${DISPUTE_STATUS_CONFIG[activeDispute.status].text}`}>
                {DISPUTE_STATUS_CONFIG[activeDispute.status].label}
              </span>
            </div>

            {/* SECTION 12: BOOKED PROPERTY VS REPORTED PROPERTY MISMATCH VIEW */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#0059FF]" />
                  <span>مقارنة الوحدة المحجوزة مقابل البلاغ المقدم</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {DISPUTE_TYPE_CONFIG[activeDispute.type].label}
                </span>
              </div>

              {/* Booked Property Summary */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-2 text-xs">
                <span className="font-bold text-blue-900 block border-b border-blue-100 pb-1">
                  1. الوحدة المعتمدة بالعقد والمحجوزة:
                </span>
                <div className="flex gap-2.5 items-center">
                  <img
                    src={activeDispute.propertyImage}
                    alt={activeDispute.propertyTitle}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-slate-900 text-xs">{activeDispute.propertyTitle}</h5>
                    <p className="text-[11px] text-slate-500">{activeDispute.locationName}</p>
                  </div>
                </div>
              </div>

              {/* Reported Issue Summary */}
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5 text-xs">
                <span className="font-bold text-rose-900 block border-b border-rose-200 pb-1">
                  2. بلاغ وشكوى المستأجر:
                </span>
                <p className="text-rose-950 text-xs leading-relaxed font-semibold">{activeDispute.description}</p>
              </div>
            </div>

            {/* SECTION 9: FINANCIAL DISPUTE HOLD STATUS PILL */}
            {activeDispute.financialHold && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl space-y-1 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>تجميد مالي مؤقت نشط (Financial Dispute Hold) 🔒</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {activeDispute.financialHold.reason}. تم تجميد الدفعة مؤقتاً لحماية جميع الأطراف لحين صدور قرار إدارة منصة Sola.
                </p>
              </div>
            )}

            {/* Evidence Gallery Section */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#0059FF]" />
                <span>معرض الأدلة المرفقة من المستأجر ({activeDispute.evidence.length})</span>
              </span>

              {activeDispute.evidence.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {activeDispute.evidence.map((ev) => (
                    <div key={ev.id} className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                      {ev.type === 'IMAGE' && ev.url && (
                        <img
                          src={ev.url}
                          alt={ev.description}
                          className="w-full h-24 rounded-lg object-cover"
                        />
                      )}
                      <p className="text-[10px] text-slate-600 leading-tight truncate">{ev.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">لم يرفق المستأجر أدلة مصورة بعد.</p>
              )}
            </div>

            {/* Owner Response Display Section */}
            {activeDispute.ownerResponse ? (
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
                  <span className="font-bold text-emerald-900">رد المالك (أحمد الفاروق):</span>
                  <span className="text-[10px] text-emerald-700">{activeDispute.ownerResponseAt}</span>
                </div>
                <p className="text-emerald-950 text-xs leading-relaxed">{activeDispute.ownerResponse}</p>

                {activeDispute.ownerEvidence && activeDispute.ownerEvidence.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-emerald-900 block mb-1">الأدلة المضادة المرفقة من المالك:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {activeDispute.ownerEvidence.map((oEv) => (
                        <img
                          key={oEv.id}
                          src={oEv.url}
                          alt={oEv.description}
                          className="w-16 h-16 rounded-lg object-cover border border-emerald-300 shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              DISPUTE_STATUS_CONFIG[activeDispute.status].actionRequiredByOwner && (
                <div className="pt-1">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => setIsResponseSheetOpen(true)}
                    icon={<Send className="w-4 h-4" />}
                    className="bg-[#0059FF] font-bold py-2.5 shadow-xs"
                  >
                    إرسال ردك والأدلة لإدارة Sola ✍️
                  </Button>
                </div>
              )
            )}

            {/* Administrative Resolution View if RESOLVED / REJECTED */}
            {activeDispute.resolutionType && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Scale className="w-4 h-4" />
                    <span>القرار الإداري النهائي المعتمد</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{activeDispute.resolvedAt}</span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-white text-sm block">
                    {DISPUTE_RESOLUTION_CONFIG[activeDispute.resolutionType].label}
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed">{activeDispute.resolutionReason}</p>
                </div>
              </div>
            )}

            {/* Renter Contact & Chat Link */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={activeDispute?.renterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={activeDispute?.renterName || 'مستأجر'}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <span className="font-bold text-slate-900 block">{activeDispute?.renterName || 'مستأجر'}</span>
                  <span className="text-[11px] text-slate-500">{activeDispute.renterPhone}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailsOpen(false);
                  openChatForBooking(activeDispute.bookingId);
                }}
                className="text-xs font-bold text-[#0059FF] underline flex items-center gap-1"
              >
                <MessageSquare className="w-4 h-4" />
                <span>المحادثات 💬</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* OWNER RESPONSE BOTTOMSHEET */}
      <BottomSheet
        isOpen={isResponseSheetOpen}
        onClose={() => setIsResponseSheetOpen(false)}
        title="تقديم رد المالك والأدلة المضادة"
      >
        <div className="space-y-4 dir-rtl text-right">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed font-semibold">
            ℹ️ <strong>ملاحظة هامة:</strong> ردك يرسل مباشرة إلى لجنة مراجعة الجودة والسلامة في منصة Sola الباتة حصرية في القرار المالي للنزاع.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              توضيح المالك وتفسير الشكوى (مطلوب):
            </label>
            <textarea
              rows={4}
              placeholder="اكتب ردك بالتفصيل، وتوضيح هل تم تسليم الوحدة المحددة بالعقد وأية ظروف صيانة طارئة..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0059FF] leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">
              إرفاق صور/أدلة مضادة (رابط صورة تجريبي):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/photo.jpg"
                value={evidenceUrlInput}
                onChange={(e) => setEvidenceUrlInput(e.target.value)}
                className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0059FF]"
              />
              <button
                type="button"
                onClick={handleAddEvidenceUrl}
                className="px-3 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                إضافة
              </button>
            </div>

            {evidenceUrls.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-500 font-bold">الروابط المضافة:</span>
                {evidenceUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-[11px]">
                    <span className="truncate text-slate-700">{url}</span>
                    <button
                      onClick={() => handleRemoveEvidenceUrl(idx)}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsResponseSheetOpen(false)}
            >
              إلغاء
            </Button>

            <Button
              variant="primary"
              size="md"
              fullWidth
              isLoading={isSubmitting}
              disabled={!responseText.trim()}
              onClick={handleSubmitResponse}
              className="bg-[#0059FF] font-bold"
            >
              تأكيد وإرسال الرد لـ Sola 🚀
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
