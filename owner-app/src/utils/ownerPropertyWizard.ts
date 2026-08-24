import type { Property, PropertyStatus, PropertyType, PropertyRules } from '../types';
import type { CreatePropertyPayload, UpdatePropertyPayload } from '../services/contracts';

export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<{ value: PropertyType; label: string }> = [
  { value: 'CHALET', label: 'شاليه' },
  { value: 'VILLA', label: 'فيلا' },
  { value: 'APARTMENT', label: 'شقة' },
  { value: 'STUDIO', label: 'استوديو' },
  { value: 'HOTEL_ROOM', label: 'غرفة فندقية' },
  { value: 'OTHER', label: 'نوع آخر' },
] as const;

export const VALID_PROPERTY_TYPES = new Set<PropertyType>([
  'CHALET',
  'VILLA',
  'APARTMENT',
  'STUDIO',
  'HOTEL_ROOM',
  'OTHER',
]);

export function getPropertyTypeLabel(type?: PropertyType): string {
  if (!type) return '—';
  const match = PROPERTY_TYPE_OPTIONS.find(opt => opt.value === type);
  return match ? match.label : type;
}

export interface WizardPropertyImage {
  id: string;
  url: string;
  sortOrder?: number;
  status: 'committed' | 'uploading' | 'failed';
  error?: string;
}

export interface WizardHouseRules {
  smokingAllowed?: boolean;
  partiesAllowed?: boolean;
  petsAllowed?: boolean;
  childrenAllowed?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  additionalRules?: string;
}

export interface OwnerPropertyWizardDraft {
  existingPropertyId?: string;
  canonicalStatus?: PropertyStatus;
  rejectionReason?: string;

  title?: string;
  description?: string;

  propertyType?: PropertyType;
  unitType?: PropertyType;

  region?: string;
  resortName?: string;
  address?: string;

  bedrooms?: number;
  bathrooms?: number;
  bedsCount?: number;
  maxGuests?: number;
  areaSqM?: number;

  pricePerNight?: number;
  currency: 'EGP';

  amenities: string[];
  houseRules: WizardHouseRules;
  images: WizardPropertyImage[];
}

export function createEmptyPropertyWizardDraft(): OwnerPropertyWizardDraft {
  return {
    currency: 'EGP',
    amenities: [],
    images: [],
    houseRules: {},
  };
}

export function hydratePropertyToWizard(property: Property): OwnerPropertyWizardDraft {
  const images: WizardPropertyImage[] = (property.propertyImages && property.propertyImages.length > 0)
    ? property.propertyImages.map(img => ({
        id: img.id,
        url: img.url,
        sortOrder: img.order,
        status: 'committed' as const,
      }))
    : (property.images || []).map((url, idx) => ({
        id: `img-${idx}`,
        url,
        sortOrder: idx,
        status: 'committed' as const,
      }));

  const rawPropertyType = property.propertyType as unknown as PropertyType;
  const rawUnitType = property.unitType as unknown as PropertyType;

  const propertyType: PropertyType | undefined = VALID_PROPERTY_TYPES.has(rawPropertyType)
    ? rawPropertyType
    : VALID_PROPERTY_TYPES.has(rawUnitType)
    ? rawUnitType
    : undefined;

  const unitType: PropertyType | undefined = VALID_PROPERTY_TYPES.has(rawUnitType)
    ? rawUnitType
    : propertyType;

  return {
    existingPropertyId: property.id,
    canonicalStatus: property.status,
    rejectionReason: property.rejectionReason,

    title: property.title || '',
    description: property.description || '',

    propertyType,
    unitType,

    region: property.region || property.location?.governorate || '',
    resortName: property.resortName || property.location?.resortName || '',
    address: property.address || property.location?.address || '',

    bedrooms: typeof property.bedrooms === 'number' ? property.bedrooms : property.capacity?.bedrooms,
    bathrooms: typeof property.bathrooms === 'number' ? property.bathrooms : property.capacity?.bathrooms,
    bedsCount: typeof property.bedsCount === 'number' ? property.bedsCount : property.capacity?.beds,
    maxGuests: typeof property.maxGuests === 'number' ? property.maxGuests : property.capacity?.maxGuests,
    areaSqM: typeof property.areaSqM === 'number' ? property.areaSqM : property.capacity?.areaSqM,

    pricePerNight: property.pricePerNight ?? property.pricing?.basePricePerNight,
    currency: 'EGP',

    amenities: Array.isArray(property.amenities) ? [...property.amenities] : [],
    houseRules: property.houseRules ? {
      smokingAllowed: property.houseRules.smokingAllowed,
      partiesAllowed: property.houseRules.partiesAllowed,
      petsAllowed: property.houseRules.petsAllowed,
      childrenAllowed: property.houseRules.childrenAllowed,
      checkInTime: property.houseRules.checkInTime,
      checkOutTime: property.houseRules.checkOutTime,
      additionalRules: property.houseRules.additionalRules || property.houseRules.specialInstructions,
    } : {},
    images,
  };
}

