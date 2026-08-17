import { useState, useEffect } from 'react';
import {
  UserCheck,
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
  RotateCw,
  Search,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lightbox Modal State & Transforms for Full Screen Document Inspection
  const [lightboxDoc, setLightboxDoc] = useState<{ url: string; title: string } | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);

  // Panning State
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxDoc) setLightboxDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxDoc]);

  const openLightbox = (url: string, title: string) => {
    setZoomScale(1);
    setRotationDegrees(0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setLightboxDoc({ url, title });
  };

  const formatPhone = (phone?: string, ownerId?: string) => {
    const raw = phone || ownerId || '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 8) {
      if (digits.startsWith('20')) return `+${digits}`;
      if (digits.startsWith('0')) return `+20${digits.slice(1)}`;
      return `+20${digits}`;
    }
    return raw || '+201000000000';
  };

  const formatDateLatin = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || '';
      if (!token) {
        setItems([]);
        setLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('/admin/verifications/pending'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('انتهت جلسة الدخول. يرجى تسجيل الدخول مجدداً لبوابة الإدارة.');
      }

      if (!response.ok) {
        throw new Error('فشل استرجاع قائمة طلبات التوثيق المعلقة من الخادم');
      }

      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل طلبات توثيق الملاك');
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
      if (reviewDecision === 'REJECTED' && !rejectionReason.trim()) {
        throw new Error('يرجى كتابة سبب الرفض بوضوح للمالك');
      }

      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl('/admin/verifications/review'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `review_${selectedRequest.requestId}_${Date.now()}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.requestId,
          ownerId: selectedRequest.ownerId,
          decision: reviewDecision,
          rejectionReason: reviewDecision === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'فشل تسجيل قرار التوثيق الإداري');
      }

      setActionSuccess(`تم ${reviewDecision === 'APPROVED' ? 'اعتماد توثيق' : 'رفض طلب توثيق'} المالك (${selectedRequest.ownerName || 'المالك'}) بنجاح.`);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchQueue();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerPhone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Page Banner Header */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                <UserCheck className="w-4 h-4 text-[#0059FF]" />
                <span>توثيق الهوية</span>
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ توثيق الملاك</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">طلبات توثيق هوية الملاك والعقارات</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-semibold">
              مراجعة وثائق الهوية ومستندات الملكية المقدمة من الملاك والبت فيها لضمان سلامة التعاملات.
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
      </Card>

      {/* KPI Operational Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">الطلبات المعلقة بالانتظار</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{items.length} <span className="text-xs font-semibold text-slate-400">طلبات</span></div>
          <div className="text-[11px] font-bold text-[#0059FF]">بانتظار الفحص والمراجعة الإدارية</div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">نسبة استكمال المستندات</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">100%</div>
          <div className="text-[11px] font-bold text-emerald-700">مطابقة الوثائق للشروط والمعايير</div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">المستندات المرفقة المتاحة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{items.reduce((acc, curr) => acc + (curr.documents?.length || 0), 0)} <span className="text-xs font-semibold text-slate-400">ملفات</span></div>
          <div className="text-[11px] font-bold text-[#0059FF]">جاهزة للمعاينة والفحص الفوري</div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="بحث باسم المالك، المعرف، الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
              className="!bg-slate-50 focus:!bg-white"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              الكل ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'PENDING'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              قيد المراجعة
            </button>
          </div>

        </div>
      </Card>

      {/* Action Banners */}
      {actionSuccess && (
        <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
      )}
      {error && (
        <AlertBanner type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Main Table Workspace */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden p-0">
        {loading ? (
          <TableSkeleton />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات توثيق معلقة حالياً 🎉"
            subtext="جميع طلبات توثيق هوية الملاك والعقارات تم البت فيها بالكامل واستيفاؤها."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-4">المالك</th>
                  <th className="px-5 py-4">رقم الهاتف</th>
                  <th className="px-5 py-4">حالة الطلب</th>
                  <th className="px-5 py-4">تاريخ التقديم</th>
                  <th className="px-5 py-4">المستندات المرفقة</th>
                  <th className="px-5 py-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.requestId} className="hover:bg-blue-50/30 transition-colors">
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
                        className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
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
                        icon={<UserCheck className="w-3.5 h-3.5" />}
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

      {/* Review Modal */}
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

            {/* Documents Preview */}
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
                      <div key={doc.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-800">{typeTitle}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                            {doc.documentType}
                          </span>
                        </div>

                        {doc.fileUrl ? (
                          <div className="relative group rounded-lg overflow-hidden border border-slate-300 bg-slate-900 max-h-48 flex items-center justify-center">
                            <img
                              src={doc.fileUrl}
                              alt={typeTitle}
                              className="object-contain max-h-48 w-full group-hover:opacity-90 transition-opacity"
                            />
                            <button
                              type="button"
                              onClick={() => openLightbox(doc.fileUrl, `${selectedRequest.ownerName} - ${typeTitle}`)}
                              className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-extrabold gap-2 cursor-pointer"
                            >
                              <Maximize2 className="w-5 h-5 text-[#FFD700]" />
                              <span>تكبير المستند ملء الشاشة 🔍</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-100 text-slate-500 rounded text-center">
                            لا يوجد رابط صورة مباشر للمستند
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Decision Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block font-extrabold text-slate-900">القرار الإداري:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('APPROVED')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    reviewDecision === 'APPROVED'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>قبول وتوثيق المالك</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision('REJECTED')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    reviewDecision === 'REJECTED'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>رفض الطلب</span>
                </button>
              </div>
            </div>

            {/* Rejection Notes */}
            {reviewDecision === 'REJECTED' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block font-bold text-slate-800">سبب الرفض (سيظهر للمالك):</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب رفض المستندات بوضوح (مثال: صورة بطاقة الرقم القومي غير واضحة)..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none h-20"
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Lightbox Modal */}
      {lightboxDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in text-white select-none">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 z-10">
            <div>
              <h3 className="font-extrabold text-sm text-white">{lightboxDoc.title}</h3>
              <p className="text-[10px] text-slate-400">استخدم أدوات التكبير أو اسحب الفأرة للتنقل داخل المستند</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono px-2 font-bold text-blue-400">
                  {Math.round(zoomScale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(4, z + 0.25))}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-800 my-auto mx-1" />

                <button
                  type="button"
                  onClick={() => setRotationDegrees((r) => r - 90)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                  title="تدوير يسار"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setRotationDegrees((r) => r + 90)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                  title="تدوير يمين"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLightboxDoc(null)}
                className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1 text-xs"
              >
                <X className="w-4 h-4" />
                <span>إغلاق</span>
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={lightboxDoc.url}
              alt={lightboxDoc.title}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotationDegrees}deg)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              }}
              className="max-h-[80vh] max-w-[85vw] object-contain shadow-2xl pointer-events-none select-none"
            />
          </div>
        </div>
      )}

    </div>
  );
}
