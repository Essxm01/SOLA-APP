import { useState, useEffect } from 'react';
import {
  Building2,
  User,
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
      setActionSuccess('تم اعتماد الوحدة ونشرها بنجاح بالمنصة.');
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
      if (!rejectionNote.trim()) throw new Error('يرجى كتابة سبب رفض الوحدة العقارية');

      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/properties/${propertyId}/review`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `review_${Date.now()}`,
        },
        body: JSON.stringify({
          decision: 'REJECTED',
          reviewNotes: rejectionNote,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'فشل رفض الوحدة');

      setShowRejectModal(false);
      setActionSuccess('تم تسجيل رفض الوحدة وتنبيه المالك بالتعديلات المطلوب إجراءها.');
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
          العودة لطابور المراجعة
        </Button>
        <AlertBanner type="error" message={error || 'الوحدة العقارية غير موجودة'} />
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
              title="العودة القائمة"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                  <Building2 className="w-3.5 h-3.5 text-[#0059FF]" />
                  <span>معاينة التفاصيل</span>
                </span>
                <StatusBadge status={detail.status} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{detail.title}</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0059FF]" />
                <span>{detail.address || 'العنوان غير محدد'}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {detail.status === 'PENDING_REVIEW' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setShowApproveModal(true)}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  اعتماد ونشر
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  icon={<XCircle className="w-4 h-4" />}
                >
                  رفض الوحدة
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
        
        {/* Left Column (2 Cols): Property Information & Images */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Property Specifications Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0059FF]" />
              <span>مواصفات العين العقارية</span>
            </h2>

            {/* Quick Specs Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">السعر / ليلة</span>
                <strong className="text-base font-black text-slate-900">{detail.pricePerNight?.toLocaleString()} <span className="text-xs font-normal">ج.م</span></strong>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">غرف النوم</span>
                <strong className="text-base font-black text-slate-900 flex items-center justify-center gap-1">
                  <Bed className="w-4 h-4 text-blue-500" />
                  <span>{detail.bedrooms || 1}</span>
                </strong>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">الحمامات</span>
                <strong className="text-base font-black text-slate-900 flex items-center justify-center gap-1">
                  <Bath className="w-4 h-4 text-blue-500" />
                  <span>{detail.bathrooms || 1}</span>
                </strong>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">أقصى ضيوف</span>
                <strong className="text-base font-black text-slate-900 flex items-center justify-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>{detail.maxGuests || 2}</span>
                </strong>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-700">الوصف العام للعين:</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                {detail.description || 'لا يوجد وصف مدون للعين.'}
              </p>
            </div>
          </Card>

          {/* Image Gallery Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#0059FF]" />
              <span>معرض الصور المرفقة ({images.length})</span>
            </h2>

            {images.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold">
                لم يتم إرفاق صور بالعين بعد.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img: any, idx: number) => (
                  <div key={img.id || idx} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative group">
                    <img src={img.url} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Right Column (1 Col): Owner & Verification Info */}
        <div className="space-y-6">
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0059FF]" />
              <span>بيانات مالك العقار</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold">اسم المالك:</span>
                <strong className="text-slate-900 font-extrabold">{detail.ownerName || 'مالك بدون اسم'}</strong>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                <strong className="text-slate-900 font-mono dir-ltr">{detail.ownerPhone || '—'}</strong>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold">توثيق المالك:</span>
                <StatusBadge status={detail.ownerVerificationStatus || 'UNVERIFIED'} />
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="تأكيد اعتماد ونشر الوحدة"
        primaryActionLabel="اعتماد ونشر فوراً"
        onPrimaryAction={handleApprove}
        isPrimaryLoading={isSubmitting}
      >
        <p className="text-xs text-slate-600">
          هل أنت تأكيد اعتماد الوحدة العقارية <strong>({detail.title})</strong> ونشرها لتصبح متاحة للحجز المباشر بالمنصة؟
        </p>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="تأكيد رفض طلب النشر"
        primaryActionLabel="تأكيد الرفض وتنبيه المالك"
        onPrimaryAction={handleReject}
        primaryActionVariant="danger"
        isPrimaryLoading={isSubmitting}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            يرجى تدوين ملاحظات الرفض الإدارية بوضوح ليتم إرسالها للمالك وتوجيهه للتعديل:
          </p>
          <textarea
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="مثال: يرجى رفع صور أعلى جودة للعين، أو تصحيح عنوان الموقع المرفق..."
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-200 focus:border-rose-500 outline-none h-24"
          />
        </div>
      </Modal>

    </div>
  );
}
