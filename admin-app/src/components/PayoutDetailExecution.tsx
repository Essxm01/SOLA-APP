import { useState, useEffect } from 'react';
import {
  CreditCard,
  User,
  Phone,
  Eye,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import { AlertBanner, SkeletonBox } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface PayoutDetailExecutionProps {
  payoutId: string;
  onBack: () => void;
}

export function PayoutDetailExecution({ payoutId, onBack }: PayoutDetailExecutionProps) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // PII Reveal State
  const [unmaskedPii, setUnmaskedPii] = useState<any | null>(null);
  const [piiTimer, setPiiTimer] = useState<number>(0);
  const [piiLoading, setPiiLoading] = useState<boolean>(false);

  // Modals & Controls
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [actualFeeInput, setActualFeeInput] = useState<string>('30.00');

  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionCode, setRejectionCode] = useState<string>('INVALID_ACCOUNT_IDENTIFIER');
  const [rejectionNote, setRejectionNote] = useState<string>('');

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/payouts/${payoutId}`), {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('فشل استرجاع تفاصيل طلب السحب');

      const json = await response.json();
      if (json.success && json.data) {
        setDetail(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل تفاصيل طلب السحب المحدد');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [payoutId]);

  // PII Countdown Timer (60s Safety Expiry)
  useEffect(() => {
    let interval: any = null;
    if (piiTimer > 0) {
      interval = setInterval(() => {
        setPiiTimer((prev) => prev - 1);
      }, 1000);
    } else if (piiTimer === 0 && unmaskedPii) {
      setUnmaskedPii(null);
    }
    return () => clearInterval(interval);
  }, [piiTimer, unmaskedPii]);

  const handleRevealPii = async () => {
    setPiiLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/payouts/${payoutId}/reveal-pii`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'تنفيذ التحويل البنكي اليدوي المباشر بواسطة المسؤول' }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل كشف بيانات PII المشفرة');

      setUnmaskedPii(json.data.unmaskedPayoutMethod);
      setPiiTimer(json.data.expiresInSeconds || 60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPiiLoading(false);
    }
  };

  const handleApprove = async () => {
    setError(null);
    try {
      const feeVal = parseFloat(actualFeeInput);
      if (isNaN(feeVal) || feeVal < 0 || feeVal > 100) {
        throw new Error('رسوم المزود يجب أن تنحصر بين 0 و 100 ج.م');
      }

      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/payouts/${payoutId}/approve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `approve_${Date.now()}`,
        },
        body: JSON.stringify({ actualProviderFeeEgp: feeVal }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل اعتماد طلب السحب');

      setShowApproveModal(false);
      setActionSuccess('تم اعتماد الطلب وتحويله لـ PROCESSING وبدء تنفيذ أمر السحب البنكي بنجاح');
      fetchDetail();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async () => {
    setError(null);
    try {
      if (rejectionCode === 'OTHER' && (!rejectionNote || rejectionNote.trim().length < 15)) {
        throw new Error('سبب الرفض OTHER يطلب كتابة ملاحظة توضيحية لا تقل عن 15 حرفاً');
      }

      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/payouts/${payoutId}/reject`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `reject_${Date.now()}`,
        },
        body: JSON.stringify({ rejectionCode, rejectionNote }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل رفض طلب السحب');

      setShowRejectModal(false);
      setActionSuccess('تم رفض طلب السحب وإعادة الأموال المحجوزة تلقائياً للرصيد المتاح بـ Wallet المالك');
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
        <p className="text-xs font-bold text-slate-500">جارِ تحميل تفاصيل طلب السحب والمعالجة التنفيذية...</p>
      </Card>
    );
  }

  if (!detail) return null;

  const isPending = detail.status === 'PENDING_ADMIN_PROCESSING';

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
            العودة لطلبات السحب
          </Button>
          <span className="text-slate-300 text-sm">/</span>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h2 className="font-extrabold text-sm text-slate-900">المعالجة التنفيذية للطلب: {detail.requestNumber}</h2>
          </div>
        </div>

        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
          FLOW-ADM-08 Execution
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

      {/* Main Details Panel */}
      <Card className="p-6 bg-white">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center border-b border-slate-100 pb-5 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 font-mono">{detail.requestNumber}</h1>
              <StatusBadge status={detail.status} />
            </div>
            <p className="text-xs font-semibold text-slate-500">تاريخ الطلب: {new Date(detail.createdAt).toLocaleString('ar-EG')}</p>
          </div>

          <div className="text-right bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-800">المبلغ الإجمالي للسحب (Gross Amount)</div>
            <div className="text-2xl font-black text-emerald-700 font-mono">{detail.financials?.grossAmountEgp?.toLocaleString()} ج.م</div>
          </div>
        </div>

        {/* Owner & Account Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-6">
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 font-bold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> اسم المالك المعتمد:</span>
              <strong className="text-slate-900">{detail.owner?.fullName}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 font-bold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> رقم الهاتف المسجل:</span>
              <strong className="text-slate-900 font-mono">{detail.owner?.phoneNumber}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> حالة التوثيق:</span>
              <strong className="text-emerald-900">{detail.owner?.verificationStatus}</strong>
            </div>
          </div>

          {/* PII Account Reveal Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3 shadow-md">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300">البيانات البنكية المشفرة (PII Control)</span>
              {piiTimer > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                  ينتهي في: {piiTimer} ثانية
                </span>
              )}
            </div>

            <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 font-mono text-xs">
              <div className="text-slate-400 text-[10px] mb-1">المعرف المعتمد:</div>
              <div className="text-emerald-400 font-bold text-sm">
                {unmaskedPii ? unmaskedPii.accountIdentifier || unmaskedPii.iban || unmaskedPii.maskedAccountNumber : detail.payoutMethod?.maskedAccountNumber}
              </div>
            </div>

            {!unmaskedPii ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRevealPii}
                isLoading={piiLoading}
                icon={<Eye className="w-3.5 h-3.5" />}
                fullWidth
                className="!bg-emerald-600 hover:!bg-emerald-700"
              >
                كشف البيانات الكاملة مؤقتاً (60s Reveal)
              </Button>
            ) : (
              <div className="text-[11px] text-amber-300 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                🔒 العملية مسجلة بالسيرفر (Audit Logged). سيتم إعادة التشفير آلياً.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Executive Execution Actions Panel */}
      <Card className="p-6 bg-white">
        <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          <span>قرارات المعالجة التنفيذية (Executive Payout Actions)</span>
        </h3>

        <div className="flex flex-wrap gap-4">
          <Button
            variant="primary"
            size="md"
            disabled={!isPending}
            onClick={() => setShowApproveModal(true)}
            icon={<CheckCircle2 className="w-4 h-4" />}
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            الموافقة وبدء التحويل (Approve Payout)
          </Button>

          <Button
            variant="danger"
            size="md"
            disabled={!isPending}
            onClick={() => setShowRejectModal(true)}
            icon={<XCircle className="w-4 h-4" />}
          >
            رفض الطلب وإعادة الرصيد (Reject & Unreserve)
          </Button>
        </div>
      </Card>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="تأكيد الموافقة وبدء تحويل السحب"
        primaryActionLabel="تأكيد وبدء المعالجة البنكية"
        onPrimaryAction={handleApprove}
      >
        <div className="space-y-3 text-xs">
          <Input
            type="number"
            label="رسوم مزود الخدمة الفعلية (Actual Provider Fee EGP):"
            value={actualFeeInput}
            onChange={(e) => setActualFeeInput(e.target.value)}
            helperText="تخصم الرسوم من المبلغ الإجمالي ويحول الباقي الصافي للمالك."
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="تأكيد رفض طلب السحب وإعادة الأموال"
        primaryActionLabel="تأكيد الرفض وتحرير الأموال"
        onPrimaryAction={handleReject}
        primaryActionVariant="danger"
      >
        <div className="space-y-3 text-xs">
          <Select
            label="رمز سبب الرفض المعتمد (Structured Reason Code):"
            value={rejectionCode}
            onChange={(e) => setRejectionCode(e.target.value)}
          >
            <option value="INVALID_ACCOUNT_IDENTIFIER">INVALID_ACCOUNT_IDENTIFIER — رقم الحساب/IBAN غير صحيح</option>
            <option value="NAME_MISMATCH">NAME_MISMATCH — اسم الحساب لا يطابق اسم المالك</option>
            <option value="SUSPICIOUS_ACTIVITY">SUSPICIOUS_ACTIVITY — نشاط مشبوه بالطلب</option>
            <option value="DUPLICATE_REQUEST">DUPLICATE_REQUEST — طلب سحب مكرر</option>
            <option value="OTHER">OTHER — سبب رفض مخصص آخر</option>
          </Select>

          {rejectionCode === 'OTHER' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">ملاحظة توضيحية لسبب الرفض (15 حرفاً على الأقل):</label>
              <textarea
                rows={3}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                placeholder="أدخل سبب الرفض التفصيلي لتبليغ المالك..."
              />
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
