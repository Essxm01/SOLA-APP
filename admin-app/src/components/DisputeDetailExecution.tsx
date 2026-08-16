import { useState, useEffect } from 'react';
import {
  Scale,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  FileText,
  User,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import { AlertBanner, SkeletonBox } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface DisputeDetailExecutionProps {
  disputeId: string;
  onBack: () => void;
}

export function DisputeDetailExecution({ disputeId, onBack }: DisputeDetailExecutionProps) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals & Controls
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [resolutionType, setResolutionType] = useState<'RELEASE_TO_OWNER' | 'REFUND_GUEST' | 'SPLIT'>('RELEASE_TO_OWNER');
  const [refundAmountInput, setRefundAmountInput] = useState<string>('2000');
  const [adminNotesText, setAdminNotesText] = useState<string>('');
  const [isResolvingLoading, setIsResolvingLoading] = useState<boolean>(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/disputes/${disputeId}`), {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('فشل استرجاع تفاصيل النزاع والأدلة');

      const json = await response.json();
      if (json.success && json.data) {
        setDetail(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل تفاصيل النزاع المحدد');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [disputeId]);

  const handleResolve = async () => {
    setError(null);
    setIsResolvingLoading(true);
    try {
      if (adminNotesText.trim().length < 20) {
        throw new Error('ملاحظات القرار الإداري إجبارية وتتطلب 20 حرفاً على الأقل لتوثيق الحسم');
      }

      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/disputes/${disputeId}/resolve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `resolve_${Date.now()}`,
        },
        body: JSON.stringify({
          resolutionType,
          refundAmount: resolutionType === 'SPLIT' ? parseFloat(refundAmountInput) : undefined,
          adminNotes: adminNotesText,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'فشل البت الإداري في النزاع');
      }

      setShowResolveModal(false);
      setActionSuccess(`تم اعتماد قرار الحسم الإداري بنجاح وتسجيل التسوية المالية.`);
      fetchDetail();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsResolvingLoading(false);
    }
  };

  const handleReconcile = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/disputes/${disputeId}/reconcile`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Idempotency-Key': `reconcile_${Date.now()}` },
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل استعلام مطابقة الاسترداد');

      setActionSuccess(`نتيجة استعلام المطابقة البنكية: (${json.data.reconciliationResult}) ➔ حالة النزاع (${json.data.updatedDisputeStatus})`);
      fetchDetail();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBox className="h-20 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonBox className="h-64 md:col-span-2 rounded-2xl" />
          <SkeletonBox className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} icon={<ArrowRight className="w-4 h-4" />}>
          العودة لقائمة النزاعات
        </Button>
        <AlertBanner type="error" message={error || 'تفاصيل النزاع غير موجودة'} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Top Banner Header with Back Navigation */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0059FF] transition-all border border-slate-200 cursor-pointer"
              title="العودة للقائمة"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                  <Scale className="w-3.5 h-3.5 text-[#0059FF]" />
                  <span>تفاصيل النزاع</span>
                </span>
                <StatusBadge status={detail.status} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">نزاع رقم: {detail.disputeNumber}</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                حجز رقم: <span className="font-mono text-slate-800">{detail.bookingId}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {detail.status !== 'RESOLVED' && (
              <Button
                variant="primary"
                onClick={() => setShowResolveModal(true)}
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                اصدار القرار والحسم
              </Button>
            )}

            {detail.status === 'RESOLVING_PENDING_GATEWAY' && (
              <Button
                variant="secondary"
                onClick={handleReconcile}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                استعلام البنك
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Action Success Alert */}
      {actionSuccess && (
        <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
      )}

      {/* Main Details Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Dispute Summary & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dispute Reason & Case Details Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>تفاصيل موضوع النزاع وملاحظات الأطراف</span>
            </h2>

            <div className="space-y-3">
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-amber-800 block">سبب فتح النزاع:</span>
                <strong className="text-sm font-extrabold text-slate-900">{detail.reason || 'مخالفة شروط الحجز أو حالة العين'}</strong>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">الشرح المدون من مقدم الطلب:</span>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  {detail.description || 'لا يوجد شرح تفصيلي مدون.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Evidence Documents Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0059FF]" />
              <span>الأدلة والمرفقات المقدمة ({detail.evidenceUrls?.length || 0})</span>
            </h2>

            {(!detail.evidenceUrls || detail.evidenceUrls.length === 0) ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold">
                لم يتم تقديم صور أو أدلة مستندية بعد.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {detail.evidenceUrls.map((url: string, idx: number) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative">
                    <img src={url} alt={`دليل ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Right Column (1 Col): Financial Hold & Case Parties */}
        <div className="space-y-6">
          
          {/* Financial Hold Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>التحفظ المالي (Frozen Balance)</span>
            </h2>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-center">
              <span className="text-xs font-extrabold text-rose-800 block">المبلغ التحفظي المحجوز</span>
              <strong className="text-3xl font-black text-rose-600">
                {(detail.frozenHoldEgp || detail.ownerNetDepositFrozen || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
              </strong>
              <p className="text-[10px] text-rose-700 font-semibold">مبلغ متحفظ عليه لحين حسم القرار الإداري</p>
            </div>
          </Card>

          {/* Parties Info Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0059FF]" />
              <span>أطراف قضية النزاع</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold block">المالك:</span>
                <strong className="text-slate-900 font-extrabold">{detail.owner?.fullName || 'مالك بدون اسم'}</strong>
                <div className="text-[10px] text-slate-400 font-mono">{detail.ownerId}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold block">المستأجر:</span>
                <strong className="text-slate-900 font-extrabold">{detail.renter?.fullName || 'مستأجر بدون اسم'}</strong>
                <div className="text-[10px] text-slate-400 font-mono">{detail.customerId}</div>
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* Resolution Decision Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="إصدار القرار الإداري وحسم النزاع"
        primaryActionLabel="اعتماد وتسوية القرار"
        onPrimaryAction={handleResolve}
        isPrimaryLoading={isResolvingLoading}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block font-extrabold text-slate-900">نوع القرار والتسوية المالية:</label>
            <Select
              value={resolutionType}
              onChange={(e: any) => setResolutionType(e.target.value)}
            >
              <option value="RELEASE_TO_OWNER">تحرير المبلغ كاملاً لصالح المالك (Release to Owner)</option>
              <option value="REFUND_GUEST">استرداد المبلغ كاملاً لصالح المستأجر (Full Refund to Guest)</option>
              <option value="SPLIT">قسمة وتسوية مالية مخصصة (Custom Split)</option>
            </Select>
          </div>

          {resolutionType === 'SPLIT' && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="block font-bold text-slate-800">مبلغ الاسترداد للمستأجر (ج.م):</label>
              <Input
                type="number"
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(e.target.value)}
                placeholder="أدخل المبلغ بالجنيه المصري..."
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">ملاحظات القرار الإداري (إجباري - 20 حرفاً):</label>
            <textarea
              value={adminNotesText}
              onChange={(e) => setAdminNotesText(e.target.value)}
              placeholder="اكتب أسباب وحيثيات القرار الإداري لتسجيلها بسجل المراجعة..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-200 focus:border-[#0059FF] outline-none h-24"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
