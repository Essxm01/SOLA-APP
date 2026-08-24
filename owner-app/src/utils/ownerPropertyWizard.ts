import type { Property, PropertyStatus, PropertyType, PropertyRules } from '../types';
import type { CreatePropertyPayload, UpdatePropertyPayload } from '../services/contracts';

export interface PropertyTypeOption {
  value: PropertyType;
  label: string;
  emoji: string;
  description: string;
}

export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<PropertyTypeOption> = [
  { value: 'CHALET', label: 'شاليه', emoji: '🏖️', description: 'شاليه مصيفي أو شاطئي' },
  { value: 'VILLA', label: 'فيلا', emoji: '🏡', description: 'فيلا مستقلة مع حديقة أو مسبح' },
  { value: 'APARTMENT', label: 'شقة', emoji: '🏢', description: 'شقة سكنية مصيفية' },
  { value: 'STUDIO', label: 'استوديو', emoji: '🛋️', description: 'استوديو مفتوح بدون غرف منفصلة' },
  { value: 'HOTEL_ROOM', label: 'غرفة فندقية', emoji: '🏨', description: 'غرفة أو جناح فندقي' },
  { value: 'OTHER', label: 'نوع آخر', emoji: '📍', description: 'نوع إقامة آخر' },
] as const;

export const VALID_PROPERTY_TYPES = new Set<PropertyType>([
  'CHALET',
  'VILLA',
  'APARTMENT',
  'STUDIO',
  'HOTEL_ROOM',
  'OTHER',
]);

const LEGACY_PROPERTY_TYPE_MAP: Readonly<Record<string, PropertyType>> = {
  'شاليه': 'CHALET',
  'فيلا': 'VILLA',
  'شقة': 'APARTMENT',
  'استوديو': 'STUDIO',
  'غرفة فندقية': 'HOTEL_ROOM',
  'نوع آخر': 'OTHER',
};

export function normalizePropertyType(value: unknown): PropertyType | undefined {
  if (typeof value !== 'string') return undefined;
  const canonical = PROPERTY_TYPE_OPTIONS.find(option => option.value === value);
  if (canonical) return canonical.value;
  return LEGACY_PROPERTY_TYPE_MAP[value.trim()];
}

export function getPropertyTypeLabel(type?: PropertyType): string {
  if (!type) return '—';
  const match = PROPERTY_TYPE_OPTIONS.find(opt => opt.value === type);
  return match ? match.label : type;
}

export function getPropertyTypeEmoji(type?: PropertyType): string {
  if (!type) return '🏠';
  const match = PROPERTY_TYPE_OPTIONS.find(opt => opt.value === type);
  return match ? match.emoji : '🏠';
}

export interface WizardPropertyImage {
  id: string;
  url: string;
  sortOrder?: number;
  status: 'committed' | 'uploading' | 'failed';
  error?: string;
}

export function canDeleteWizardImage(propertyId: string | undefined, image: WizardPropertyImage): boolean {
  return Boolean(propertyId && image.status === 'committed' && image.id);
}

