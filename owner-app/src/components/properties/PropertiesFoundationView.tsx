import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Property, PropertyStatus, VerificationDocumentType } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { BottomSheet } from '../ui/BottomSheet';
import { AddPropertyWizard } from './AddPropertyWizard';
import {
  PROPERTY_STATUS_CONFIG,
  PROPERTY_VERIFICATION_CONFIG,
  PROPERTY_TYPE_CONFIG,
} from '../../constants/theme';
import {
  Building,
  Plus,
  MapPin,
  Bed,
  Bath,
  Users,
  Eye,
  PauseCircle,
  PlayCircle,
  Send,
  Calendar,
  DollarSign,
  History,
  Archive,
  XCircle,
  RotateCcw,
  ShieldCheck,
  FileText,
  Upload,
} from 'lucide-react';

export const PropertiesFoundationView: React.FC = () => {
  const {
    properties,
    metrics,
    propertyViewMode,
    selectedPropertyId,
    openAddPropertyWizard,
    openPropertyDetails,
    openCalendarForProperty,
    submitPropertyForReview,
    pauseProperty,
    resumeProperty,
    archiveProperty,
    restoreProperty,
    submitOwnerVerificationDocuments,
    setDailyPricing,
    getPropertyAuditLogs,
    isEmptyDashboard,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | PropertyStatus>('all');
  const [activeProperty, setActiveProperty] = useState<Property | null>(() => {
    return (properties || []).find((p) => p.id === selectedPropertyId) || (properties || [])[0] || null;
  });

  // BottomSheet States
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState<boolean>(false);
  const [isPricingSheetOpen, setIsPricingSheetOpen] = useState<boolean>(false);
  const [isVerificationSheetOpen, setIsVerificationSheetOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Daily Pricing Sheet Inputs
  const [customDate, setCustomDate] = useState<string>('2026-08-25');
  const [customPrice, setCustomPrice] = useState<number>(9500);

  // Verification Document Sheet Form State
  const [docType, setDocType] = useState<VerificationDocumentType>('NATIONAL_ID');
  const [docTitle, setDocTitle] = useState<string>('صورة بطاقة الرقم القومي (الوجهان)');
  const [docUrl, setDocUrl] = useState<string>('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80');

  const filteredProperties = properties.filter((p) => {
    if (activeFilter === 'all') return true;
    return p.status === activeFilter;
  });

  const handleOpenDetails = async (property: Property) => {
    setActiveProperty(property);
    openPropertyDetails(property.id);
    const logs = await getPropertyAuditLogs(property.id);
    setAuditLogs(logs);
    setIsDetailsSheetOpen(true);
  };

  const handleOpenPricingEditor = (property: Property) => {
    setActiveProperty(property);
    setCustomPrice(property.pricePerNight);
    setIsPricingSheetOpen(true);
  };

  const handleOpenVerification = (property: Property) => {
    setActiveProperty(property);
    setIsVerificationSheetOpen(true);
  };

  const handleSaveCustomPricing = async () => {
    if (!activeProperty || !customDate) return;
    try {
      await setDailyPricing(activeProperty.id, { [customDate]: Number(customPrice) });
      setIsPricingSheetOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitVerificationDocs = async () => {
    if (!activeProperty || !docTitle || !docUrl) return;
    try {
      await submitOwnerVerificationDocuments(activeProperty.id, [
        { type: docType, title: docTitle, fileUrl: docUrl },
      ]);
      setIsVerificationSheetOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Render Property Wizard if in wizard mode
  if (propertyViewMode === 'wizard') {
    return <AddPropertyWizard />;
  }

  return (
    <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-20">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-[#0059FF]" />
            <span>وحداتي العقارية (الوحدات والأسعار)</span>
          </h2>
          <p className="text-xs text-slate-500">
            إدارة الوحدات الساحلية، متابعة حالات النشر والتوثيق، وتحديد الأسعار اليومية
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openAddPropertyWizard()}
          icon={<Plus className="w-4 h-4" />}
          className="bg-[#0059FF] font-bold shadow-xs text-xs py-2 px-3 shrink-0"
        >
          إضافة وحدة ➕
        </Button>
      </div>

      {/* Property Metrics Dashboard Summary Bar */}
      <div className="grid grid-cols-4 gap-2 bg-slate-900 text-white p-3 rounded-2xl text-center shadow-md">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-bold">إجمالي الوحدات</span>
          <span className="text-base font-black text-amber-400 font-mono">
            {metrics.totalPropertiesCount}
          </span>
        </div>
        <div className="space-y-0.5 border-r border-slate-800">
          <span className="text-[10px] text-slate-400 block font-bold">المنشورة</span>
          <span className="text-base font-black text-emerald-400 font-mono">
            {metrics.publishedPropertiesCount}
          </span>
        </div>
        <div className="space-y-0.5 border-r border-slate-800">
          <span className="text-[10px] text-slate-400 block font-bold">قيد المراجعة</span>
          <span className="text-base font-black text-amber-300 font-mono">
            {metrics.underReviewPropertiesCount}
          </span>
        </div>
        <div className="space-y-0.5 border-r border-slate-800">
          <span className="text-[10px] text-slate-400 block font-bold">الموقوفة مؤقتاً</span>
          <span className="text-base font-black text-blue-400 font-mono">
            {metrics.pausedPropertiesCount}
          </span>
        </div>
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
          الكل ({properties.length})
        </button>

        <button
          onClick={() => setActiveFilter('PUBLISHED')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeFilter === 'PUBLISHED'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          المنشورة ({properties.filter((p) => p.status === 'PUBLISHED').length})
        </button>

        <button
          onClick={() => setActiveFilter('PENDING_REVIEW')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeFilter === 'PENDING_REVIEW'
              ? 'bg-white text-amber-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          قيد المراجعة ({properties.filter((p) => p.status === 'PENDING_REVIEW').length})
        </button>

        <button
          onClick={() => setActiveFilter('DRAFT')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeFilter === 'DRAFT'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          مسودة ({properties.filter((p) => p.status === 'DRAFT').length})
        </button>

        <button
          onClick={() => setActiveFilter('ARCHIVED')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeFilter === 'ARCHIVED'
              ? 'bg-white text-slate-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          المؤرشفة ({properties.filter((p) => p.status === 'ARCHIVED').length})
        </button>
      </div>

      {/* Property Stream List */}
      {isEmptyDashboard || filteredProperties.length === 0 ? (
        <EmptyState
          type="properties"
          title="لا توجد وحدات عقارية في هذه الفئة"
          description="يمكنك إضافة وحدات ساحلية جديدة أو تحرير المسودات الحالية بسهولة."
          actionText="إضافة وحدة جديدة 🚀"
          onAction={() => openAddPropertyWizard()}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredProperties.map((property) => {
            const statusConfig = PROPERTY_STATUS_CONFIG[property.status];
            const verifConfig = PROPERTY_VERIFICATION_CONFIG[property.verificationStatus];
            const typeConfig = PROPERTY_TYPE_CONFIG[property.propertyType || 'CHALET'];

            return (
              <div
                key={property.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:shadow-md transition-all space-y-3 p-4"
              >
                {/* Top Badge & Status Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{typeConfig.icon}</span>
                    <span className="text-xs font-bold text-slate-800">{typeConfig.label}</span>

                    {/* Verification Status Pill with Interactive Trigger */}
                    <button
                      onClick={() => handleOpenVerification(property)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${verifConfig.bg} ${verifConfig.text} flex items-center gap-1 hover:opacity-80 transition-opacity`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{verifConfig.label}</span>
                    </button>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Property Content */}
                <div className="flex gap-3">
                  <img
                    src={property.images[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80'}
                    alt={property.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />

                  <div className="min-w-0 space-y-1 text-xs">
                    <h3 className="font-extrabold text-slate-900 truncate text-xs">{property.title}</h3>
                    <p className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{property.locationName}</span>
                    </p>

                    <div className="flex items-center gap-3 text-slate-600 pt-1 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Bed className="w-3.5 h-3.5 text-slate-400" /> {property.bedrooms} غرف
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5 text-slate-400" /> {property.bathrooms} حمام
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {property.maxGuests} أفراد
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rejection Banner if REJECTED */}
                {property.status === 'REJECTED' && property.rejectionReason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
                    <span className="font-bold block flex items-center gap-1 text-rose-700">
                      <XCircle className="w-4 h-4" /> سبب الرفض من الإدارة:
                    </span>
                    <p className="text-[11px] text-rose-800 leading-relaxed">{property.rejectionReason}</p>
                  </div>
                )}

                {/* Price & Actions Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">سعر الليلة الافتراضي</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {property.pricePerNight.toLocaleString()} {property.currency}
                    </span>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {property.status !== 'ARCHIVED' && (
                      <>
                        <button
                          onClick={() => handleOpenPricingEditor(property)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold hover:bg-amber-100 transition-colors flex items-center gap-1"
                          title="محرر الأسعار اليومية"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>أسعار يومية</span>
                        </button>

                        <button
                          onClick={() => openCalendarForProperty(property.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-[#0059FF] border border-blue-200 text-[11px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                          title="التقويم والتوفر"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>التقويم</span>
                        </button>
                      </>
                    )}

                    {property.status === 'PUBLISHED' && (
                      <button
                        onClick={() => pauseProperty(property.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                        title="إيقاف مؤقت"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>إيقاف</span>
                      </button>
                    )}

                    {property.status === 'PAUSED' && (
                      <button
                        onClick={() => resumeProperty(property.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                        title="استئناف النشر"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>استئناف</span>
                      </button>
                    )}

                    {(property.status === 'DRAFT' || property.status === 'REJECTED') && (
                      <button
                        onClick={() => submitPropertyForReview(property.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#0059FF] text-white text-[11px] font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>طلب مراجعة</span>
                      </button>
                    )}

                    {/* Gap 4C: Restorable Archive Action */}
                    {property.status === 'ARCHIVED' && (
                      <button
                        onClick={() => restoreProperty(property.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-bold hover:bg-purple-100 transition-colors flex items-center gap-1"
                        title="استرجاع الوحدة لمسودة"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        <span>استرجاع لمسودة 📄</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenDetails(property)}
                      className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      title="تفاصيل وسجل التدقيق"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC DAILY PRICING EDITOR BOTTOMSHEET */}
      <BottomSheet
        isOpen={isPricingSheetOpen}
        onClose={() => setIsPricingSheetOpen(false)}
        title="محرر الأسعار اليومية الديناميكية 💰"
      >
        {activeProperty && (
          <div className="space-y-4 dir-rtl text-right">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed font-semibold">
              ℹ️ <strong>ملاحظة هامة:</strong> تغيير سعر ليلة معينة يطبق على الحجوزات المستقبلية فقط. <strong>الحجوزات القائمة والقديمة تظل ثابتة ومحمية بـ BookingPropertySnapshot.</strong>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">{activeProperty.title}</h4>
              <p className="text-[11px] text-slate-500">السعر الافتراضي الأساسي: {activeProperty.pricePerNight.toLocaleString()} ج.م / ليلة</p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">تاريخ الليلة المطلوب:</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#0059FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">السعر المخصص (ج.م):</label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#0059FF]"
                />
              </div>
            </div>

            {activeProperty.pricing?.dailyPricingMap && Object.keys(activeProperty.pricing.dailyPricingMap).length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-800 block">جدول الأسعار اليومية المسجلة:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {Object.entries(activeProperty.pricing.dailyPricingMap).map(([date, price]) => (
                    <div key={date} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-mono">
                      <span className="text-slate-700 font-bold">{date}</span>
                      <span className="text-[#0059FF] font-black">{price.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="md" fullWidth onClick={() => setIsPricingSheetOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" fullWidth onClick={handleSaveCustomPricing} className="bg-[#0059FF] font-bold">
                حفظ السعر اليومي 💾
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* GAP 4B: OWNER VERIFICATION DOCUMENT UPLOAD BOTTOMSHEET */}
      <BottomSheet
        isOpen={isVerificationSheetOpen}
        onClose={() => setIsVerificationSheetOpen(false)}
        title="توثيق الملكية والهوية الشاملة 📄"
      >
        {activeProperty && (
          <div className="space-y-4 dir-rtl text-right text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed font-semibold">
              🛡️ <strong>التزام التوثيق الرسمية:</strong> ارفع صورة بطاقة الرقم القومي وسند الملكية أو عقد الإدارة المعتمد. التوثيق يعزز ثقة الضيوف وشارة التوثيق الذهبية.
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">{activeProperty.title}</h4>
              <p className="text-slate-500 text-[11px]">الحالة الحالية: <strong className="text-[#0059FF]">{PROPERTY_VERIFICATION_CONFIG[activeProperty.verificationStatus].label}</strong></p>
            </div>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">نوع المستند المرفوع:</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as VerificationDocumentType)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                >
                  <option value="NATIONAL_ID">بطاقة الرقم القومي (المالك)</option>
                  <option value="PROPERTY_DEED">عقد ملكية الشاليه / الفيلا</option>
                  <option value="LEASE_CONTRACT">عقد إيجار / إثبات إدارة معتمد</option>
                  <option value="OTHER">مستند إثبات آخر</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">عنوان المستند:</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">رابط المستند (صورة / PDF):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                  />
                  <span className="p-2.5 bg-blue-50 text-[#0059FF] rounded-xl flex items-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* Existing Verification Documents */}
            {activeProperty.verificationDocuments && activeProperty.verificationDocuments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-slate-800 block">المستندات المرفوعة سابقاً:</span>
                <div className="space-y-1.5">
                  {activeProperty.verificationDocuments.map((doc) => (
                    <div key={doc.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#0059FF]" />
                        <span className="font-bold text-slate-900">{doc.title}</span>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="md" fullWidth onClick={() => setIsVerificationSheetOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" fullWidth onClick={handleSubmitVerificationDocs} className="bg-[#0059FF] font-bold">
                إرسال المستندات للتوثيق 📄
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* PROPERTY DETAILS & AUDIT TRAIL BOTTOMSHEET */}
      <BottomSheet
        isOpen={isDetailsSheetOpen}
        onClose={() => setIsDetailsSheetOpen(false)}
        title="تفاصيل الوحدة وسجل التغييرات 📜"
      >
        {activeProperty && (
          <div className="space-y-4 dir-rtl text-right">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">حالة الإعلان والتأكيد:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold ${PROPERTY_STATUS_CONFIG[activeProperty.status].bg} ${PROPERTY_STATUS_CONFIG[activeProperty.status].text}`}>
                {PROPERTY_STATUS_CONFIG[activeProperty.status].label}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">المواصفات الفنية والموقع:</span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <p><strong>المحافظة:</strong> {activeProperty.location?.governorate || activeProperty.region}</p>
                <p><strong>المدينة:</strong> {activeProperty.location?.city || activeProperty.locationName}</p>
                <p><strong>القرية:</strong> {activeProperty.resortName}</p>
                <p><strong>السعة القصوى:</strong> {activeProperty.maxGuests} أفراد</p>
                <p><strong>غرف النوم:</strong> {activeProperty.bedrooms} غرف</p>
                <p><strong>الحمامات:</strong> {activeProperty.bathrooms} حمام</p>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <History className="w-4 h-4" />
                <span>سجل التدقيق والتغييرات التاريخية (Property Audit Trail)</span>
              </span>

              {auditLogs.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-slate-800/80 p-2.5 rounded-xl text-[11px] space-y-0.5 border border-slate-700">
                      <div className="flex items-center justify-between text-slate-400 font-mono">
                        <span>{log.action}</span>
                        <span>{log.createdAt}</span>
                      </div>
                      <p className="text-slate-200">المنفذ: {log.actorType === 'OWNER' ? 'المالك' : 'Sola Admin'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">لا توجد سجلات تغيير مسجلة بعد.</p>
              )}
            </div>

            {/* Archive / Restore Action Buttons */}
            <div className="pt-2">
              {activeProperty.status === 'ARCHIVED' ? (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setIsDetailsSheetOpen(false);
                    restoreProperty(activeProperty.id);
                  }}
                  icon={<RotateCcw className="w-4 h-4" />}
                  className="text-purple-700 border-purple-300 hover:bg-purple-50 font-bold"
                >
                  استرجاع الوحدة لمسودة 📄
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setIsDetailsSheetOpen(false);
                    archiveProperty(activeProperty.id);
                  }}
                  icon={<Archive className="w-4 h-4" />}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
                >
                  أرشفة الوحدة آمنة 📁
                </Button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
