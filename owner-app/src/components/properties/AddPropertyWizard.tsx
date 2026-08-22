import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import type { Property, PropertyRules, PropertyType } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { repositoryFactory } from '../../services/repositoryFactory';
import {
  EGYPTIAN_COASTAL_REGIONS,
  UNIT_TYPES,
  PREDEFINED_AMENITIES,
} from '../../constants/theme';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Save,
  Send,
  Building2,
  MapPin,
  BedDouble,
  Sliders,
  ShieldAlert,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';

const DEFAULT_HOUSE_RULES: PropertyRules = {
  minStay: 2,
  maxStay: 30,
  smokingAllowed: false,
  partiesAllowed: false,
  petsAllowed: false,
  childrenAllowed: true,
  checkInTime: '14:00',
  checkOutTime: '12:00',
};

export const AddPropertyWizard: React.FC = () => {
  const {
    currentDraft,
    setCurrentDraft,
    wizardStep,
    setWizardStep,
    setPropertyViewMode,
    createOrUpdateProperty,
    showToast,
  } = useApp();

  const [formData, setFormData] = useState<Partial<Property>>(() => {
    if (currentDraft) return currentDraft;
    return {
      unitType: 'شاليه',
      propertyType: 'CHALET',
      region: 'الساحل الشمالي',
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      areaSqM: 120,
      bedsCount: 3,
      pricePerNight: 5000,
      currency: 'ج.م',
      amenities: ['pool', 'central_ac', 'wifi'],
      images: [],
      mainImageIndex: 0,
      houseRules: DEFAULT_HOUSE_RULES,
      status: 'DRAFT',
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftIdRef = useRef<string | undefined>(formData.id || currentDraft?.id);

  // Sync formData with draft in context
  useEffect(() => {
    if (formData.id) {
      draftIdRef.current = formData.id;
    }
    setCurrentDraft(formData);
  }, [formData, setCurrentDraft]);

  const updateField = (field: keyof Property, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field as string]: '' }));
    }
  };

  const updateHouseRule = (key: keyof PropertyRules, value: any) => {
    setFormData((prev) => ({
      ...prev,
      houseRules: {
        ...(prev.houseRules || DEFAULT_HOUSE_RULES),
        [key]: value,
      },
    }));
  };

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title || formData.title.trim().length < 5) {
        errs.title = 'اسم الوحدة مطلوب ويجب ألا يقل عن 5 أحرف (مثال: شالية فاخر صف أول - مراسي)';
      }
      if (!formData.pricePerNight || formData.pricePerNight <= 0) {
        errs.pricePerNight = 'يرجى إدخال سعر إيجار الليلة بالجنية المصري';
      }
    }

    if (step === 2) {
      if (!formData.resortName || formData.resortName.trim().length < 2) {
        errs.resortName = 'اسم القرية أو المنتجع الساحلي مطلوب (مثال: مراسي، هاسيندا، بورتو السخنة)';
      }
    }

    if (step === 6) {
      if (!formData.images || formData.images.length === 0) {
        errs.images = 'يجب إضافة صورة واحدة على الأقل للوحدة قبل المتابعة';
        showToast('يجب إضافة صورة واحدة على الأقل للوحدة 📸', 'error');
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(wizardStep)) {
      setWizardStep(wizardStep + 1);
    }
  };

  const prevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true);
      const effectiveId = formData.id || draftIdRef.current || currentDraft?.id;
      const saved = await createOrUpdateProperty({ ...formData, id: effectiveId, status: 'DRAFT' }, false);
      if (saved && saved.id) {
        draftIdRef.current = saved.id;
        const updated = { ...formData, id: saved.id };
        setFormData(updated);
        setCurrentDraft(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!formData.images || formData.images.length === 0) {
      showToast('يجب رفع وتأكيد صورة واحدة على الأقل قبل إرسال الوحدة للمراجعة', 'error');
      setWizardStep(6);
      return;
    }

    try {
      setIsSubmitting(true);
      const effectiveId = formData.id || draftIdRef.current || currentDraft?.id;
      await createOrUpdateProperty({ ...formData, id: effectiveId }, true);
      // Auto-return immediately to Property Hub
      setWizardStep(1);
      setPropertyViewMode('list');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeviceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    setUploadProgress('جارِ تهيئة مسودة الوحدة للرفع...');

    try {
      let currentPropId = formData.id || draftIdRef.current || currentDraft?.id;
      if (!currentPropId) {
        const saved = await createOrUpdateProperty({ ...formData, status: 'DRAFT' }, false);
        currentPropId = saved.id;
        draftIdRef.current = saved.id;
        const updated = { ...formData, id: saved.id };
        setFormData(updated);
        setCurrentDraft(updated);
      }

      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
          showToast(`الملف ${file.name} ليس بصيغة مدعومة (JPEG, PNG, WEBP فقط)`, 'error');
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          showToast(`الملف ${file.name} يتجاوز الحجم الأقصى 10 ميجابايت`, 'error');
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        setIsUploadingImage(false);
        setUploadProgress(null);
        return;
      }

      const newUrls: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(`جارِ رفع صورة (${i + 1} من ${validFiles.length})...`);

        // 1. Request Presigned Upload Intent
        const presigned = await repositoryFactory.property.getImagePresignedUrl(currentPropId, {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });

        // 2. Direct Binary Upload to Storage
        const uploadRes = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`فشل رفع ملف ${file.name} إلى مساحة التخزين`);
        }

        // 3. Commit Metadata to PostgreSQL
        const committed = await repositoryFactory.property.commitPropertyImage(currentPropId, {
          intentId: presigned.intentId,
          objectKey: presigned.objectKey,
          fileUrl: presigned.downloadUrl,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          sortOrder: (formData.images?.length || 0) + i,
        });

        newUrls.push(committed.fileUrl || presigned.downloadUrl);
      }

      if (newUrls.length > 0) {
        const updatedImages = [...(formData.images || []), ...newUrls];
        updateField('images', updatedImages);
        showToast(`تم رفع وتأكيد ${newUrls.length} صورة بنجاح 📸`, 'success');
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      showToast(err.message || 'حدث خطأ أثناء رفع الصور', 'error');
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addPhoto = () => {
    if (!newImageUrl || !newImageUrl.startsWith('http')) {
      showToast('يرجى إدخال رابط صورة صحيح (URL)', 'error');
      return;
    }
    const updatedImages = [...(formData.images || []), newImageUrl];
    updateField('images', updatedImages);
    setNewImageUrl('');
    showToast('تمت إضافة الصورة بنجاح 📸', 'success');
  };

  const deletePhoto = (index: number) => {
    const images = formData.images || [];
    const updated = images.filter((_, i) => i !== index);
    updateField('images', updated);

    if (formData.mainImageIndex === index) {
      updateField('mainImageIndex', 0);
    } else if ((formData.mainImageIndex || 0) > index) {
      updateField('mainImageIndex', (formData.mainImageIndex || 0) - 1);
    }
  };

  const toggleAmenity = (amenityId: string) => {
    const current = formData.amenities || [];
    if (current.includes(amenityId)) {
      updateField('amenities', current.filter((id) => id !== amenityId));
    } else {
      updateField('amenities', [...current, amenityId]);
    }
  };

  const stepsTitles = [
    'المعلومات الأساسية',
    'الموقع الساحلي',
    'تفاصيل الوحدة',
    'المرافق',
    'القواعد',
    'الصور',
    'المراجعة',
    'التأكيد',
  ];

  return (
    <div className="p-4 space-y-4 dir-rtl text-right min-h-full pb-16">
      {/* Wizard Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          onClick={() => {
            if (wizardStep === 8) {
              setPropertyViewMode('list');
            } else if (window.confirm('هل تريد الخروج من إعداد الوحدة؟ سيتم الاحتفاظ بالمسودة.')) {
              handleSaveDraft();
              setPropertyViewMode('list');
            }
          }}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowRight className="w-4 h-4 text-[#0059FF]" />
          <span>إغلاق</span>
        </button>

        <span className="text-xs font-bold text-slate-800">
          {formData.id ? 'تعديل الوحدة الساحلية' : 'إضافة وحدة جديدة'} (الخطوة {wizardStep} من 8)
        </span>

        {wizardStep < 8 && (
          <button
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="flex items-center gap-1 text-xs font-bold text-[#0059FF] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ مسودة</span>
          </button>
        )}
      </div>

      {/* Progress Bar & Step Dots */}
      {wizardStep < 8 && (
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-[#0059FF] transition-all duration-300"
              style={{ width: `${(wizardStep / 7) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
            <span>{stepsTitles[wizardStep - 1]}</span>
            <span>{Math.round((wizardStep / 7) * 100)}%</span>
          </div>
        </div>
      )}

      {/* STEP 1: Basic Info */}
      {wizardStep === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0059FF]" />
              <span>المعلومات الأساسية للوحدة الساحلية</span>
            </h3>
            <p className="text-xs text-slate-500">
              أدخل العنوان التجاري والنوع والسعر اليومي المعروض للمستأجرين.
            </p>
          </div>

          <Input
            label="عنوان / اسم الوحدة التجاري"
            placeholder="مثال: شالية فاخر مطل على البحر مباشرة - مراسي مراسينا"
            value={formData.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            error={errors.title}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-800">نوع الوحدة الساحلية</label>
            <div className="grid grid-cols-3 gap-2">
              {UNIT_TYPES.map((typeObj) => (
                <button
                  key={typeObj.id}
                  type="button"
                  onClick={() => {
                    updateField('unitType', typeObj.name);
                    updateField('propertyType', typeObj.id as PropertyType);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.propertyType === typeObj.id
                      ? 'bg-[#0059FF] text-white border-[#0059FF] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {typeObj.name}
                </button>
              ))}
            </div>
          </div>

          <Input
            type="number"
            label="السعر لكل ليلة (بالجنيه المصري EGP)"
            placeholder="8500"
            value={formData.pricePerNight || ''}
            onChange={(e) => updateField('pricePerNight', Number(e.target.value))}
            error={errors.pricePerNight}
          />

          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-sm font-semibold text-slate-800">وصف الوحدة والمميزات</label>
            <textarea
              rows={4}
              placeholder="اكتب وصفاً جذاباً يشرح موقع الشالية أو الفيلا، الإطلالة، الديكورات، التكييف، والمسافة من البحر..."
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full p-3 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059FF] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Location */}
      {wizardStep === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#0059FF]" />
              <span>الموقع والقرية الساحلية</span>
            </h3>
            <p className="text-xs text-slate-500">
              حدد المحافظة والمنتجع لمساعدة المستأجرين على الوصول بوضوح.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-800">المنطقة الساحلية</label>
            <div className="grid grid-cols-2 gap-2">
              {EGYPTIAN_COASTAL_REGIONS.map((regionObj) => (
                <button
                  key={regionObj.id}
                  type="button"
                  onClick={() => updateField('region', regionObj.name)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.region === regionObj.name
                      ? 'bg-[#0059FF] text-white border-[#0059FF] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {regionObj.name}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="اسم القرية / المنتجع الساحلي"
            placeholder="مثال: مراسي، هاسيندا باي، الجونة، بورتو السخنة"
            value={formData.resortName || ''}
            onChange={(e) => updateField('resortName', e.target.value)}
            error={errors.resortName}
          />

          <Input
            label="العنوان التفصيلي أو وصف الوصول"
            placeholder="مثال: المنطقة الساحلية - الكيلو 125 طريق الإسكندرية مطروح، فيلا رقم 42"
            value={formData.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
          />
        </div>
      )}

      {/* STEP 3: Property Specs */}
      {wizardStep === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-[#0059FF]" />
              <span>تفاصيل وسعة الوحدة الساحلية</span>
            </h3>
            <p className="text-xs text-slate-500">
              حدد سعة الغرف، الحمامات، وأقصى عدد ضيوف مسموح به.
            </p>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
            {/* Bedrooms counter */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">عدد غرف النوم</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('bedrooms', Math.max(1, (formData.bedrooms || 1) - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                >
                  -
                </button>
                <span className="text-base font-bold font-mono w-6 text-center">
                  {formData.bedrooms}
                </span>
                <button
                  type="button"
                  onClick={() => updateField('bedrooms', (formData.bedrooms || 1) + 1)}
                  className="w-8 h-8 rounded-lg bg-[#0059FF] font-bold text-white shadow-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Bathrooms counter */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-800">عدد الحمامات</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('bathrooms', Math.max(1, (formData.bathrooms || 1) - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                >
                  -
                </button>
                <span className="text-base font-bold font-mono w-6 text-center">
                  {formData.bathrooms}
                </span>
                <button
                  type="button"
                  onClick={() => updateField('bathrooms', (formData.bathrooms || 1) + 1)}
                  className="w-8 h-8 rounded-lg bg-[#0059FF] font-bold text-white shadow-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Max Guests counter */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-800">أقصى عدد للضيوف</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('maxGuests', Math.max(1, (formData.maxGuests || 1) - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                >
                  -
                </button>
                <span className="text-base font-bold font-mono w-6 text-center">
                  {formData.maxGuests}
                </span>
                <button
                  type="button"
                  onClick={() => updateField('maxGuests', (formData.maxGuests || 1) + 1)}
                  className="w-8 h-8 rounded-lg bg-[#0059FF] font-bold text-white shadow-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Beds Count */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-800">إجمالي عدد الأسرة</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('bedsCount', Math.max(1, (formData.bedsCount || 1) - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                >
                  -
                </button>
                <span className="text-base font-bold font-mono w-6 text-center">
                  {formData.bedsCount || 3}
                </span>
                <button
                  type="button"
                  onClick={() => updateField('bedsCount', (formData.bedsCount || 1) + 1)}
                  className="w-8 h-8 rounded-lg bg-[#0059FF] font-bold text-white shadow-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <Input
            type="number"
            label="مساحة الوحدة بالمتر المربع (م²)"
            placeholder="140"
            value={formData.areaSqM || ''}
            onChange={(e) => updateField('areaSqM', Number(e.target.value))}
          />
        </div>
      )}

      {/* STEP 4: Amenities */}
      {wizardStep === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0059FF]" />
              <span>المرافق والخدمات المتاحة</span>
            </h3>
            <p className="text-xs text-slate-500">
              اختر المرافق التي توفرها وحدتك لتظهر بشكل بارز للمستأجرين.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PREDEFINED_AMENITIES.map((amenity) => {
              const isSelected = (formData.amenities || []).includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50 border-[#0059FF] ring-2 ring-blue-100 text-blue-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span className="text-xs leading-snug">{amenity.name}</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-[#0059FF] border-[#0059FF] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: House Rules */}
      {wizardStep === 5 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#0059FF]" />
              <span>قواعد الإقامة والوحدة</span>
            </h3>
            <p className="text-xs text-slate-500">
              حدد شروط وقواعد الإقامة ليوافق عليها المستأجر قبل إتمام الحجز.
            </p>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
            {/* Smoking */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">التدخين داخل الوحدة</span>
                <span className="text-[11px] text-slate-500">هل يسمح بالتدخين داخل الشاليه/الفيلا؟</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateHouseRule('smokingAllowed', !formData.houseRules?.smokingAllowed)
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  formData.houseRules?.smokingAllowed
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {formData.houseRules?.smokingAllowed ? 'مسموح ✅' : 'ممنوع ❌'}
              </button>
            </div>

            {/* Parties */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 block">إقامة الحفلات والمناسبات</span>
                <span className="text-[11px] text-slate-500">هل يسمح بتجمعات كبيرة أو حفلات؟</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateHouseRule('partiesAllowed', !formData.houseRules?.partiesAllowed)
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  formData.houseRules?.partiesAllowed
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {formData.houseRules?.partiesAllowed ? 'مسموح ✅' : 'ممنوع ❌'}
              </button>
            </div>

            {/* Pets */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 block">اصطحاب الحيوانات الأليفة</span>
                <span className="text-[11px] text-slate-500">هل يسمح بدخول القطط والكلاب؟</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateHouseRule('petsAllowed', !formData.houseRules?.petsAllowed)
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  formData.houseRules?.petsAllowed
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {formData.houseRules?.petsAllowed ? 'مسموح ✅' : 'ممنوع ❌'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="وقت الدخول (Check-in)"
              placeholder="14:00"
              value={formData.houseRules?.checkInTime || '14:00'}
              onChange={(e) => updateHouseRule('checkInTime', e.target.value)}
            />
            <Input
              label="وقت المغادرة (Check-out)"
              placeholder="12:00"
              value={formData.houseRules?.checkOutTime || '12:00'}
              onChange={(e) => updateHouseRule('checkOutTime', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-sm font-semibold text-slate-800">تعليمات وقواعد إضافية</label>
            <textarea
              rows={3}
              placeholder="مثال: يرجى تسليم الكروت الذكية لقرية مراسي عند المغادرة والالتزام بزي السباحة المعتمد في حمامات السباحة..."
              value={formData.houseRules?.additionalRules || ''}
              onChange={(e) => updateHouseRule('additionalRules', e.target.value)}
              className="w-full p-3 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059FF] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      )}

      {/* STEP 6: Photos Management */}
      {wizardStep === 6 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#0059FF]" />
              <span>إدارة صور الوحدة الساحلية</span>
            </h3>
            <p className="text-xs text-slate-500">
              أضف صوراً عالية الجودة تظهر البحر، الغرف، المطبخ، والحديقة، وحدد الصورة الرئيسية.
            </p>
          </div>

          {/* Device File Picker Upload Box */}
          <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-blue-200 hover:border-[#0059FF] transition-all text-center space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleDeviceFileUpload}
              className="hidden"
              id="property-file-picker"
              disabled={isUploadingImage}
            />

            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-[#0059FF] flex items-center justify-center">
              {isUploadingImage ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="property-file-picker"
                className={`inline-block px-4 py-2 bg-[#0059FF] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-blue-600 shadow-sm transition-all ${
                  isUploadingImage ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isUploadingImage ? 'جارِ رفع الصور...' : 'اختر صوراً من جهازك 📁'}
              </label>
              <p className="text-[11px] text-slate-500">
                صيغ مدعومة: JPG, PNG, WEBP (الحد الأقصى: 10 ميجابايت للصورة)
              </p>
            </div>

            {uploadProgress && (
              <div className="p-2 bg-blue-50 text-[#0059FF] text-xs font-bold rounded-xl animate-pulse">
                {uploadProgress}
              </div>
            )}
          </div>

          {/* Optional Direct URL Fallback Accordion */}
          <details className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <summary className="cursor-pointer font-bold text-slate-600 select-none">
              أو إضافة رابط صورة خارجي (URL)...
            </summary>
            <div className="pt-2 flex gap-2">
              <input
                type="url"
                placeholder="https://..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl dir-ltr text-left"
              />
              <Button variant="outline" size="sm" onClick={addPhoto} icon={<Plus className="w-4 h-4" />}>
                إضافة
              </Button>
            </div>
          </details>

          {/* Photos Grid */}
          {(formData.images || []).length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
              لم يتم إضافة أي صور بعد. يرجى اختيار صور من جهازك.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(formData.images || []).map((img, idx) => {
                const isMain = (formData.mainImageIndex || 0) === idx;
                return (
                  <div
                    key={idx}
                    className={`relative h-36 rounded-2xl overflow-hidden border-2 transition-all ${
                      isMain ? 'border-[#0059FF] ring-2 ring-blue-200' : 'border-slate-200'
                    }`}
                  >
                    <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />

                    {isMain && (
                      <span className="absolute top-2 right-2 bg-[#0059FF] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        الصورة الرئيسية ★
                      </span>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl text-white">
                      {!isMain && (
                        <button
                          type="button"
                          onClick={() => updateField('mainImageIndex', idx)}
                          className="text-[10px] font-bold text-yellow-300 hover:underline"
                        >
                          جعلها رئيسية
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deletePhoto(idx)}
                        className="text-rose-400 hover:text-rose-200 p-1 mr-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 7: Pre-submission Review */}
      {wizardStep === 7 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#0059FF]" />
              <span>مراجعة بيانات الوحدة قبل الإرسال</span>
            </h3>
            <p className="text-xs text-slate-500">
              تأكد من جميع البيانات المدخلة قبل إرسالها إلى إدارة Sola للمراجعة والاعتماد.
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="font-bold text-slate-900">المعلومات الأساسية</span>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-[#0059FF] font-bold text-[11px] hover:underline"
                >
                  تعديل
                </button>
              </div>
              <p>
                <strong>الاسم:</strong> {formData.title}
              </p>
              <p>
                <strong>النوع:</strong> {formData.unitType} | <strong>السعر:</strong>{' '}
                {formData.pricePerNight?.toLocaleString()} ج.م / ليلة
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="font-bold text-slate-900">الموقع والمنتجع</span>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="text-[#0059FF] font-bold text-[11px] hover:underline"
                >
                  تعديل
                </button>
              </div>
              <p>
                <strong>المنطقة:</strong> {formData.region} | <strong>القرية:</strong>{' '}
                {formData.resortName}
              </p>
              <p>
                <strong>العنوان:</strong> {formData.address || 'لم يحدد'}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="font-bold text-slate-900">تفاصيل وسعة الوحدة</span>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="text-[#0059FF] font-bold text-[11px] hover:underline"
                >
                  تعديل
                </button>
              </div>
              <p>
                {formData.bedrooms} غرف • {formData.bathrooms} حمام • حتى {formData.maxGuests} ضيوف •{' '}
                {formData.areaSqM} م²
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="font-bold text-slate-900">
                  المرافق المحددة ({formData.amenities?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  className="text-[#0059FF] font-bold text-[11px] hover:underline"
                >
                  تعديل
                </button>
              </div>
              <p className="text-slate-600">
                {formData.amenities
                  ?.map((id) => PREDEFINED_AMENITIES.find((a) => a.id === id)?.name)
                  .join(' • ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 8: Confirmation Screen */}
      {wizardStep === 8 && (
        <div className="text-center py-10 space-y-6 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-xl">
            <CheckCircle2 className="w-14 h-14" />
          </div>

          <div className="space-y-2 max-w-xs mx-auto">
            <h2 className="text-2xl font-black text-slate-900">تم إرسال الوحدة للمراجعة!</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              سيقوم فريق الجودة بـ Sola بمراجعة بيانات وحدتك الساحلية ومطابقتها للمعايير، وسنرسل لك
              إشعاراً فور اكتمال الاعتماد.
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 max-w-xs mx-auto text-xs text-amber-900 font-medium">
            حالة الوحدة الحالية: <strong className="font-bold text-amber-900">قيد المراجعة (PENDING_REVIEW)</strong>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => setPropertyViewMode('list')}
            className="px-8 font-bold"
          >
            العودة لقائمة الوحدات
          </Button>
        </div>
      )}

      {/* Wizard Footer Navigation Controls */}
      {wizardStep < 8 && (
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {wizardStep > 1 ? (
            <Button
              variant="outline"
              size="md"
              onClick={prevStep}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              السابق
            </Button>
          ) : (
            <div />
          )}

          {wizardStep < 7 ? (
            <Button
              variant="primary"
              size="md"
              onClick={nextStep}
              icon={<ArrowLeft className="w-4 h-4" />}
              className="px-6 font-bold shadow-md shadow-blue-500/20"
            >
              المتابعة للخطوة التالية
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmitForReview}
              isLoading={isSubmitting}
              icon={<Send className="w-4 h-4" />}
              className="px-8 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
            >
              إرسال الوحدة للمراجعة 🚀
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
