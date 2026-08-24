import type { Property, PropertyType } from '../types';

export type OwnerPropertyWizardDraft = Partial<Property> & { currency: 'EGP'; amenities: string[]; images: string[] };
const propertyTypes = new Set<PropertyType>(['CHALET', 'VILLA', 'APARTMENT', 'STUDIO', 'HOTEL_ROOM', 'OTHER']);
export const createEmptyPropertyWizardDraft = (): OwnerPropertyWizardDraft => ({ currency: 'EGP', amenities: [], images: [], houseRules: {} as Property['houseRules'] });
export const canCreateCanonicalServerDraft = (draft: Partial<Property>) => Boolean(
  draft.title?.trim() && propertyTypes.has(draft.propertyType as PropertyType) && propertyTypes.has(draft.unitType as PropertyType) &&
  typeof draft.bedrooms === 'number' && draft.bedrooms >= 0 && typeof draft.bathrooms === 'number' && draft.bathrooms >= 0 &&
  typeof draft.maxGuests === 'number' && draft.maxGuests > 0 && typeof draft.pricePerNight === 'number' && draft.pricePerNight > 0
);
