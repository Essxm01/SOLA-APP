import { canCreateCanonicalServerDraft, createEmptyPropertyWizardDraft } from './ownerPropertyWizard';
const assert = (value: boolean, message: string) => { if (!value) throw new Error(message); };

const empty = createEmptyPropertyWizardDraft();
assert(!canCreateCanonicalServerDraft(empty), 'an empty local wizard must not create a server draft');
assert(empty.images.length === 0 && empty.amenities.length === 0, 'new local wizard must not fabricate content');

const valid = {
  ...empty,
  title: 'وحدة حقيقية', propertyType: 'CHALET' as const, unitType: 'شاليه' as const,
  bedrooms: 0, bathrooms: 1, maxGuests: 2, pricePerNight: 2000,
};
assert(canCreateCanonicalServerDraft(valid), 'complete owner input can create a canonical draft');
assert(!canCreateCanonicalServerDraft({ ...valid, pricePerNight: 0 }), 'zero price must not create a server draft');
assert(!canCreateCanonicalServerDraft({ ...valid, unitType: undefined }), 'missing unit type must not create a server draft');
console.log('OWNER-PROPERTY-WIZARD-01 derivations passed.');
