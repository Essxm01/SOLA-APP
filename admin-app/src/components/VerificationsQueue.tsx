import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { TableSkeleton, EmptyState, AlertBanner } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface VerificationsQueueProps {
  onStatusChange?: () => void;
}

export function VerificationsQueue({ onStatusChange }: VerificationsQueueProps = {}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lightbox Modal State & Transforms for Full Screen Document Inspection
  const [lightboxDoc, setLightboxDoc] = useState<{ url: string; title: string } | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);

  // Figma-style Click-and-Drag Panning State
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse Drag Handlers for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ESC Key Listener to Close Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxDoc) setLightboxDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxDoc]);

  // Reset transforms whenever a new document opens
  const openLightbox = (url: string, title: string) => {
    setZoomScale(1);
    setRotationDegrees(0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setLightboxDoc({ url, title });
  };

  // Helper to format phone number cleanly
  const formatPhone = (phone?: string, ownerId?: string) => {
    const raw = phone || ownerId || '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 8) {
      if (digits.startsWith('20')) return `+${digits}`;
      if (digits.startsWith('0')) return `+20${digits.slice(1)}`;
      return `+20${digits}`;
    }
    return '+201001234567';
  };

  // Helper to format date with Western Latin digits (1234567890)
  const formatDateLatin = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleString('ar-EG-u-nu-latn', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || '';
      const response = await fetch(getApiUrl('/admin/verifications/pending'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('فشل استرجاع قائمة طلبات التوثيق المعلقة');

      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (reviewDecision === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length < 5)) {
        throw new Error('يرجى توضيح سبب الرفض (5 أحرف على الأقل)');
      }

      const token = localStorage.getItem('sola_admin_access_token') || '';
      const response = await fetch(getApiUrl(`/admin/verifications/${selectedRequest.ownerId}/review`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: reviewDecision,
          reason: rejectionReason,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل تنفيذ قرار التوثيق');

      setSelectedRequest(null);
      setActionSuccess(`تم ${reviewDecision === 'APPROVED' ? 'اعتماد توثيق المالك' : 'رفض طلب التوثيق'} بنجاح وإرسال الإشعار للمالك.`);
      fetchQueue();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Top Banner Header — White-First Design System Standard */}
      <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                <ShieldCheck className="w-4 h-4 text-[#0059FF]" />
                <span>Real-Time Verification Queue</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">/ توثيق الملاك والعقارات</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">طلبات توثيق الملاك الحقيقية (Owner Identity Verifications)</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
              قائمة الطلبات الفعلية المرسلة من تطبيق المالك عبر PostgreSQL (Database-Driven Live Queue).
            </p>
          </div>

          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-[#0059FF] text-white hover:bg-blue-700 font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 text-[#FFD700] ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث الطلبات</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {actionSuccess && (
        <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
      )}

      {/* Error Alert */}
      {error && (
        <AlertBanner type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Main Table Workspace */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات توثيق معلقة حالياً 🎉"
            subtext="جميع طلبات توثيق الملاك والعقارات تم البت فيها بالكامل في قاعدة البيانات."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-3.5">المالك</th>
                  <th className="px-5 py-3.5">رقم الهاتف</th>
                  <th className="px-5 py-3.5">حالة الطلب</th>
                  <th className="px-5 py-3.5">تاريخ التقديم</th>
                  <th className="px-5 py-3.5">المستندات المرفقة</th>
                  <th className="px-5 py-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white font-medium text-slate-800">
                {items.map((item) => (
                  <tr key={item.requestId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-[#0059FF]" />
                        <span>{item.ownerName || 'مالك بدون اسم'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.ownerId}</div>
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-slate-800 dir-ltr text-right">
                      {formatPhone(item.ownerPhone, item.ownerId)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4 text-slate-500 font-mono">
                      {formatDateLatin(item.submittedAt)}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(item)}
                        className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#0059FF]" />
                        <span>{item.documents?.length || 0} مستندات (معاينة 👁️)</span>
                      </button>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedRequest(item)}
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                        className="mx-auto"
                      >
                        مراجعة والبت
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Modal with Live Document Viewer */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`مراجعة طلب توثيق المالك: ${selectedRequest.ownerName || 'مالك بدون اسم'}`}
          primaryActionLabel="تأكيد القرار الإداري"
          onPrimaryAction={handleReview}
          primaryActionVariant={reviewDecision === 'APPROVED' ? 'primary' : 'danger'}
          isPrimaryLoading={isSubmitting}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">اسم المالك:</span>
                <strong className="text-slate-900">{selectedRequest.ownerName || 'مالك بدون اسم'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                <strong className="text-slate-900 font-mono dir-ltr">{formatPhone(selectedRequest.ownerPhone, selectedRequest.ownerId)}</strong>
              </div>
            </div>

            {/* Attached Identity Documents Preview Section */}
            <div className="space-y-2">
              <label className="block font-extrabold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0059FF]" />
                <span>المستندات المرفقة للتوثيق ({selectedRequest.documents?.length || 0}):</span>
              </label>

              {(!selectedRequest.documents || selectedRequest.documents.length === 0) ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center font-bold">
                  لم يتم إرفاق وثائق صورية بالطلب (يرجى طلب إعادة الرفع من المالك)
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedRequest.documents.map((doc: any, idx: number) => {
                    const typeTitle = doc.documentType === 'NATIONAL_ID'
                      ? 'بطاقة رقم قومي'
                      : doc.documentType === 'PASSPORT'
                      ? 'جواز سفر'
                      : 'سجل تجاري';

                    return (
                      <div key={doc.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="bg-blue-100 text-[#0059FF] px-2.5 py-1 rounded-md font-mono text-[11px]">
                            {typeTitle}
                          </span>
                          {doc.uploadedAt && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {formatDateLatin(doc.uploadedAt)}
                            </span>
                          )}
                        </div>

                        {/* Image Thumbnail Preview */}
                        <div
                          onClick={() => openLightbox(doc.documentUrl, typeTitle)}
                          className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-100 max-h-56 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all shadow-xs"
                        >
                          <img
                            src={doc.documentUrl}
                            alt="مستند التوثيق"
                            className="w-full max-h-56 object-contain rounded-xl"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-xs">
                            <Maximize2 className="w-5 h-5" />
                            <span>تكبير المستند بالحجم الكامل</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => openLightbox(doc.documentUrl, typeTitle)}
                            className="text-[#0059FF] font-extrabold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>فتح المستند بالحجم الكامل ↗</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block font-extrabold text-slate-900">القرار الإداري (Decision):</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('APPROVED')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                    reviewDecision === 'APPROVED'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>اعتماد وقبول التوثيق (APPROVE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision('REJECTED')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                    reviewDecision === 'REJECTED'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>رفض الطلب (REJECT)</span>
                </button>
              </div>
            </div>

            {reviewDecision === 'REJECTED' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب الرفض الإجباري (Reason):</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  placeholder="أدخل سبب الرفض التفصيلي لإشعار المالك..."
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* High-Precision Lightbox Modal — SOLA Design System Standard */}
      {lightboxDoc && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200 select-none dir-rtl" dir="rtl">
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden relative">
            
            {/* Top Toolbar Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-3.5 md:p-4 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-xs md:text-sm bg-[#0059FF] text-white px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#FFD700]" />
                  <span>{lightboxDoc.title} — معاينة مكبرة 🔍</span>
                </span>
                <span className="text-xs text-slate-500 font-mono hidden md:inline">
                  (التكبير: {Math.round(zoomScale * 100)}% | الدوران: {rotationDegrees}°)
                </span>
              </div>

              {/* Close X Button top header */}
              <button
                type="button"
                onClick={() => setLightboxDoc(null)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition-all cursor-pointer border border-rose-200"
              >
                <X className="w-4 h-4" />
                <span>إغلاق (X)</span>
              </button>
            </div>

            {/* Center Canvas Viewport with Floating Controls Toolbar */}
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setLightboxDoc(null);
              }}
              className="flex-1 w-full bg-slate-100/70 overflow-auto flex items-center justify-center p-4 md:p-8 min-h-[50vh] relative"
            >
              {/* Floating Interactive Toolbar directly over image */}
              <div className="absolute top-3 right-3 z-30 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-300 shadow-xl max-w-[95%]">
                {/* Zoom In (+) */}
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 4.0))}
                  className="px-3 py-1.5 rounded-xl bg-[#0059FF] text-white hover:bg-blue-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <ZoomIn className="w-4 h-4 text-[#FFD700]" />
                  <span>تكبير (+)</span>
                </button>

                {/* Zoom Out (-) */}
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(prev - 0.25, 0.5))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer active:scale-95"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span>تصغير (-)</span>
                </button>

                {/* Reset (100%) */}
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setRotationDegrees(0);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-mono font-bold transition-all cursor-pointer"
                  title="إعادة ضبط 100%"
                >
                  {Math.round(zoomScale * 100)}%
                </button>

                {/* Rotate Left 90° */}
                <button
                  type="button"
                  onClick={() => setRotationDegrees((prev) => prev - 90)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-[#0059FF] text-xs font-bold flex items-center gap-1 border border-slate-200 transition-all cursor-pointer active:scale-95"
                  title="شقلبة الصورة يساراً 90 درجة"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>شقلبة يساراً</span>
                </button>

                {/* Rotate Right 90° */}
                <button
                  type="button"
                  onClick={() => setRotationDegrees((prev) => prev + 90)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-[#0059FF] text-xs font-bold flex items-center gap-1 border border-slate-200 transition-all cursor-pointer active:scale-95"
                  title="شقلبة الصورة يميناً 90 درجة"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>شقلبة يميناً</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setLightboxDoc(null)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>إغلاق</span>
                </button>
              </div>

              {/* Main Image Display with Figma-Style Click & Drag Panning */}
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={(e) => {
                  if (e.deltaY < 0) {
                    setZoomScale((prev) => Math.min(prev + 0.15, 4.0));
                  } else {
                    setZoomScale((prev) => Math.max(prev - 0.15, 0.5));
                  }
                }}
                className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
              >
                <img
                  src={lightboxDoc.url}
                  alt={lightboxDoc.title}
                  draggable={false}
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotationDegrees}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
                  }}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-lg border border-slate-200/80 bg-white pointer-events-auto"
                />
              </div>
            </div>

            {/* Bottom Footer Bar */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-600 font-medium shrink-0">
              <span>استخدم أدوات التكبير والتصغير وتدوير المستند أعلاه لقراءة التفاصيل بوضوح</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setLightboxDoc(null)}
                className="!bg-[#0059FF] hover:!bg-blue-700 text-white font-bold px-5"
              >
                إغلاق والعودة للبت
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


