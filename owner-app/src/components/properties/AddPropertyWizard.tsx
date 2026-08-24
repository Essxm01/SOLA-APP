import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
  Upload,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Property } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { repositoryFactory } from '../../services/repositoryFactory';
import {
  EGYPTIAN_COASTAL_REGIONS,
  PREDEFINED_AMENITIES,
} from '../../constants/theme';
import {
  PROPERTY_TYPE_OPTIONS,
  getPropertyTypeLabel,
  createEmptyPropertyWizardDraft,
  hydratePropertyToWizard,
  validateStep,
  validateWizardForSubmission,
  canCreateCanonicalServerDraft,
  buildCreatePropertyPayload,
  buildUpdatePropertyPayload,
  type OwnerPropertyWizardDraft,
  type WizardPropertyImage,
} from '../../utils/ownerPropertyWizard';

const STEPS = [
  'الأساسيات',
  'الموقع',
  'السعة والسعر',
  'المرافق والقواعد',
  'الصور',
  'المراجعة والإرسال',
] as const;

export const AddPropertyWizard: React.FC = () => {
  const {
    currentDraft,
    setCurrentDraft,
    wizardStep,
    setWizardStep,
    setPropertyViewMode,
    refreshData,
    showToast,
  } = useApp();

  const [draft, setDraft] = useState<OwnerPropertyWizardDraft>(() => {
    if (currentDraft) {
      const anyDraft = currentDraft as any;
      if (
        'existingPropertyId' in anyDraft &&
        Array.isArray(anyDraft.images) &&
        (anyDraft.images.length === 0 || typeof anyDraft.images[0] === 'object')
      ) {
        return anyDraft as OwnerPropertyWizardDraft;
      }
      return hydratePropertyToWizard(currentDraft as Property);
    }
    return createEmptyPropertyWizardDraft();
  });

  const [error, setError] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = Math.max(1, Math.min(6, wizardStep));
  const isPublished = draft.canonicalStatus === 'PUBLISHED';
  const isRejected = draft.canonicalStatus === 'REJECTED';

  // Synchronize local draft to AppContext (auto-save local draft)
  useEffect(() => {
    if (!isSubmitted) {
      setCurrentDraft(draft as any);
    }
  }, [draft, isSubmitted, setCurrentDraft]);

  // Field update helpers
  const updateField = <K extends keyof OwnerPropertyWizardDraft>(
    key: K,
    value: OwnerPropertyWizardDraft[K]
  ) => {
    setError('');
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const updateHouseRule = (
    ruleKey: keyof OwnerPropertyWizardDraft['houseRules'],
    value: boolean | undefined
  ) => {
    setError('');
    setDraft(prev => ({
      ...prev,
      houseRules: {
        ...prev.houseRules,
        [ruleKey]: value,
      },
    }));
  };

  const toggleAmenity = (amenityId: string) => {
    setError('');
    setDraft(prev => {
      const exists = prev.amenities.includes(amenityId);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter(id => id !== amenityId)
          : [...prev.amenities, amenityId],
      };
    });
  };

  // Step navigation with strict validation on "التالي"
  const handleNextStep = () => {
    const validation = validateStep(step, draft);
    if (!validation.isValid) {
      setError(validation.error || 'يرجى استكمال البيانات المطلوبة.');
      return;
    }
    setError('');
    setWizardStep(step + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setWizardStep(Math.max(1, step - 1));
  };

  // Image Upload Handling (Individual per-file commit with partial-failure tolerance)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if canonical server draft is allowed
    if (!canCreateCanonicalServerDraft(draft)) {
      setError('يرجى استكمال البيانات الأساسية والسعة وسعر الليلة قبل إضافة الصور.');
      setWizardStep(1);
      return;
    }

    setIsBusy(true);
    setError('');

    try {
      let propertyId = draft.existingPropertyId;

      // Create server draft if not yet existing on server
      if (!propertyId) {
        const createPayload = buildCreatePropertyPayload(draft);
        const saved = await repositoryFactory.property.createProperty(createPayload);
        propertyId = saved.id;
        setDraft(prev => ({
          ...prev,
          existingPropertyId: saved.id,
          canonicalStatus: saved.status,
        }));
      }

      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
        // Validate format & size
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
          failCount++;
          continue;
        }

        try {
          const intent = await repositoryFactory.property.getImagePresignedUrl(propertyId!, {
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          });

          const uploadRes = await fetch(intent.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed with status ${uploadRes.status}`);
          }

          const committed = await repositoryFactory.property.commitPropertyImage(propertyId!, {
            intentId: intent.intentId,
            objectKey: intent.objectKey,
            fileUrl: intent.downloadUrl,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            sortOrder: draft.images.length + successCount,
          });

          const newImage: WizardPropertyImage = {
            id: committed.id || committed.objectKey || `img-${Date.now()}-${successCount}`,
            url: committed.fileUrl || intent.downloadUrl,
            sortOrder: committed.sortOrder ?? (draft.images.length + successCount),
            status: 'committed',
          };

          // Immediately update state with each committed image
          setDraft(prev => ({
            ...prev,
            images: [...prev.images, newImage],
          }));

          successCount++;
        } catch (imgErr) {
          console.error('Image upload error:', imgErr);
          failCount++;
        }
      }

      if (failCount > 0 && successCount > 0) {
        setError(`تم رفع ${successCount} صورة بنجاح، وتعذر رفع ${failCount} صورة. يمكنك المحاولة مرة أخرى.`);
      } else if (failCount > 0 && successCount === 0) {
        setError('تعذر رفع الصور المختارة. يرجى التأكد من صيغة وحجم الصور والمحاولة ثانية.');
      }
    } catch (err: any) {
      console.error('Batch upload failed:', err);
      setError('حدث خطأ أثناء إعداد رفع الصور. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Image Delete Handling
  const handleImageDelete = async (image: WizardPropertyImage) => {
    if (!draft.existingPropertyId || !image.id) {
      setDraft(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== image.id),
      }));
      return;
    }

    setIsBusy(true);
    setError('');

    try {
      await repositoryFactory.property.deletePropertyImage(draft.existingPropertyId, image.id);
      setDraft(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== image.id),
      }));
      showToast('تم حذف الصورة بنجاح', 'info');
    } catch (err: any) {
      console.error('Delete image error:', err);
      setError('تعذر حذف الصورة من الخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsBusy(false);
    }
  };

  // Final Submit / Save Handler
  const handleFinalSubmit = async () => {
    const validation = validateWizardForSubmission(draft);
    if (!validation.isValid) {
      setError(validation.error || 'يرجى مراجعة واستكمال بيانات الوحدة.');
      return;
    }

    setIsBusy(true);
    setError('');

    try {
      if (isPublished) {
        // Published property: Update only
        if (draft.existingPropertyId) {
          const updatePayload = buildUpdatePropertyPayload(draft, false);
          await repositoryFactory.property.updateProperty(draft.existingPropertyId, updatePayload);
          showToast('تم حفظ تعديلات الوحدة بنجاح', 'success');
          setCurrentDraft(null);
          await refreshData();
          setPropertyViewMode('list');
        }
      } else if (isRejected) {
        // Rejected property: Submit for review
        if (draft.existingPropertyId) {
          const updatePayload = buildUpdatePropertyPayload(draft, true);
          await repositoryFactory.property.updateProperty(draft.existingPropertyId, updatePayload);
          await repositoryFactory.property.submitPropertyForReview(draft.existingPropertyId);
          setIsSubmitted(true);
          setCurrentDraft(null);
          await refreshData();
        }
      } else {
        // New or Draft property: Create if needed, then submit
        let propertyId = draft.existingPropertyId;
        if (propertyId) {
          const updatePayload = buildUpdatePropertyPayload(draft, false);
          await repositoryFactory.property.updateProperty(propertyId, updatePayload);
        } else {
          const createPayload = buildCreatePropertyPayload(draft);
          const created = await repositoryFactory.property.createProperty(createPayload);
          propertyId = created.id;
        }

        if (propertyId) {
          await repositoryFactory.property.submitPropertyForReview(propertyId);
          setIsSubmitted(true);
          setCurrentDraft(null);
          await refreshData();
        }
      }
    } catch (err: any) {
      console.error('Submit property error:', err);
      setError(
        err?.message ||
          (isPublished
            ? 'تعذر حفظ تعديلات الوحدة. يرجى المحاولة مرة أخرى.'
            : 'تعذر إرسال الوحدة للمراجعة. يرجى المحاولة مرة أخرى.')
      );
    } finally {
      setIsBusy(false);
    }
  };

  // Success Result Screen
  if (isSubmitted) {
    return (
      <main
        dir="rtl"
        className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center"
        style={{ background: 'var(--konfrm-surface-canvas)' }}
      >
        <div
          className="w-full max-w-md p-6 rounded-2xl flex flex-col items-center gap-4 shadow-subtle border border-[var(--konfrm-border-default)]"
          style={{ background: 'var(--konfrm-surface-primary)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--konfrm-semantic-success-background)' }}
          >
            <CheckCircle2 size={36} style={{ color: 'var(--konfrm-semantic-success-solid)' }} />
          </div>

          <h1 className="text-xl font-black" style={{ color: 'var(--konfrm-text-primary)' }}>
            تم إرسال الوحدة للمراجعة
          </h1>

          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--konfrm-text-secondary)' }}>
            سنوضح لك حالة الوحدة بعد مراجعتها من الإدارة.
          </p>

          <Button
            fullWidth
            onClick={() => {
              setCurrentDraft(null);
              setPropertyViewMode('list');
            }}
          >
            العودة إلى وحداتك
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="flex flex-col min-h-full"
      style={{ background: 'var(--konfrm-surface-canvas)' }}
    >
      {/* Top Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3 border-b flex items-center justify-between"
        style={{
          background: 'var(--konfrm-surface-primary)',
          borderColor: 'var(--konfrm-border-default)',
        }}
      >
        <button
          type="button"
          onClick={() => setPropertyViewMode('list')}
          className="flex items-center gap-1.5 min-h-[44px] px-2 text-sm font-bold cursor-pointer transition-colors"
          style={{ color: 'var(--konfrm-text-secondary)' }}
        >
          <ArrowRight size={18} />
          <span>إغلاق</span>
        </button>

        <div className="text-left">
          <strong className="text-sm font-black block" style={{ color: 'var(--konfrm-text-primary)' }}>
            {draft.existingPropertyId ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
          </strong>
          <span className="text-xs font-semibold" style={{ color: 'var(--konfrm-text-muted)' }}>
            الخطوة {step} من 6 · {STEPS[step - 1]}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div
        className="w-full h-1"
        style={{ background: 'var(--konfrm-surface-secondary)' }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${(step / 6) * 100}%`,
            background: 'var(--konfrm-color-primary)',
          }}
        />
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Rejection Banner if editing rejected property */}
        {isRejected && (
          <section
            className="p-4 rounded-2xl border flex items-start gap-3"
            style={{
              background: 'var(--konfrm-semantic-danger-background)',
              borderColor: 'var(--konfrm-semantic-danger-border)',
            }}
          >
            <AlertTriangle
              size={20}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--konfrm-semantic-danger-solid)' }}
            />
            <div>
              <strong
                className="text-xs font-black block mb-1"
                style={{ color: 'var(--konfrm-semantic-danger-text)' }}
              >
                تحتاج الوحدة إلى تعديلات قبل إعادة الإرسال
              </strong>
              <p
                className="text-xs font-medium leading-relaxed"
                style={{ color: 'var(--konfrm-semantic-danger-text)' }}
              >
                {draft.rejectionReason || 'يرجى مراجعة وتعديل الملاحظات المطلوبة ثم إعادة إرسال الوحدة للمراجعة.'}
              </p>
            </div>
          </section>
        )}

        {/* STEP 1: BASICS */}
        {step === 1 && (
          <section
            className="p-4 rounded-2xl border space-y-4 shadow-subtle"
            style={{
              background: 'var(--konfrm-surface-primary)',
              borderColor: 'var(--konfrm-border-default)',
            }}
          >
            <div>
              <h2 className="text-base font-black mb-1" style={{ color: 'var(--konfrm-text-primary)' }}>
                البيانات الأساسية
              </h2>
              <p className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                حدد اسم ونوع الوحدة ووصفاً موجزاً للمستأجرين.
              </p>
            </div>

            <Input
              label="اسم الوحدة *"
              placeholder="مثال: شاليه فاخر بإطلالة بحرية مباشرة"
              value={draft.title || ''}
              onChange={e => updateField('title', e.target.value)}
            />

            <div>
              <label
                className="text-sm font-bold block mb-2"
                style={{ color: 'var(--konfrm-text-primary)' }}
              >
                نوع الوحدة *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_TYPE_OPTIONS.map(opt => {
                  const isSelected = draft.propertyType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        updateField('propertyType', opt.value);
                        updateField('unitType', opt.value);
                      }}
                      className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-[var(--konfrm-border-focus)] bg-[var(--konfrm-interaction-selected)] text-[var(--konfrm-color-primary)] shadow-xs'
                          : 'border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-[var(--konfrm-text-primary)] hover:border-[var(--konfrm-border-strong)]'
                      }`}
                    >
                      <Building size={16} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                className="text-sm font-bold block mb-1.5"
                style={{ color: 'var(--konfrm-text-primary)' }}
              >
                وصف الوحدة (اختياري)
              </label>
              <textarea
                value={draft.description || ''}
                onChange={e => updateField('description', e.target.value)}
                placeholder="أضف وصفاً جذاباً للوحدة ومميزاتها..."
                rows={4}
                className="w-full p-3 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'var(--konfrm-surface-primary)',
                  borderColor: 'var(--konfrm-border-default)',
                  color: 'var(--konfrm-text-primary)',
                }}
              />
            </div>
          </section>
        )}

        {/* STEP 2: LOCATION */}
        {step === 2 && (
          <section
            className="p-4 rounded-2xl border space-y-4 shadow-subtle"
            style={{
              background: 'var(--konfrm-surface-primary)',
              borderColor: 'var(--konfrm-border-default)',
            }}
          >
            <div>
              <h2 className="text-base font-black mb-1" style={{ color: 'var(--konfrm-text-primary)' }}>
                موقع الوحدة
              </h2>
              <p className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                حدد المنطقة الساحلية والمنتجع لتسهيل وصول المستأجرين.
              </p>
            </div>

            <div>
              <label
                className="text-sm font-bold block mb-1.5"
                style={{ color: 'var(--konfrm-text-primary)' }}
              >
                المنطقة الساحلية *
              </label>
              <select
                value={draft.region || ''}
                onChange={e => updateField('region', e.target.value)}
                className="w-full min-h-[48px] px-3 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all cursor-pointer"
                style={{
                  background: 'var(--konfrm-surface-primary)',
                  borderColor: 'var(--konfrm-border-default)',
                  color: 'var(--konfrm-text-primary)',
                }}
              >
                <option value="">اختر المنطقة الجغرافية...</option>
                {EGYPTIAN_COASTAL_REGIONS.map(reg => (
                  <option key={reg.id} value={reg.name}>
                    {reg.name} ({reg.cities.join('، ')})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="المنتجع أو المجتمع السكني (اختياري)"
              placeholder="مثال: مارينا 5، مراسي، لوتس باي"
              value={draft.resortName || ''}
              onChange={e => updateField('resortName', e.target.value)}
            />

            <Input
              label="العنوان أو وصف الوصول (اختياري)"
              placeholder="مثال: الكيلو 120، بوابة 3، عمارة 15"
              value={draft.address || ''}
              onChange={e => updateField('address', e.target.value)}
            />
          </section>
        )}

        {/* STEP 3: CAPACITY & PRICE */}
        {step === 3 && (
          <section
            className="p-4 rounded-2xl border space-y-4 shadow-subtle"
            style={{
              background: 'var(--konfrm-surface-primary)',
              borderColor: 'var(--konfrm-border-default)',
            }}
          >
            <div>
              <h2 className="text-base font-black mb-1" style={{ color: 'var(--konfrm-text-primary)' }}>
                السعة والتسعير
              </h2>
              <p className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                أدخل تفاصيل الغرف وسعر الإيجار لليلة الواحدة بالجنيه المصري.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min="0"
                label="عدد الغرف *"
                placeholder="0 للاستوديو"
                value={draft.bedrooms ?? ''}
                onChange={e =>
                  updateField(
                    'bedrooms',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />

              <Input
                type="number"
                min="0"
                label="عدد الحمامات *"
                placeholder="1"
                value={draft.bathrooms ?? ''}
                onChange={e =>
                  updateField(
                    'bathrooms',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />

              <Input
                type="number"
                min="1"
                label="أقصى عدد ضيوف *"
                placeholder="4"
                value={draft.maxGuests ?? ''}
                onChange={e =>
                  updateField(
                    'maxGuests',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />

              <Input
                type="number"
                min="1"
                label="سعر الليلة (ج.م) *"
                placeholder="2500"
                value={draft.pricePerNight ?? ''}
                onChange={e =>
                  updateField(
                    'pricePerNight',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />

              <Input
                type="number"
                min="0"
                label="عدد الأسرّة (اختياري)"
                placeholder="2"
                value={draft.bedsCount ?? ''}
                onChange={e =>
                  updateField(
                    'bedsCount',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />

              <Input
                type="number"
                min="0"
                label="المساحة م² (اختياري)"
                placeholder="120"
                value={draft.areaSqM ?? ''}
                onChange={e =>
                  updateField(
                    'areaSqM',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />
            </div>

            <div
              className="p-3 rounded-xl border flex items-center gap-2 text-xs font-medium"
              style={{
                background: 'var(--konfrm-semantic-info-background)',
                borderColor: 'var(--konfrm-semantic-info-border)',
                color: 'var(--konfrm-semantic-info-text)',
              }}
            >
              <Calendar size={16} className="shrink-0" />
              <span>تنبيه: الحد الأدنى للحجز عبر صولا هو ليلتان والحد الأقصى 30 ليلة تلقائياً.</span>
            </div>
          </section>
        )}

        {/* STEP 4: AMENITIES & RULES */}
        {step === 4 && (
          <section
            className="p-4 rounded-2xl border space-y-5 shadow-subtle"
            style={{
              background: 'var(--konfrm-surface-primary)',
              borderColor: 'var(--konfrm-border-default)',
            }}
          >
            <div>
              <h2 className="text-base font-black mb-1" style={{ color: 'var(--konfrm-text-primary)' }}>
                المرافق وقواعد الإقامة
              </h2>
              <p className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                اختر التجهيزات المتاحة وحدد شروط الإقامة للمستأجرين.
              </p>
            </div>

            {/* Amenities Grid */}
            <div>
              <label
                className="text-sm font-bold block mb-2"
                style={{ color: 'var(--konfrm-text-primary)' }}
              >
                المرافق والتجهيزات المتوفرة
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PREDEFINED_AMENITIES.map(amenity => {
                  const isSelected = draft.amenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--konfrm-border-focus)] bg-[var(--konfrm-interaction-selected)] text-[var(--konfrm-color-primary)]'
                          : 'border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-[var(--konfrm-text-secondary)] hover:border-[var(--konfrm-border-strong)]'
                      }`}
                    >
                      <span className="truncate">{amenity.name}</span>
                      {isSelected && <CheckCircle2 size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* House Rules */}
            <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--konfrm-border-subtle)' }}>
              <label
                className="text-sm font-bold block"
                style={{ color: 'var(--konfrm-text-primary)' }}
              >
                قواعد الإقامة والشروط
              </label>

              {/* Binary explicit rule buttons */}
              {[
                { key: 'smokingAllowed' as const, label: 'التدخين داخل الوحدة' },
                { key: 'partiesAllowed' as const, label: 'الحفلات والمناسبات' },
                { key: 'petsAllowed' as const, label: 'اصطحاب الحيوانات الأليفة' },
                { key: 'childrenAllowed' as const, label: 'إقامة الأطفال العائلية' },
              ].map(ruleItem => {
                const currentVal = draft.houseRules[ruleItem.key];
                return (
                  <div
                    key={ruleItem.key}
                    className="p-3 rounded-xl border flex items-center justify-between gap-3"
                    style={{
                      background: 'var(--konfrm-surface-secondary)',
                      borderColor: 'var(--konfrm-border-default)',
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color: 'var(--konfrm-text-primary)' }}>
                      {ruleItem.label}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateHouseRule(ruleItem.key, true)}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          currentVal === true
                            ? 'border-[var(--konfrm-border-focus)] bg-[var(--konfrm-interaction-selected)] text-[var(--konfrm-color-primary)]'
                            : 'border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-[var(--konfrm-text-secondary)]'
                        }`}
                      >
                        مسموح
                      </button>

                      <button
                        type="button"
                        onClick={() => updateHouseRule(ruleItem.key, false)}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          currentVal === false
                            ? 'border-[var(--konfrm-border-focus)] bg-[var(--konfrm-interaction-selected)] text-[var(--konfrm-color-primary)]'
                            : 'border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-[var(--konfrm-text-secondary)]'
                        }`}
                      >
                        غير مسموح
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* STEP 5: IMAGES */}
        {step === 5 && (
          <section
            className="p-4 rounded-2xl border space-y-4 shadow-subtle text-right"
            style={{
              background: 'var(--konfrm-surface-primary)',
              borderColor: 'var(--konfrm-border-default)',
            }}
          >
            <div>
              <h2 className="text-base font-black mb-1" style={{ color: 'var(--konfrm-text-primary)' }}>
                صور الوحدة
              </h2>
              <p className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                أضف صوراً حقيقية واضحة للوحدة (صورة واحدة مؤكدة على الأقل مطلوبة للمراجعة).
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={handleImageUpload}
            />

            <div
              onClick={() => !isBusy && fileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--konfrm-border-focus)] transition-colors text-center"
              style={{
                borderColor: 'var(--konfrm-border-strong)',
                background: 'var(--konfrm-surface-secondary)',
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--konfrm-surface-primary)',
                  color: 'var(--konfrm-color-primary)',
                }}
              >
                <Upload size={22} />
              </div>
              <strong className="text-sm font-black" style={{ color: 'var(--konfrm-text-primary)' }}>
                اضغط لاختيار الصور من جهازك
              </strong>
              <span className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                صيغ مدعومة: JPG، PNG، WEBP (بحد أقصى 10 ميجابايت)
              </span>
            </div>

            {/* Committed Images List */}
            {draft.images.length > 0 ? (
              <div className="space-y-2 pt-2">
                <label
                  className="text-xs font-bold block"
                  style={{ color: 'var(--konfrm-text-secondary)' }}
                >
                  الصور المرفوعة ({draft.images.length})
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {draft.images.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="relative rounded-xl overflow-hidden border group"
                      style={{
                        borderColor: 'var(--konfrm-border-default)',
                        background: 'var(--konfrm-surface-secondary)',
                      }}
                    >
                      <img
                        src={img.url}
                        alt={`صورة ${idx + 1}`}
                        className="w-full h-28 object-cover"
                      />

                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />

                      <button
                        type="button"
                        onClick={() => handleImageDelete(img)}
                        disabled={isBusy}
                        className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-white/90 text-rose-600 flex items-center justify-center shadow-xs cursor-pointer hover:bg-rose-50 transition-colors"
                        title="حذف الصورة"
                      >
                        <Trash2 size={16} />
                      </button>

                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                        صورة {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="p-4 rounded-xl border text-center space-y-1"
                style={{
                  background: 'var(--konfrm-surface-secondary)',
                  borderColor: 'var(--konfrm-border-subtle)',
                }}
              >
                <ImageIcon size={28} className="mx-auto" style={{ color: 'var(--konfrm-text-muted)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                  لم تتم إضافة أي صور بعد.
                </p>
              </div>
            )}
          </section>
        )}

        {/* STEP 6: REVIEW */}
        {step === 6 && (
          <section className="space-y-3 text-right">
            <div
              className="p-4 rounded-2xl border shadow-subtle"
              style={{
                background: 'var(--konfrm-surface-primary)',
                borderColor: 'var(--konfrm-border-default)',
              }}
            >
              <h2 className="text-base font-black mb-1" style={{ color: 'var(--konfrm-text-primary)' }}>
                مراجعة وتأكيد البيانات
              </h2>
              <p className="text-xs font-medium" style={{ color: 'var(--konfrm-text-muted)' }}>
                تأكد من صحة كافة بيانات الوحدة قبل إرسالها لاعتماد الإدارة.
              </p>
            </div>

            {/* Review Cards with direct edit action */}
            {[
              {
                stepNum: 1,
                title: 'الأساسيات',
                details: `${draft.title || '—'} · ${getPropertyTypeLabel(draft.propertyType)}`,
              },
              {
                stepNum: 2,
                title: 'الموقع',
                details: `${draft.region || 'غير محدد'}${draft.resortName ? ` · ${draft.resortName}` : ''}${draft.address ? ` · ${draft.address}` : ''}`,
              },
              {
                stepNum: 3,
                title: 'السعة والتسعير',
                details: `${draft.bedrooms ?? 0} غرف · ${draft.bathrooms ?? 0} حمامات · ${draft.maxGuests ?? 1} ضيوف · ${draft.pricePerNight ? `${draft.pricePerNight.toLocaleString('ar-EG')} ج.م / ليلة` : '—'}`,
              },
              {
                stepNum: 4,
                title: 'المرافق والقواعد',
                details: `${draft.amenities.length} مرافق محددة · التدخين: ${draft.houseRules.smokingAllowed === true ? 'مسموح' : draft.houseRules.smokingAllowed === false ? 'غير مسموح' : 'غير محدد'}`,
              },
              {
                stepNum: 5,
                title: 'الصور',
                details: `${draft.images.filter(img => img.status === 'committed').length} صور مرفوعة ومؤكدة`,
              },
            ].map(item => (
              <div
                key={item.stepNum}
                className="p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-subtle"
                style={{
                  background: 'var(--konfrm-surface-primary)',
                  borderColor: 'var(--konfrm-border-default)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <strong className="text-xs font-black block mb-0.5" style={{ color: 'var(--konfrm-text-primary)' }}>
                    {item.title}
                  </strong>
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--konfrm-text-secondary)' }}>
                    {item.details}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setWizardStep(item.stepNum)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 cursor-pointer"
                  style={{
                    borderColor: 'var(--konfrm-border-default)',
                    color: 'var(--konfrm-color-primary)',
                    background: 'var(--konfrm-surface-secondary)',
                  }}
                >
                  تعديل
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Global Error Banner */}
        {error && (
          <div
            className="p-3.5 rounded-xl border flex items-start gap-2 text-xs font-bold"
            style={{
              background: 'var(--konfrm-semantic-danger-background)',
              borderColor: 'var(--konfrm-semantic-danger-border)',
              color: 'var(--konfrm-semantic-danger-text)',
            }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Sticky Mobile Action Footer */}
      <footer
        className="sticky bottom-0 z-20 px-4 py-3.5 border-t flex items-center justify-between gap-3 shadow-subtle"
        style={{
          background: 'var(--konfrm-surface-primary)',
          borderColor: 'var(--konfrm-border-default)',
          paddingBottom: 'calc(var(--konfrm-space-safe-bottom, 16px) + 8px)',
        }}
      >
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={isBusy}
          >
            السابق
          </Button>
        ) : (
          <div />
        )}

        {step < 6 ? (
          <Button
            onClick={handleNextStep}
            disabled={isBusy}
          >
            التالي
          </Button>
        ) : (
          <Button
            isLoading={isBusy}
            onClick={handleFinalSubmit}
          >
            {isPublished
              ? 'حفظ التعديلات'
              : isRejected
              ? 'إعادة الإرسال للمراجعة'
              : 'إرسال الوحدة للمراجعة'}
          </Button>
        )}
      </footer>
    </main>
  );
};

