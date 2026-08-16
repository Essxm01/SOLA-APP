import { useState, useEffect } from 'react';
import {
  CreditCard,
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        body: JSON.stringify({ reason: 'تنفيذ التحويل البنكي المباشر بواسطة المسؤول' }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل كشف بيانات الحسابات المشفرة');

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
    setIsSubmitting(true);
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
        body: JSON.stringify({
          providerFeeEgp: feeVal,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل تنفيذ تحويل الأرباح');

      setShowApproveModal(false);
      setActionSuccess('تم إعتماد وتأكيد تحويل الأرباح بنجاح وتحديث حساب المالك.');
      fetchDetail();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/payouts/${payoutId}/reject`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `reject_${Date.now()}`,
        },
        body: JSON.stringify({
          reasonCode: rejectionCode,
          adminNote: rejectionNote,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل رفض طلب السحب');

      setShowRejectModal(false);
      setActionSuccess('تم رفض طلب السحب وإعادة الرصيد للمالك بنجاح.');
      fetchDetail();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
          العودة لقائمة السحوبات
        </Button>
        <AlertBanner type="error" message={error || 'طلب السحب غير موجود'} />
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
                  <CreditCard className="w-3.5 h-3.5 text-[#0059FF]" />
                  <span>معالجة طلب السحب</span>
                </span>
                <StatusBadge status={detail.status} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">طلب سحب رقم: {detail.requestNumber}</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                المالك: <span className="text-slate-900 font-bold">{detail.owner?.fullName || 'مالك بدون اسم'}</span>
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {detail.status === 'PENDING' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setShowApproveModal(true)}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  تأكيد التحويل البنكي
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  icon={<XCircle className="w-4 h-4" />}
                >
                  رفض وتحديث الرصيد
                </Button>
              </>
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
        
        {/* Left Column (2 Cols): Account Details & PII Security */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bank / Wallet Account Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0059FF]" />
                <span>بيانات حساب التحويل المطلوب</span>
              </span>

              {piiTimer > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  كشف محمي: متبقي {piiTimer} ثانية ⏱️
                </span>
              )}
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold">طريقة التحويل:</span>
                <strong className="text-slate-900 font-bold">
                  {detail.payoutMethod?.methodType === 'BANK_ACCOUNT' ? 'حساب بنكي (Bank Account)' : 'محفظة إلكترونية (E-Wallet)'}
                </strong>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold">اسم الحساب المسجل:</span>
                <strong className="text-slate-900 font-bold">{detail.payoutMethod?.accountTitle || '—'}</strong>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold">رقم الحساب / الآيبان (IBAN):</span>
                <strong className="text-slate-900 font-mono text-sm dir-ltr">
                  {unmaskedPii ? unmaskedPii.accountNumber || unmaskedPii.iban : detail.payoutMethod?.maskedAccountNumber}
                </strong>
              </div>
            </div>

            {/* PII Reveal Button */}
            {!unmaskedPii && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevealPii}
                  isLoading={piiLoading}
                  icon={<Eye className="w-4 h-4 text-[#0059FF]" />}
                >
                  كشف رقم الحساب البنكي الكامل لتنفيذ التحويل 👁️
                </Button>
              </div>
            )}
          </Card>

        </div>

        {/* Right Column (1 Col): Financial Breakdown */}
        <div className="space-y-6">
          
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>المبالغ والتفاصيل المالية</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-center">
                <span className="text-xs font-bold text-emerald-800 block">إجمالي المبلغ المطلوب سحبه</span>
                <strong className="text-3xl font-black text-emerald-700">
                  {detail.financials?.grossAmountEgp?.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
                </strong>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold">صافي المبلغ للتحويل:</span>
                <strong className="text-slate-900 font-extrabold text-sm">{detail.financials?.netPayoutEgp?.toLocaleString() || detail.financials?.grossAmountEgp?.toLocaleString()} ج.م</strong>
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="تأكيد تنفيذ التحويل البنكي"
        primaryActionLabel="تأكيد التحويل بنجاح"
        onPrimaryAction={handleApprove}
        isPrimaryLoading={isSubmitting}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            أدخل رسوم خدمة التحويل البنكية لتسجيلها في الخزينة:
          </p>
          <Input
            type="number"
            label="رسوم التحويل (ج.م):"
            value={actualFeeInput}
            onChange={(e) => setActualFeeInput(e.target.value)}
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="رفض طلب سحب الأرباح"
        primaryActionLabel="تأكيد الرفض وإعادة الرصيد"
        onPrimaryAction={handleReject}
        primaryActionVariant="danger"
        isPrimaryLoading={isSubmitting}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block font-bold text-slate-800">سبب الرفض:</label>
            <Select
              value={rejectionCode}
              onChange={(e: any) => setRejectionCode(e.target.value)}
            >
              <option value="INVALID_ACCOUNT_IDENTIFIER">رقم الحساب أو الآيبان غير صحيح</option>
              <option value="ACCOUNT_NAME_MISMATCH">اسم صاحب الحساب لا يطابق المالك</option>
              <option value="BANK_PROCESSING_ERROR">خطأ في معالجة البنك للتحويل</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-800">ملاحظات إضافية للمالك:</label>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="اكتب التوضيح المطلوب للمالك..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none h-20"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
