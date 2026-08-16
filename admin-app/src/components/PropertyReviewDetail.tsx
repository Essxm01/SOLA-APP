import { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MapPin,
  Bed,
  Bath,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { AlertBanner, SkeletonBox } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface PropertyReviewDetailProps {
  propertyId: string;
  onBack: () => void;
}

export function PropertyReviewDetail({ propertyId, onBack }: PropertyReviewDetailProps) {
  const [detail, setDetail] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals & Controls
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      
      const [detailRes, imagesRes] = await Promise.all([
          fetch(getApiUrl(`/admin/properties/${propertyId}`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          }),
          fetch(getApiUrl(`/admin/properties/${propertyId}/images`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          })
      ]);

      if (!detailRes.ok) throw new Error('فشل استرجاع تفاصيل الوحدة');
      
      const detailJson = await detailRes.json();
      if (detailJson.success && detailJson.data) {
        setDetail(detailJson.data);
      }

      if (imagesRes.ok) {
          const imagesJson = await imagesRes.json();
          if (imagesJson.success && imagesJson.data) {
              setImages(imagesJson.data);
          }
      }
      
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل تفاصيل الوحدة');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [propertyId]);

  const handleApprove = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/properties/${propertyId}/approve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `approve_${Date.now()}`,
        },
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل اعتماد الوحدة');

      setShowApproveModal(false);
      setActionSuccess('تم اعتماد الوحدة ونشرها بنجاح.');
      fetchDetail();
      setTimeout(onBack, 2500);
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
      if (!rejectionNote || rejectionNote.trim().length < 10) {
        throw new Error('سبب الرفض يتطلب كتابة ملاحظة توضيحية لا تقل عن 10 أحرف');
      }

      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/properties/${propertyId}/review`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `reject_${Date.now()}`,
        },
        body: JSON.stringify({ decision: 'REJECTED', reviewNotes: rejectionNote }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل رفض الوحدة');

      setShowRejectModal(false);
      setActionSuccess('تم رفض الوحدة وإرسال الإشعار للمالك.');
      fetchDetail();
      setTimeout(onBack, 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-12 text-center space-y-4">
        <SkeletonBox className="h-8 w-48 mx-auto" />
        <SkeletonBox className="h-32 w-full" />
        <p className="text-xs font-bold text-slate-500">جارِ تحميل تفاصيل الوحدة والصور...</p>
      </Card>
    );
  }

  if (!detail) return null;

  const isPending = detail.status === 'PENDING_REVIEW';

  const formatPhone = (phone?: string) => {
    if (!phone) return 'غير متوفر';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 8) {
      const firstParts = phone.slice(0, 4);
      const lastParts = phone.slice(-2);
      return `${firstParts}*****${lastParts}`;
    }
    return phone;
  };

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
            العودة للقائمة
          </Button>
          <span className="text-slate-300 text-sm">/</span>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0059FF]" />
            <h2 className="font-extrabold text-sm text-slate-900">مراجعة الوحدة العقارية</h2>
          </div>
        </div>

        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-50 text-[#0059FF] border border-blue-200">
          مراجعة الإدراج
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
        <div className="flex flex-col lg:flex-row justify-between lg:items-start border-b border-slate-100 pb-5 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-[#0059FF]">{detail.title}</h1>
              <StatusBadge status={detail.status} />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{detail.address}</span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">{detail.description}</p>
          </div>

          <div className="text-right bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shrink-0">
            <div className="text-[11px] font-bold text-emerald-800">السعر المقترح لليلة</div>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{detail.pricePerNight?.toLocaleString()} ج.م</div>
          </div>
        </div>

        {/* Features & Owner Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mb-8">
          <div className="space-y-4 bg-slate-50/80 p-5 rounded-xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#0059FF]" />
                مواصفات الوحدة
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-200"><Bed className="w-4 h-4 text-slate-600" /></div>
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold">غرف النوم</div>
                        <div className="font-black text-slate-800">{detail.bedrooms || 0}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-200"><Bath className="w-4 h-4 text-slate-600" /></div>
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold">الحمامات</div>
                        <div className="font-black text-slate-800">{detail.bathrooms || 0}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-200"><Users className="w-4 h-4 text-slate-600" /></div>
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold">السعة القصوى</div>
                        <div className="font-black text-slate-800">{detail.maxGuests || 0} ضيف</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-200"><Building2 className="w-4 h-4 text-slate-600" /></div>
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold">النوع</div>
                        <div className="font-black text-slate-800">{detail.unitType}</div>
                    </div>
                </div>
            </div>

            {detail.amenities && detail.amenities.length > 0 && (
                <div className="pt-3 border-t border-slate-200/80">
                    <div className="text-[11px] font-bold text-slate-500 mb-2">المرافق:</div>
                    <div className="flex flex-wrap gap-1.5">
                        {detail.amenities.map((am: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-700">
                                {am}
                            </span>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-900 flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-[#0059FF]" />
                بيانات المالك
            </h3>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-bold text-xs flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> اسم المالك:</span>
              <strong className="text-slate-900 text-sm">{detail.ownerName}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-bold text-xs flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> رقم الهاتف:</span>
              <strong className="text-slate-900 font-mono text-sm" dir="ltr">{formatPhone(detail.ownerPhone)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold text-xs flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> حالة التوثيق:</span>
              <strong className="text-emerald-900 text-sm">{detail.verificationStatus}</strong>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 font-bold text-xs">حالة الحساب:</span>
              <strong className="text-slate-700 text-sm">{detail.ownerAccountStatus || 'نشط'}</strong>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="mb-6">
            <h3 className="font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4 text-[#0059FF]" />
                الصور المرفقة ({images.length})
            </h3>
            {images.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 font-semibold text-sm">
                    لا توجد صور مرفقة لهذه الوحدة.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((img: any, idx: number) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative group">
                            <img src={img.url} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        </div>
                    ))}
                </div>
            )}
        </div>
      </Card>

      {/* Executive Execution Actions Panel */}
      <Card className="p-6 bg-white">
        <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>قرار الإدارة (Admin Review Decision)</span>
        </h3>

        <div className="flex flex-wrap gap-4">
          <Button
            variant="primary"
            size="md"
            disabled={!isPending}
            onClick={() => setShowApproveModal(true)}
            icon={<CheckCircle2 className="w-4 h-4" />}
            className="!bg-[#0059FF] hover:!bg-blue-700"
          >
            اعتماد ونشر (Approve & Publish)
          </Button>

          <Button
            variant="danger"
            size="md"
            disabled={!isPending}
            onClick={() => setShowRejectModal(true)}
            icon={<XCircle className="w-4 h-4" />}
          >
            رفض (Reject)
          </Button>
        </div>
      </Card>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="تأكيد اعتماد ونشر الوحدة"
        primaryActionLabel="تأكيد الاعتماد والنشر"
        onPrimaryAction={handleApprove}
        isPrimaryLoading={isSubmitting}
      >
        <div className="text-sm font-semibold text-slate-700 py-2">
            هل أنت متأكد من مراجعة كافة البيانات والصور واعتماد هذه الوحدة للعرض للجمهور؟
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="رفض إدراج الوحدة العقارية"
        primaryActionLabel="تأكيد الرفض"
        onPrimaryAction={handleReject}
        primaryActionVariant="danger"
        isPrimaryLoading={isSubmitting}
      >
        <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">سبب الرفض الموجه للمالك (إجباري):</label>
              <textarea
                rows={4}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:border-rose-500 focus:outline-none"
                placeholder="يرجى توضيح سبب الرفض بالتفصيل (مثل: الصور غير واضحة، السعر مبالغ فيه)..."
              />
            </div>
        </div>
      </Modal>

    </div>
  );
}
