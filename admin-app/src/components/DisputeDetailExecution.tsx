import { useState, useEffect } from 'react';
import {
  Scale,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
  FileText,
  Building,
  User
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import { AlertBanner, SkeletonBox } from './ui/StateViews';

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
      const response = await fetch(`/api/v1/admin/disputes/${disputeId}`, {
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
        throw new Error('ملاحظات الإدارة adminNotes إجبارية وتتطلب 20 حرفاً على الأقل بعد الـ Trim');
      }

      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(`/api/v1/admin/disputes/${disputeId}/resolve`, {
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
      setActionSuccess(`تم اعتماد قرار الحسم الإداري (${resolutionType}) بنجاح وتسجيل قيد الـ Ledger الذري`);
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
      const response = await fetch(`/api/v1/admin/disputes/${disputeId}/reconcile`, {
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
      <Card className="p-12 text-center space-y-4">
        <SkeletonBox className="h-8 w-48 mx-auto" />
        <SkeletonBox className="h-32 w-full" />
        <p className="text-xs font-bold text-slate-500">جارِ تحميل مركز حسم النزاع والأدلة الجنائية المرفقة...</p>
      </Card>
    );
  }

  if (!detail) return null;

  const isResolved = detail.status === 'RESOLVED';
  const isResolving = detail.status === 'RESOLVING_PENDING_GATEWAY';
  const frozenHoldEgp = detail.frozenHoldEgp || 5000;
  const ownerReleasedSoFarEgp = detail.ownerReleasedAmountEgp || 0;
  const remainingHeldEgp = frozenHoldEgp - ownerReleasedSoFarEgp;

  return (
    <div className="space-y-6 animate-fade-in pb-12 dir-rtl" dir="rtl">
      
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            العودة لقائمة النزاعات
          </Button>
          <span className="text-slate-300 text-sm">/</span>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#0059FF]" />
            <h2 className="font-extrabold text-sm text-slate-900">مركز حسم النزاع: {detail.disputeNumber}</h2>
          </div>
        </div>

        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-50 text-[#0059FF] border border-blue-200">
          FLOW-ADM-09 Locked Saga
        </span>
      </div>

      {/* Success Alert */}
      {actionSuccess && (
        <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
      )}

      {/* Error Alert */}
      {error && (
        <AlertBanner type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Dispute Header & Financial Summary Card */}
      <Card className="p-6 bg-white">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center border-b border-slate-100 pb-5 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 font-mono">{detail.disputeNumber}</h1>
              <StatusBadge status={detail.status} />
            </div>
            <p className="text-xs font-semibold text-slate-500">حجز: <strong className="font-mono text-slate-800">#{detail.bookingId}</strong> — {detail.property?.title}</p>
          </div>

          {/* Financial Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-right">
              <div className="text-[10px] font-bold text-rose-700">المبلغ المحجوز الإجمالي ($H$)</div>
              <div className="text-base font-black text-rose-900 font-mono">{frozenHoldEgp.toLocaleString()} ج.م</div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-right">
              <div className="text-[10px] font-bold text-emerald-700">المحرر للمالك حتى الآن</div>
              <div className="text-base font-black text-emerald-900 font-mono">{ownerReleasedSoFarEgp.toLocaleString()} ج.م</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-right col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-[#0059FF]">المتبقي بالحظر (H_remaining)</div>
              <div className="text-base font-black text-[#0059FF] font-mono">{remainingHeldEgp.toLocaleString()} ج.م</div>
            </div>
          </div>
        </div>

        {/* Dispute Overview Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-6">
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 font-bold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> المستأجر المشتكي:</span>
              <strong className="text-slate-900">{detail.renter?.fullName}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 font-bold flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-400" /> المالك المشكو في حقه:</span>
              <strong className="text-slate-900">{detail.owner?.fullName} ({detail.owner?.verificationStatus})</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-600" /> Admin SLA Deadline:</span>
              <strong className="text-amber-900">{new Date(detail.adminSlaDeadlineAt).toLocaleString('ar-EG')}</strong>
            </div>
          </div>

          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-2">
            <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>سبب النزاع المدون:</span>
            </div>
            <p className="text-slate-800 font-semibold text-xs leading-relaxed">{detail.reason}</p>
          </div>
        </div>

        {/* Evidence Timeline (Append-Only) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0059FF]" />
              <span>مخطط الأدلة المرفقة (Append-Only Evidence Timeline):</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">محمية ضد التعديل أو الحذف بـ DB Trigger</span>
          </div>

          <div className="space-y-3">
            {detail.evidenceList.map((ev: any) => (
              <div key={ev.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center font-bold">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    ev.submittedByRole === 'RENTER' ? 'bg-blue-100 text-blue-900' :
                    ev.submittedByRole === 'OWNER' ? 'bg-amber-100 text-amber-900' : 'bg-slate-900 text-white'
                  }`}>
                    {ev.submittedByRole === 'RENTER' ? 'المستأجر' : ev.submittedByRole === 'OWNER' ? 'المالك' : 'الإدارة'} ({ev.evidenceType})
                  </span>
                  <span className="text-slate-400 font-mono">{new Date(ev.submittedAt).toLocaleString('ar-EG')}</span>
                </div>
                <p className="text-slate-900 font-semibold text-xs pt-1">{ev.content}</p>
              </div>
            ))}
          </div>
        </div>

      </Card>

      {/* Executive Action Control Panel */}
      <Card className="p-6 bg-white">
        <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#0059FF]" />
          <span>لوحة البت الإداري والمطابقة (Executive Resolution Controls)</span>
        </h3>

        <div className="flex flex-wrap gap-4">
          <Button
            variant="primary"
            size="md"
            disabled={isResolved || isResolving}
            onClick={() => setShowResolveModal(true)}
            icon={<Scale className="w-4 h-4" />}
          >
            البت الإداري النهائي (Resolve Dispute)
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleReconcile}
            icon={<RefreshCw className="w-4 h-4 text-sky-600" />}
            className="!bg-slate-900 !text-white !border-slate-800 hover:!bg-slate-800"
          >
            استعلام مطابقة الاسترداد البنكي (Reconcile Gateway)
          </Button>
        </div>
      </Card>

      {/* Resolve Confirmation Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="تأكيد قرار الحسم الإداري بالنزاع"
        primaryActionLabel="تأكيد البت والتسوية"
        onPrimaryAction={handleResolve}
        isPrimaryLoading={isResolvingLoading}
      >
        <div className="space-y-4 text-xs">
          <div>
            <Select
              label="نوع القرار الموحد (Unified Resolution Taxonomy):"
              value={resolutionType}
              onChange={(e: any) => setResolutionType(e.target.value)}
            >
              <option value="RELEASE_TO_OWNER">RELEASE_TO_OWNER — تحرير 100% للمالك ({remainingHeldEgp.toLocaleString()} ج.م)</option>
              <option value="REFUND_GUEST">REFUND_GUEST — استرداد 100% للضيف ({remainingHeldEgp.toLocaleString()} ج.م)</option>
              <option value="SPLIT">SPLIT — تقسيم مبلغ الحظر المتبقي بين المالك والضيف</option>
            </Select>
          </div>

          {resolutionType === 'SPLIT' && (
            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
              <Input
                type="number"
                label="مبلغ استرداد الضيف (EGP):"
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(e.target.value)}
                helperText={`يجب أن ينحصر المبلغ بين 0 والمبلغ المحجوز المتبقي الحقيقي (${remainingHeldEgp.toLocaleString()} ج.م).`}
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">ملاحظات الإدارة adminNotes (20 حرفاً على الأقل بعد الـ Trim):</label>
            <textarea
              rows={3}
              value={adminNotesText}
              onChange={(e) => setAdminNotesText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0059FF]"
              placeholder="أدخل الملاحظات والأسباب الإدارية الموجبة لهذا القرار..."
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
