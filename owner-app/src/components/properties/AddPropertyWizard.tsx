import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Trash2,
  Upload,
  AlertCircle,
  AlertTriangle,
  Minus,
  Plus,
  X,
  Save,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { Property } from '../../types';
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
  'السعة والتسعير',
  'المرافق والقواعد',
  'الصور',
  'المراجعة والإرسال',
] as const;

interface StepperProps {
  label: string;
  sublabel?: string;
  value: number | undefined;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const WizardStepper: React.FC<StepperProps> = ({
  label,
  sublabel,
  value,
  min = 0,
  max = 99,
  onChange,
  disabled = false,
}) => {
  const current = typeof value === 'number' && !isNaN(value) ? value : min;

  const handleDecrement = () => {
    if (disabled || current <= min) return;
    onChange(current - 1);
  };

  const handleIncrement = () => {
    if (disabled || current >= max) return;
    onChange(current + 1);
  };

  const isMin = current <= min;
  const isMax = current >= max;

  return (
    <div
      className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-subtle"
      style={{
        background: 'var(--konfrm-surface-primary)',
        borderColor: 'var(--konfrm-border-default)',
      }}
    >
      <div className="min-w-0 flex-1">
        <strong className="text-sm font-black block" style={{ color: 'var(--konfrm-text-primary)' }}>
          {label}
        </strong>
        {sublabel && (
          <span className="text-xs font-semibold block mt-0.5" style={{ color: 'var(--konfrm-text-muted)' }}>
            {sublabel}
          </span>
        )}
      </div>

      <div className="flex items-center shrink-0" style={{ gap: '8px' }}>
        {/* Minus Button: 44x44 */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || isMin}
          aria-label={`تقليل ${label}`}
          className={`w-[44px] h-[44px] rounded-xl border select-none cursor-pointer ${
            isMin || disabled
              ? 'opacity-40 cursor-not-allowed border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-secondary)] text-[var(--konfrm-text-muted)]'
              : 'border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-[var(--konfrm-text-primary)] hover:border-[var(--konfrm-border-focus)] active:bg-[var(--konfrm-interaction-selected)]'
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
          }}
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>

        {/* Value Box: 58x44 */}
        <div
          className="w-[58px] h-[44px] rounded-xl border font-black text-base select-none"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
            background: 'var(--konfrm-surface-secondary)',
            borderColor: 'var(--konfrm-border-default)',
            color: 'var(--konfrm-text-primary)',
          }}
        >
          {current}
        </div>

        {/* Plus Button: 44x44 */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || isMax}
          aria-label={`زيادة ${label}`}
          className={`w-[44px] h-[44px] rounded-xl border select-none cursor-pointer ${
            isMax || disabled
              ? 'opacity-40 cursor-not-allowed border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-secondary)] text-[var(--konfrm-text-muted)]'
              : 'border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] text-[var(--konfrm-text-primary)] hover:border-[var(--konfrm-border-focus)] active:bg-[var(--konfrm-interaction-selected)]'
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

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

  const { owner } = useAuth();
  const ownerId = owner?.id;

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

  // If editing an existing property, fetch server image records with real IDs
  useEffect(() => {
    if (draft.existingPropertyId && !repositoryFactory.useMockMode) {
      repositoryFactory.property
        .getPropertyImages(draft.existingPropertyId)
        .then((serverImages: any[]) => {
          if (Array.isArray(serverImages) && serverImages.length > 0) {
            setDraft(prev => ({
              ...prev,
              images: serverImages.map(img => ({
                id: img.id,
                url: img.fileUrl || img.url,
                sortOrder: img.sortOrder ?? img.order,
                status: 'committed' as const,
              })),
            }));
          }
        })
        .catch(() => {
          // Keep existing images on failure
        });
    }
  }, [draft.existingPropertyId]);

  // Synchronize local NEW draft to localStorage and AppContext (auto-save with owner scope)
  useEffect(() => {
    if (!isSubmitted) {
      setCurrentDraft(draft as any);
      if (!draft.existingPropertyId && ownerId) {
        try {
          localStorage.setItem(`sola_owner_property_draft:${ownerId}`, JSON.stringify(draft));
        } catch {
          // Ignore localStorage errors
        }
      }
    }
  }, [draft, isSubmitted, setCurrentDraft, ownerId]);

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

  // Step Navigation Handlers with Pure Validation Gating
  const handleNextStep = () => {
    setError('');
    const validation = validateStep(step, draft);
    if (!validation.isValid) {
      setError(validation.error || 'يرجى استكمال البيانات المطلوبة للمتابعة.');
      return;
    }
    if (step < 6) {
      setWizardStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (step > 1) {
      setWizardStep(step - 1);
    }
  };

  // Header Save Draft Handler (Override 4)
  const handleSaveDraft = async () => {
    setIsBusy(true);
    setError('');
    try {
      if (draft.existingPropertyId) {
        // Existing canonical property: update server record
        const updatePayload = buildUpdatePropertyPayload(draft, false);
        await repositoryFactory.property.updateProperty(draft.existingPropertyId, updatePayload);
        showToast('تم حفظ التعديلات كمسودة', 'success');
        await refreshData();
      } else {
        // New property: Save locally in localStorage under owner scope
        if (ownerId) {
          localStorage.setItem(`sola_owner_property_draft:${ownerId}`, JSON.stringify(draft));
        }
        showToast('تم حفظ المسودة محلياً بنجاح', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'تعذر حفظ المسودة', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // Sequential Per-Image Upload Loop with Error Isolation (Override 3 & 5D)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setIsBusy(true);

    try {
      let currentPropertyId = draft.existingPropertyId;

      // Auto-create server DRAFT if needed for image binding
      if (!currentPropertyId) {
        if (!canCreateCanonicalServerDraft(draft)) {
          setError('يرجى استكمال البيانات الأساسية (الاسم، النوع، المنطقة، السعة والسعر) أولاً لتتمكن من رفع الصور.');
          setIsBusy(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const createPayload = buildCreatePropertyPayload(draft);
        const created = await repositoryFactory.property.createProperty(createPayload);
        currentPropertyId = created.id;
        updateField('existingPropertyId', created.id);
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          showToast(`الصيغة ${file.type} غير مدعومة للملف ${file.name}`, 'error');
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          showToast(`حجم الصورة ${file.name} يتجاوز 10 ميجابايت`, 'error');
          continue;
        }

        try {
          // 1. Presign
          const presigned = await repositoryFactory.property.getImagePresignedUrl(currentPropertyId, {
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          });

          // 2. Upload binary
          const uploadRes = await fetch(presigned.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type,
              ...(presigned.headers || {}),
            },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`فشل رفع ملف الصورة (${uploadRes.status})`);
          }

          // 3. Commit metadata
          const committed = await repositoryFactory.property.commitPropertyImage(currentPropertyId, {
            intentId: presigned.intentId,
            objectKey: presigned.objectKey,
            fileUrl: presigned.downloadUrl || presigned.uploadUrl.split('?')[0],
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            sortOrder: draft.images.length + i,
          });

          // 4. Immediately add committed image to state with real ID
          const newImg: WizardPropertyImage = {
            id: committed?.id || committed?.data?.id || presigned.objectKey,
            url: committed?.fileUrl || committed?.data?.fileUrl || presigned.downloadUrl || presigned.uploadUrl.split('?')[0],
            sortOrder: draft.images.length + i,
            status: 'committed',
          };

          setDraft(prev => ({
            ...prev,
            images: [...prev.images, newImg],
          }));
        } catch (uploadErr: any) {
          console.error('Image upload failed for file:', file.name, uploadErr);
          showToast(`فشل رفع الصورة: ${file.name}`, 'error');
        }
      }

      await refreshData();
    } catch (err: any) {
      console.error('General upload error:', err);
      setError(err.message || 'حدث خطأ أثناء معالجة الصور.');
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Image Delete Handling using Real IDs (Override 5D)
  const handleImageDelete = async (image: WizardPropertyImage) => {
    if (!draft.existingPropertyId || !image.id) {
      setDraft(prev => ({
        ...prev,
        images: prev.images.filter(img => img.url !== image.url),
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

  // Final Submit / Save Handler with Single Canonical Transition (Override 5C)
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
        // Published property: Update only without resubmitting
        if (draft.existingPropertyId) {
          const updatePayload = buildUpdatePropertyPayload(draft, false);
          await repositoryFactory.property.updateProperty(draft.existingPropertyId, updatePayload);
          showToast('تم حفظ تعديلات الوحدة بنجاح', 'success');
          setCurrentDraft(null);
          await refreshData();
          setPropertyViewMode('list');
        }
      } else if (isRejected) {
        // Rejected property: Normal update, then submit exactly once (Override 5C)
        if (draft.existingPropertyId) {
          const updatePayload = buildUpdatePropertyPayload(draft, false);
          await repositoryFactory.property.updateProperty(draft.existingPropertyId, updatePayload);
          await repositoryFactory.property.submitPropertyForReview(draft.existingPropertyId);
          setIsSubmitted(true);
          setCurrentDraft(null);
          if (ownerId) {
            localStorage.removeItem(`sola_owner_property_draft:${ownerId}`);
          }
          await refreshData();
        }
      } else {
        // New or Draft property: Create if needed, then submit exactly once
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
          if (ownerId) {
            localStorage.removeItem(`sola_owner_property_draft:${ownerId}`);
          }
          await refreshData();
        }
      }
    } catch (err: any) {
      console.error('Final submit error:', err);
      setError(err.message || 'حدث خطأ أثناء إرسال الوحدة للمراجعة.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen flex flex-col relative"
      style={{
        background: 'var(--konfrm-surface-canvas)',
        color: 'var(--konfrm-text-primary)',
        fontFamily: 'var(--konfrm-font-family)',
      }}
    >
      {/* Top Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3 border-b flex items-center justify-between"
        style={{
          background: 'var(--konfrm-surface-primary)',
          borderColor: 'var(--konfrm-border-default)',
        }}
      >
        {/* Close / Return Button */}
        <button
          type="button"
          onClick={() => setPropertyViewMode('list')}
          className="flex items-center gap-1.5 min-h-[44px] px-2 text-sm font-bold cursor-pointer transition-colors"
          style={{ color: 'var(--konfrm-text-secondary)' }}
        >
          <X size={20} />
          <span>إغلاق</span>
        </button>

        {/* Title & Step Indicator */}
        <div className="text-center">
          <strong className="text-sm font-black block" style={{ color: 'var(--konfrm-text-primary)' }}>
            {draft.existingPropertyId ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
          </strong>
          <span className="text-xs font-semibold" style={{ color: 'var(--konfrm-text-muted)' }}>
            الخطوة {step} من 6 · {STEPS[step - 1]}
          </span>
        </div>

        {/* Save Draft Action */}
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isBusy}
          className="flex items-center gap-1 min-h-[44px] px-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer"
          style={{
            background: 'var(--konfrm-surface-secondary)',
            borderColor: 'var(--konfrm-border-default)',
            color: 'var(--konfrm-color-primary)',
          }}
          title="حفظ كمسودة"
        >
          <Save size={15} />
          <span className="hidden sm:inline">حفظ مسودة</span>
        </button>
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

      {/* Scrollable Form Body with bottom padding for Floating Island */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-36 max-w-lg mx-auto w-full">
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
                اختر نوع الوحدة، واكتب اسمها ووصفاً مميزاً لها.
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
              <div className="grid grid-cols-2 gap-2.5">
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
                      className={`p-3 rounded-2xl text-right border transition-all flex flex-col justify-between gap-2 cursor-pointer select-none ${
                        isSelected
                          ? 'border-2 border-[var(--konfrm-color-primary)] bg-[var(--konfrm-interaction-selected)] shadow-xs'
                          : 'border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] hover:border-[var(--konfrm-border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl" role="img" aria-label={opt.label}>
                          {opt.emoji}
                        </span>
                        {isSelected && (
                          <CheckCircle2
                            size={16}
                            style={{ color: 'var(--konfrm-color-primary)' }}
                          />
                        )}
                      </div>
                      <div>
                        <strong
                          className="text-sm font-black block"
                          style={{
                            color: isSelected
                              ? 'var(--konfrm-color-primary)'
                              : 'var(--konfrm-text-primary)',
                          }}
                        >
                          {opt.label}
                        </strong>
                        <span
                          className="text-[11px] font-medium block mt-0.5 line-clamp-1"
                          style={{ color: 'var(--konfrm-text-muted)' }}
                        >
                          {opt.description}
                        </span>
                      </div>
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
                placeholder="أضف وصفاً جذاباً للوحدة يوضح مميزاتها وتفاصيلها..."
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
                حدد المنطقة والقرية أو المنتجع لتسهيل وصول المستأجرين.
              </p>
            </div>

            <div>
              <label
                className="text-sm font-bold block mb-1.5"
                style={{ color: 'var(--konfrm-text-primary)' }}
              >
                المنطقة *
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
              label="القرية أو المنتجع (اختياري)"
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

        {/* STEP 3: CAPACITY & PRICING BENTO */}
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
                أدخل تفاصيل الغرف والمساحة وسعر الليلة بالجنيه المصري.
              </p>
            </div>

            {/* Steppers Bento */}
            <div className="space-y-3">
              <WizardStepper
                label="عدد الغرف *"
                sublabel="0 متاح للاستوديو"
                value={draft.bedrooms}
                min={0}
                max={20}
                onChange={val => updateField('bedrooms', val)}
              />

              <WizardStepper
                label="عدد الحمامات *"
                sublabel="0 متاح للاستوديو"
                value={draft.bathrooms}
                min={0}
                max={20}
                onChange={val => updateField('bathrooms', val)}
              />

              <WizardStepper
                label="أقصى عدد ضيوف *"
                sublabel="الحد الأدنى 1 ضيف"
                value={draft.maxGuests}
                min={1}
                max={50}
                onChange={val => updateField('maxGuests', val)}
              />

              <WizardStepper
                label="عدد الأسرّة"
                sublabel="اختياري"
                value={draft.bedsCount}
                min={0}
                max={50}
                onChange={val => updateField('bedsCount', val)}
              />
            </div>

            {/* Area & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Input
                type="number"
                min="0"
                label="المساحة الإجمالية (م² - اختياري)"
                placeholder="مثال: 120"
                value={draft.areaSqM ?? ''}
                onChange={e =>
                  updateField(
                    'areaSqM',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />

              <Input
                type="number"
                min="1"
                label="سعر الليلة الواحدة (ج.م) *"
                placeholder="مثال: 2500"
                value={draft.pricePerNight ?? ''}
                onChange={e =>
                  updateField(
                    'pricePerNight',
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
              />
            </div>

            {/* Platform Booking Rule Tip */}
            <div
              className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium"
              style={{
                background: 'var(--konfrm-semantic-info-background)',
                borderColor: 'var(--konfrm-semantic-info-border)',
                color: 'var(--konfrm-semantic-info-text)',
              }}
            >
              <Calendar size={18} className="shrink-0" />
              <span>تنبيه: الحد الأدنى للحجز عبر كونفرم هو ليلتان والحد الأقصى 30 ليلة تلقائيًا.</span>
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

            {/* Tri-state House Rules (Override 2) */}
            <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--konfrm-border-subtle)' }}>
              <div>
                <label
                  className="text-sm font-bold block"
                  style={{ color: 'var(--konfrm-text-primary)' }}
                >
                  قواعد الإقامة والشروط
                </label>
                <span className="text-xs font-medium block mt-0.5" style={{ color: 'var(--konfrm-text-muted)' }}>
                  حدد صراحة القواعد المسموحة أو غير المسموحة (اختياري)
                </span>
              </div>

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
                        onClick={() => updateHouseRule(ruleItem.key, currentVal === true ? undefined : true)}
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
                        onClick={() => updateHouseRule(ruleItem.key, currentVal === false ? undefined : false)}
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

              <div>
                <label
                  className="text-xs font-bold block mb-1"
                  style={{ color: 'var(--konfrm-text-secondary)' }}
                >
                  شروط أو تعليمات إضافية (اختياري)
                </label>
                <textarea
                  value={draft.houseRules.additionalRules || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      houseRules: {
                        ...prev.houseRules,
                        additionalRules: e.target.value,
                      },
                    }))
                  }
                  placeholder="أي شروط خاصة ترغب في إبلاغ المستأجر بها..."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--konfrm-surface-primary)',
                    borderColor: 'var(--konfrm-border-default)',
                    color: 'var(--konfrm-text-primary)',
                  }}
                />
              </div>
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
                ارفع صورًا واضحة وحقيقية للوحدة. (صورة واحدة مؤكدة على الأقل مطلوبة للمراجعة).
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
                      key={img.id || img.url || idx}
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
              <div className="p-4 rounded-xl border border-dashed text-center text-xs font-medium text-slate-400">
                لم يتم رفع أي صور بعد.
              </div>
            )}
          </section>
        )}

        {/* STEP 6: REVIEW & CONFIRMATION */}
        {step === 6 && (
          <section className="space-y-3">
            <div
              className="p-4 rounded-2xl border shadow-subtle text-right"
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

            {/* Review Cards with Edit Jump Buttons */}
            {[
              {
                stepNum: 1,
                title: 'الأساسيات',
                details: `${draft.title || '—'} · ${getPropertyTypeLabel(draft.propertyType)}`,
              },
              {
                stepNum: 2,
                title: 'الموقع',
                details: `${draft.region || '—'}${draft.resortName ? ` · ${draft.resortName}` : ''}`,
              },
              {
                stepNum: 3,
                title: 'السعة والتسعير',
                details: `${draft.bedrooms ?? 0} غرف · ${draft.bathrooms ?? 0} حمامات · ${draft.maxGuests ?? 0} ضيوف · ${(draft.pricePerNight || 0).toLocaleString('ar-EG')} ج.م / ليلة`,
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

      {/* Floating Bottom Action Island */}
      <aside
        role="region"
        aria-label="إجراءات المتابعة"
        className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 p-2 rounded-[24px] border shadow-lg flex items-center gap-2"
        style={{
          background: 'var(--konfrm-surface-primary)',
          borderColor: 'var(--konfrm-border-default)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        }}
      >
        {/* Secondary Action: Previous Step (56x56) */}
        {step > 1 && (
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={isBusy}
            aria-label="الخطوة السابقة"
            className="w-14 h-14 rounded-[18px] border flex items-center justify-center font-bold text-sm transition-all cursor-pointer shrink-0"
            style={{
              background: 'var(--konfrm-surface-secondary)',
              borderColor: 'var(--konfrm-border-default)',
              color: 'var(--konfrm-text-primary)',
            }}
          >
            <ArrowRight size={20} />
          </button>
        )}

        {/* Primary Action: Next Step or Submit (56px height, flex-1) */}
        <button
          type="button"
          onClick={step < 6 ? handleNextStep : handleFinalSubmit}
          disabled={isBusy}
          className="h-14 flex-1 rounded-[18px] font-extrabold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          style={{
            background: 'var(--konfrm-color-primary)',
          }}
        >
          {isBusy ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>جارٍ المعالجة...</span>
            </>
          ) : step < 6 ? (
            <>
              <span>المتابعة للخطوة التالية</span>
              <ArrowLeft size={18} />
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>
                {isPublished
                  ? 'حفظ التعديلات'
                  : isRejected
                  ? 'إعادة الإرسال للمراجعة'
                  : 'إرسال الوحدة للمراجعة'}
              </span>
            </>
          )}
        </button>
      </aside>

      {/* Success Bottom Sheet Modal */}
      {isSubmitted && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
        >
          <div
            className="w-full sm:max-w-md p-6 rounded-t-[28px] sm:rounded-[28px] border shadow-2xl space-y-5 text-center"
            style={{
              background: 'var(--konfrm-surface-primary)',
              borderColor: 'var(--konfrm-border-default)',
            }}
          >
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
              style={{
                background: 'var(--konfrm-semantic-success-background)',
                color: 'var(--konfrm-semantic-success-solid)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h3
                className="text-lg font-black"
                style={{ color: 'var(--konfrm-text-primary)' }}
              >
                {isRejected
                  ? 'تمت إعادة إرسال الوحدة للمراجعة بنجاح 🎉'
                  : 'تم إرسال الوحدة للمراجعة بنجاح 🎉'}
              </h3>
              <p
                className="text-xs font-medium leading-relaxed"
                style={{ color: 'var(--konfrm-text-secondary)' }}
              >
                سيقوم فريق الجودة بمراجعة بيانات الوحدة واعتمادها للنشر على المنصة خلال ساعات قليلة.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setPropertyViewMode('list');
                }}
                className="w-full h-14 rounded-[18px] text-white font-extrabold text-sm flex items-center justify-center cursor-pointer transition-all shadow-xs"
                style={{
                  background: 'var(--konfrm-color-primary)',
                }}
              >
                العودة لقائمة الوحدات
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