export function validateStep1Basics(draft: OwnerPropertyWizardDraft): { isValid: boolean; error?: string } {
  if (!draft.title || draft.title.trim().length < 3) {
    return { isValid: false, error: 'يرجى إدخال اسم صحيح للوحدة (3 أحرف على الأقل).' };
  }
  if (!draft.propertyType || !VALID_PROPERTY_TYPES.has(draft.propertyType)) {
    return { isValid: false, error: 'يرجى اختيار نوع الوحدة.' };
  }
  return { isValid: true };
}

export function validateStep2Location(draft: OwnerPropertyWizardDraft): { isValid: boolean; error?: string } {
  if (!draft.region || !draft.region.trim()) {
    return { isValid: false, error: 'يرجى اختيار المنطقة الجغرافية للوحدة.' };
  }
  return { isValid: true };
}

export function validateStep3CapacityPricing(draft: OwnerPropertyWizardDraft): { isValid: boolean; error?: string } {
  if (typeof draft.bedrooms !== 'number' || isNaN(draft.bedrooms) || draft.bedrooms < 0) {
    return { isValid: false, error: 'يرجى تحديد عدد الغرف (0 أو أكثر).' };
  }
  if (typeof draft.bathrooms !== 'number' || isNaN(draft.bathrooms) || draft.bathrooms < 0) {
    return { isValid: false, error: 'يرجى تحديد عدد الحمامات (0 أو أكثر).' };
  }
  if (typeof draft.maxGuests !== 'number' || isNaN(draft.maxGuests) || draft.maxGuests <= 0) {
    return { isValid: false, error: 'يرجى تحديد أقصى عدد للضيوف (1 على الأقل).' };
  }
  if (typeof draft.pricePerNight !== 'number' || isNaN(draft.pricePerNight) || draft.pricePerNight <= 0) {
    return { isValid: false, error: 'يرجى إدخال سعر إيجار لليلة الواحدة (أكبر من صفر).' };
  }
  return { isValid: true };
}

export function validateStep4AmenitiesRules(_draft: OwnerPropertyWizardDraft): { isValid: boolean; error?: string } {
  return { isValid: true };
}

export function validateStep5Images(draft: OwnerPropertyWizardDraft, requireImages = false): { isValid: boolean; error?: string } {
  const committedImages = draft.images.filter(img => img.status === 'committed');
  if (requireImages && committedImages.length === 0) {
    return { isValid: false, error: 'يرجى رفع صورة واحدة مؤكدة على الأقل للوحدة قبل إرسالها للمراجعة.' };
  }
  return { isValid: true };
}