/** Called only after the canonical delete endpoint confirms success. */
export function removeWizardImageAfterCanonicalDelete(
  images: WizardPropertyImage[],
  imageId: string
): WizardPropertyImage[] {
  return images.filter(image => image.id !== imageId);
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

export function isOwnerPropertyWizardDraft(value: unknown): value is OwnerPropertyWizardDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<OwnerPropertyWizardDraft>;
  return draft.currency === 'EGP' && Array.isArray(draft.amenities) && Array.isArray(draft.images) && !!draft.houseRules;
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
        id: '', // Never fabricate fake IDs like img-0 or img-1 (Override 5D)
        url,
        sortOrder: idx,
        status: 'committed' as const,
      }));

  const propertyType = normalizePropertyType(property.propertyType) ?? normalizePropertyType(property.unitType);
  const unitType = normalizePropertyType(property.unitType) ?? propertyType;

  const rawHouseRules = property.houseRules;
  const houseRules: WizardHouseRules = {};
  if (rawHouseRules) {
    if (typeof rawHouseRules.smokingAllowed === 'boolean') houseRules.smokingAllowed = rawHouseRules.smokingAllowed;
    if (typeof rawHouseRules.partiesAllowed === 'boolean') houseRules.partiesAllowed = rawHouseRules.partiesAllowed;
    if (typeof rawHouseRules.petsAllowed === 'boolean') houseRules.petsAllowed = rawHouseRules.petsAllowed;
    if (typeof rawHouseRules.childrenAllowed === 'boolean') houseRules.childrenAllowed = rawHouseRules.childrenAllowed;
    if (typeof rawHouseRules.checkInTime === 'string' && rawHouseRules.checkInTime) houseRules.checkInTime = rawHouseRules.checkInTime;
    if (typeof rawHouseRules.checkOutTime === 'string' && rawHouseRules.checkOutTime) houseRules.checkOutTime = rawHouseRules.checkOutTime;
    if (rawHouseRules.additionalRules || rawHouseRules.specialInstructions) {
      houseRules.additionalRules = rawHouseRules.additionalRules || rawHouseRules.specialInstructions;
    }
  }

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
    houseRules,
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
  const v2 = validateStep2Location(draft);
  const v3 = validateStep3CapacityPricing(draft);
  return v1.isValid && v2.isValid && v3.isValid;
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
  const serialized: Pick<PropertyRules, 'minStay' | 'maxStay'> & Partial<Omit<PropertyRules, 'minStay' | 'maxStay'>> = {
    minStay: 2,
    maxStay: 30,
  };

  // OVERRIDE 2: Tri-state rules preservation. Do not fabricate false or true if unset.
  if (rules.smokingAllowed !== undefined) serialized.smokingAllowed = rules.smokingAllowed;
  if (rules.partiesAllowed !== undefined) serialized.partiesAllowed = rules.partiesAllowed;
  if (rules.petsAllowed !== undefined) serialized.petsAllowed = rules.petsAllowed;
  if (rules.childrenAllowed !== undefined) serialized.childrenAllowed = rules.childrenAllowed;

  // Do not fabricate checkIn/checkOut times if unset
  if (rules.checkInTime !== undefined && rules.checkInTime.trim() !== '') serialized.checkInTime = rules.checkInTime;
  if (rules.checkOutTime !== undefined && rules.checkOutTime.trim() !== '') serialized.checkOutTime = rules.checkOutTime;

  if (rules.additionalRules !== undefined && rules.additionalRules.trim() !== '') {
    serialized.additionalRules = rules.additionalRules;
    serialized.specialInstructions = rules.additionalRules;
  }

  // The API type predates tri-state rules. Only explicitly selected values are sent.
  return serialized as PropertyRules;
}

export function buildCreatePropertyPayload(draft: OwnerPropertyWizardDraft): CreatePropertyPayload {
  const v1 = validateStep1Basics(draft);
  if (!v1.isValid) throw new Error(v1.error || 'PROPERTY_TYPE_AND_TITLE_REQUIRED');

  const v2 = validateStep2Location(draft);
  if (!v2.isValid) throw new Error(v2.error || 'REGION_REQUIRED');

  const v3 = validateStep3CapacityPricing(draft);
  if (!v3.isValid) throw new Error(v3.error || 'CAPACITY_AND_PRICE_REQUIRED');

  // OVERRIDE 5A: No fabricated create payload defaults
  const propertyType: PropertyType = draft.propertyType!;
  const unitType: PropertyType = draft.unitType || propertyType;

  return {
    title: draft.title!.trim(),
    unitType,
    propertyType,
    address: (draft.address || '').trim(),
    region: draft.region!,
    resortName: draft.resortName || '',
    description: draft.description || '',
    bedrooms: draft.bedrooms!,
    bathrooms: draft.bathrooms!,
    bedsCount: draft.bedsCount,
    maxGuests: draft.maxGuests!,
    areaSqM: draft.areaSqM,
    basePricePerNight: draft.pricePerNight!,
    pricePerNight: draft.pricePerNight!,
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
