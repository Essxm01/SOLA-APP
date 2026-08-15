import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyStatusChip } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PREDEFINED_AMENITIES, PROPERTY_STATUS_CONFIG } from '../../constants/theme';
import {
  ArrowRight,
  MapPin,
  BedDouble,
  Bath,
  Users,
  Maximize2,
  AlertCircle,
  Edit,
  Send,
  Trash2,
  CheckCircle2,
  Building,
  Info,
  Calendar,
} from 'lucide-react';

export const PropertyDetailsView: React.FC = () => {
  const {
    properties,
    selectedPropertyId,
    setPropertyViewMode,
    openAddPropertyWizard,
    openCalendarForProperty,
    deleteProperty,
  } = useApp();

  const property = properties.find((p) => p.id === selectedPropertyId);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!property) {
    return (
      <div className="p-6 text-center text-slate-500 dir-rtl">
        <p>لم يتم العثور على الوحدة المطلوبة.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPropertyViewMode('list')}
          className="mt-4"
        >
          العودة لقائمة الوحدات
        </Button>
      </div>
    );
  }

  const statusConfig = PROPERTY_STATUS_CONFIG[property.status];

  const handleEdit = () => {
    openAddPropertyWizard(property);
  };

  const handleDelete = async () => {
    if (window.confirm('هل أنت تأكد من رغبتك في أرشفة هذه الوحدة آمنة؟')) {
      await deleteProperty(property.id);
    }
  };

  return (
    <div className="p-4 space-y-4 dir-rtl text-right pb-10">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPropertyViewMode('list')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs hover:bg-slate-50"
        >
          <ArrowRight className="w-4 h-4 text-[#0059FF]" />
          <span>العودة لقائمة الوحدات</span>
        </button>

        <PropertyStatusChip status={property.status} />
      </div>

      {/* Image Gallery */}
      <div className="space-y-2">
        <div className="relative h-56 w-full rounded-2xl overflow-hidden shadow-md border border-slate-200">
          <img
            src={property.images[selectedImageIndex] || property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
            صورة {selectedImageIndex + 1} من {property.images.length}
          </div>
          <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-lg dir-ltr">
            {property.pricePerNight.toLocaleString()} {property.currency} / ليلة
          </div>
        </div>

        {/* Thumbnail switcher if multiple images */}
        {property.images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {property.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                  selectedImageIndex === idx ? 'border-[#0059FF] scale-105 shadow-sm' : 'border-transparent opacity-70'
                }`}
              >
                <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Quick Action Link (Phase 3A Integration) */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0059FF] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">إدارة التقويم والتوفر</span>
            <span className="text-[11px] text-slate-500 block">حدد أيام التوفر وحظر الأيام الخاصة</span>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openCalendarForProperty(property.id)}
          className="text-xs py-1 px-3"
        >
          فتح التقويم 📅
        </Button>
      </div>

      {/* Status Description Banner */}
      <div
        className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5">{statusConfig.label}</strong>
          {statusConfig.description}
        </div>
      </div>

      {/* Rejection Reason Box if REJECTED */}
      {property.status === 'REJECTED' && property.rejectionReason && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>سبب عدم الاعتماد وملاحظات مراجعة Sola</span>
          </div>
          <p className="text-xs text-rose-950 bg-white/80 p-3 rounded-xl border border-rose-200 leading-relaxed font-medium">
            "{property.rejectionReason}"
          </p>
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={handleEdit}
            icon={<Edit className="w-4 h-4" />}
            className="text-xs font-bold py-3"
          >
            تعديل بيانات الوحدة وإعادة الإرسال للمراجعة
          </Button>
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0059FF] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            {property.unitType}
          </span>
          <span className="text-xs text-slate-400 font-mono">تاريخ التحديث: {property.updatedAt}</span>
        </div>

        <h1 className="text-lg font-black text-slate-900 leading-snug">{property.title}</h1>

        <div className="space-y-1 text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>المنتجع / القرية:</strong> {property.resortName} ({property.region})
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>العنوان التفصيلي:</strong> {property.address || property.locationName}
            </span>
          </p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <BedDouble className="w-4 h-4 text-[#0059FF] mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 block">الغرف</span>
            <span className="text-xs font-bold text-slate-900">{property.bedrooms} غرف</span>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <Bath className="w-4 h-4 text-[#0059FF] mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 block">الحمامات</span>
            <span className="text-xs font-bold text-slate-900">{property.bathrooms} حمام</span>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <Users className="w-4 h-4 text-[#0059FF] mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 block">الضيوف</span>
            <span className="text-xs font-bold text-slate-900">{property.maxGuests} ضيوف</span>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <Maximize2 className="w-4 h-4 text-[#0059FF] mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 block">المساحة</span>
            <span className="text-xs font-bold text-slate-900">{property.areaSqM || 120} م²</span>
          </div>
        </div>
      </div>

      {/* Description Section */}
      {property.description && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-slate-900">وصف الوحدة الساحلية</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{property.description}</p>
        </div>
      )}

      {/* Amenities Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">المرافق والخدمات المتاحة</h3>
        <div className="grid grid-cols-2 gap-2">
          {PREDEFINED_AMENITIES.map((amenity) => {
            const isAvailable = property.amenities.includes(amenity.id);
            return (
              <div
                key={amenity.id}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  isAvailable
                    ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-400 line-through opacity-60'
                }`}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${isAvailable ? 'text-[#0059FF]' : 'text-slate-300'}`}
                />
                <span>{amenity.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* House Rules Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">قواعد الوحدة والإقامة</h3>
        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
            <span>مواعيد تسجيل الدخول والخروج</span>
            <span className="font-mono font-bold text-slate-900">
              دخول {property.houseRules?.checkInTime || '14:00'} | خروج {property.houseRules?.checkOutTime || '12:00'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl border border-slate-100 bg-slate-50">
              <span className="block text-[10px] text-slate-500">التدخين</span>
              <span className="font-bold text-xs">
                {property.houseRules?.smokingAllowed ? 'مسموح ✅' : 'ممنوع ❌'}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-100 bg-slate-50">
              <span className="block text-[10px] text-slate-500">الحفلات</span>
              <span className="font-bold text-xs">
                {property.houseRules?.partiesAllowed ? 'مسموح ✅' : 'ممنوع ❌'}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-100 bg-slate-50">
              <span className="block text-[10px] text-slate-500">حيوانات أليفة</span>
              <span className="font-bold text-xs">
                {property.houseRules?.petsAllowed ? 'مسموح ✅' : 'ممنوع ❌'}
              </span>
            </div>
          </div>

          {property.houseRules?.additionalRules && (
            <p className="p-2.5 bg-amber-50 rounded-xl text-amber-900 border border-amber-200 text-xs">
              <strong>شروط إضافية:</strong> {property.houseRules.additionalRules}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons Row According to Property Status */}
      <div className="pt-2 flex flex-col gap-2">
        {property.status === 'DRAFT' && (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleEdit}
              icon={<Send className="w-4 h-4" />}
              className="py-3.5 font-bold shadow-md shadow-blue-500/20"
            >
              متابعة إعداد الوحدة وإرسالها للمراجعة
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={handleDelete}
              icon={<Trash2 className="w-4 h-4" />}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              حذف المسودة
            </Button>
          </>
        )}

        {property.status === 'PUBLISHED' && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleEdit}
            icon={<Edit className="w-4 h-4" />}
            className="py-3.5 font-bold shadow-md shadow-blue-500/20"
          >
            تعديل بيانات الوحدة الساحلية
          </Button>
        )}

        {property.status === 'PENDING_REVIEW' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 font-bold">
            الوحدة قيد مراجعة فريق الجودة حالياً. لا يمكنك التعديل حتى اكتمال الفحص.
          </div>
        )}
      </div>
    </div>
  );
};