export function validateStep(step: number, draft: OwnerPropertyWizardDraft): { isValid: boolean; error?: string } {
  switch (step) {
    case 1:
      return validateStep1Basics(draft);
    case 2:
      return validateStep2Location(draft);
    case 3:
      return validateStep3CapacityPricing(draft);
    case 4:
      return validateStep4AmenitiesRules(draft);
    case 5:
      return validateStep5Images(draft, false);
    case 6:
      return validateWizardForSubmission(draft);
    default:
      return { isValid: true };
  }
}

export function canCreateCanonicalServerDraft(draft: OwnerPropertyWizardDraft): boolean {
  const v1 = validateStep1Basics(draft);
  const v3 = validateStep3CapacityPricing(draft);
  return v1.isValid && v3.isValid;
}

export function validateWizardForSubmission(draft: OwnerPropertyWizardDraft): { isValid: boolean; error?: string } {
  const v1 = validateStep1Basics(draft);
  if (!v1.isValid) return v1;

  const v2 = validateStep2Location(draft);
  if (!v2.isValid) return v2;

  const v3 = validateStep3CapacityPricing(draft);
  if (!v3.isValid) return v3;

  const v5 = validateStep5Images(draft, true);
  if (!v5.isValid) return v5;

  return { isValid: true };
}

export function serializeHouseRules(rules: WizardHouseRules): PropertyRules {
  return {
    minStay: 2,
    maxStay: 30,
    smokingAllowed: rules.smokingAllowed === true,
    partiesAllowed: rules.partiesAllowed === true,
    petsAllowed: rules.petsAllowed === true,
    childrenAllowed: rules.childrenAllowed !== false,
    checkInTime: rules.checkInTime || '14:00',
    checkOutTime: rules.checkOutTime || '12:00',
    specialInstructions: rules.additionalRules || '',
    additionalRules: rules.additionalRules || '',
  };
}

export function buildCreatePropertyPayload(draft: OwnerPropertyWizardDraft): CreatePropertyPayload {
  const propertyType: PropertyType = draft.propertyType || 'CHALET';
  const unitType: PropertyType = draft.unitType || propertyType;

  return {
    title: (draft.title || '').trim(),
    unitType,
    propertyType,
    address: (draft.address || '').trim(),
    region: draft.region || '',
    resortName: draft.resortName || '',
    description: draft.description || '',
    bedrooms: draft.bedrooms ?? 0,
    bathrooms: draft.bathrooms ?? 0,
    bedsCount: draft.bedsCount,
    maxGuests: draft.maxGuests ?? 1,
    areaSqM: draft.areaSqM,
    basePricePerNight: draft.pricePerNight ?? 0,
    pricePerNight: draft.pricePerNight ?? 0,
    images: draft.images.filter(img => img.status === 'committed').map(img => img.url),
    amenities: [...draft.amenities],
    houseRules: serializeHouseRules(draft.houseRules),
    status: 'DRAFT',
    verificationStatus: 'UNVERIFIED',
  };
}

export function buildUpdatePropertyPayload(
  draft: OwnerPropertyWizardDraft,
  resubmit = false
): UpdatePropertyPayload & { resubmit?: boolean } {
  const propertyType = draft.propertyType;
  const unitType = draft.unitType || propertyType;

  const payload: UpdatePropertyPayload & { resubmit?: boolean } = {
    title: draft.title?.trim(),
    unitType,
    propertyType,
    address: draft.address?.trim(),
    region: draft.region,
    resortName: draft.resortName,
    description: draft.description,
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    bedsCount: draft.bedsCount,
    maxGuests: draft.maxGuests,
    areaSqM: draft.areaSqM,
    basePricePerNight: draft.pricePerNight,
    pricePerNight: draft.pricePerNight,
    images: draft.images.filter(img => img.status === 'committed').map(img => img.url),
    amenities: [...draft.amenities],
    houseRules: serializeHouseRules(draft.houseRules),
  };

  if (resubmit) {
    payload.resubmit = true;
  }

  return payload;
}

