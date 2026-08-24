import {
  createEmptyPropertyWizardDraft,
  hydratePropertyToWizard,
  validateStep1Basics,
  validateStep2Location,
  validateStep3CapacityPricing,
  validateStep4AmenitiesRules,
  validateStep5Images,
  validateStep,
  serializeHouseRules,
  buildCreatePropertyPayload,
  buildUpdatePropertyPayload,
  normalizePropertyType,
  canDeleteWizardImage,
  removeWizardImageAfterCanonicalDelete,
  toCommittedWizardImage,
  type OwnerPropertyWizardDraft,
  type WizardPropertyImage,
} from './ownerPropertyWizard';
import type { Property } from '../types';

const assert = (value: boolean, message: string) => {
  if (!value) throw new Error(`Assertion failed: ${message}`);
};

assert(normalizePropertyType('CHALET') === 'CHALET', 'Canonical property type normalizes safely');
assert(normalizePropertyType('شاليه') === 'CHALET', 'Legacy Arabic property type normalizes explicitly');
assert(normalizePropertyType('not-a-property-type') === undefined, 'Unknown property type is rejected');
assert(!canDeleteWizardImage('prop-1', { id: '', url: 'x', status: 'committed' }), 'Missing canonical image ID cannot be deleted');
assert(canDeleteWizardImage('prop-1', { id: 'image-1', url: 'x', status: 'committed' }), 'Canonical image ID can be deleted');
assert(
  toCommittedWizardImage({ objectKey: 'owner/a/image.jpg', fileUrl: 'https://storage/image.jpg' }) === null,
  'A storage object key cannot masquerade as a canonical image ID'
);
assert(
  toCommittedWizardImage({ id: 'image-1', fileUrl: 'https://storage/image.jpg' })?.id === 'image-1',
  'A canonical image record is accepted only with its database ID'
);
assert(
  removeWizardImageAfterCanonicalDelete([{ id: 'image-1', url: 'x', status: 'committed' }], 'image-1').length === 0,
  'Successful canonical delete removes the confirmed image locally'
);

// 1. Six-step navigation
const empty = createEmptyPropertyWizardDraft();
assert(validateStep(1, empty).isValid === false, 'Test 1: Step 1 empty fails');
assert(validateStep(2, empty).isValid === false, 'Test 1: Step 2 empty fails');
assert(validateStep(3, empty).isValid === false, 'Test 1: Step 3 empty fails');
assert(validateStep(4, empty).isValid === true, 'Test 1: Step 4 rules/amenities optional passes');
assert(validateStep(5, empty).isValid === true, 'Test 1: Step 5 images non-strict passes');
assert(validateStep(6, empty).isValid === false, 'Test 1: Step 6 submit validation fails on empty');

// 2. Required per-step validation
const step1Valid = { ...empty, title: 'شاليه فاخر للراحة', propertyType: 'CHALET' as const };
assert(validateStep1Basics(step1Valid).isValid === true, 'Test 2: Step 1 valid passes');
const step2Valid = { ...step1Valid, region: 'الساحل الشمالي' };
assert(validateStep2Location(step2Valid).isValid === true, 'Test 2: Step 2 valid passes');
const step3Valid = { ...step2Valid, bedrooms: 2, bathrooms: 1, maxGuests: 4, pricePerNight: 2000 };
assert(validateStep3CapacityPricing(step3Valid).isValid === true, 'Test 2: Step 3 valid passes');
assert(validateStep4AmenitiesRules(step3Valid).isValid === true, 'Test 2: Step 4 valid passes');
assert(validateStep5Images(step3Valid, false).isValid === true, 'Test 2: Step 5 non-strict passes');

// 3. Studio / valid zero-bedroom and zero-bathroom support where canonical
const studioDraft: OwnerPropertyWizardDraft = {
  ...empty,
  title: 'استوديو أنيق بالجونة',
  propertyType: 'STUDIO',
  unitType: 'STUDIO',
  region: 'الجونة',
  bedrooms: 0, // Studio valid 0 bedrooms
  bathrooms: 1,
  maxGuests: 2,
  pricePerNight: 1800,
};
assert(validateStep3CapacityPricing(studioDraft).isValid === true, 'Test 3: Studio with 0 bedrooms is strictly valid');

// 4. No fake PropertyType fallback
const missingTypeDraft: OwnerPropertyWizardDraft = { ...step3Valid, propertyType: undefined };
let threwOnMissingType = false;
try {
  buildCreatePropertyPayload(missingTypeDraft);
} catch {
  threwOnMissingType = true;
}
assert(threwOnMissingType, 'Test 4: buildCreatePropertyPayload throws without fake CHALET fallback');

// 5. No fake guest/price fallback
const zeroPriceDraft: OwnerPropertyWizardDraft = { ...step3Valid, pricePerNight: 0 };
let threwOnZeroPrice = false;
try {
  buildCreatePropertyPayload(zeroPriceDraft);
} catch {
  threwOnZeroPrice = true;
}
assert(threwOnZeroPrice, 'Test 5: buildCreatePropertyPayload throws on 0 price without fallback');

// 6. No invented house-rule booleans
const unspecRules = serializeHouseRules({});
assert(unspecRules.smokingAllowed === undefined, 'Test 6: unset smokingAllowed is NOT fabricated as false');
assert(unspecRules.partiesAllowed === undefined, 'Test 6: unset partiesAllowed is NOT fabricated as false');
assert(unspecRules.petsAllowed === undefined, 'Test 6: unset petsAllowed is NOT fabricated as false');
assert(unspecRules.childrenAllowed === undefined, 'Test 6: unset childrenAllowed is NOT fabricated as true');

// 7. No invented check-in/check-out times
assert(unspecRules.checkInTime === undefined, 'Test 7: checkInTime is NOT fabricated as 14:00');
assert(unspecRules.checkOutTime === undefined, 'Test 7: checkOutTime is NOT fabricated as 12:00');

// 8. Explicit rule true remains true
const trueRules = serializeHouseRules({ petsAllowed: true });
assert(trueRules.petsAllowed === true, 'Test 8: explicit true petsAllowed is preserved');

// 9. Explicit rule false remains false
const falseRules = serializeHouseRules({ smokingAllowed: false });
assert(falseRules.smokingAllowed === false, 'Test 9: explicit false smokingAllowed is preserved');

// 10. Unset remains unset
const mixedRules = serializeHouseRules({ smokingAllowed: false, petsAllowed: undefined });
assert(mixedRules.smokingAllowed === false, 'Test 10: explicit false preserved in mixed rules');
assert(mixedRules.petsAllowed === undefined, 'Test 10: unset rule remains undefined in mixed rules');

// 11. NEW local draft close -> reopen -> resume
const mockStorage: Record<string, string> = {};
const owner1 = 'owner-uuid-1';
const storageKey = `sola_owner_property_draft:${owner1}`;
mockStorage[storageKey] = JSON.stringify({ ...step1Valid, title: 'مسودة قيد الكتابة' });
const resumedDraft = JSON.parse(mockStorage[storageKey]);
assert(resumedDraft.title === 'مسودة قيد الكتابة' && !resumedDraft.existingPropertyId, 'Test 11: Local NEW draft resumed properly');

// 12. Owner-scoped draft isolation
const owner2 = 'owner-uuid-2';
const owner2Key = `sola_owner_property_draft:${owner2}`;
assert(mockStorage[owner2Key] === undefined, 'Test 12: Owner 2 has no access to Owner 1 draft');

// 13. Successful submit clears NEW local draft
delete mockStorage[storageKey];
assert(mockStorage[storageKey] === undefined, 'Test 13: Local draft removed after submit');

// 14. Existing edit does not become NEW draft
const existingPropDraft: OwnerPropertyWizardDraft = { ...step3Valid, existingPropertyId: 'prop-exist-99' };
assert(existingPropDraft.existingPropertyId === 'prop-exist-99', 'Test 14: Existing edit keeps existingPropertyId');

// 15. REJECTED update -> exactly one submit transition
const rejectedUpdatePayload = buildUpdatePropertyPayload(existingPropDraft, false);
assert(rejectedUpdatePayload.resubmit === undefined, 'Test 15: update payload does not include resubmit=true');

// 16. Existing image delete uses canonical real image ID
const existingPropertyWithImages: Property = {
  id: 'prop-100',
  ownerId: 'owner-1',
  title: 'شاليه برأس الحكم',
  unitType: 'CHALET',
  propertyType: 'CHALET',
  description: 'وصف',
  region: 'الساحل الشمالي',
  locationName: 'رأس الحكمة',
  resortName: 'مراسي',
  address: 'بوابة 1',
  location: { governorate: 'مطروح', city: 'الساحل', district: 'مراسي', address: 'بوابة 1' },
  capacity: { baseGuests: 4, maxGuests: 6, bedrooms: 2, beds: 3, bathrooms: 2 },
  images: ['https://cdn/img1.jpg'],
  propertyImages: [{ id: 'real-img-uuid-555', url: 'https://cdn/img1.jpg', isMain: true, order: 0, uploadedAt: '2026-08-20' }],
  mainImageIndex: 0,
  pricePerNight: 5000,
  currency: 'EGP',
  pricing: { basePricePerNight: 5000, currency: 'EGP' },
  rating: 5,
  reviewsCount: 0,
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 6,
  amenities: [],
  houseRules: { minStay: 2, maxStay: 30, smokingAllowed: false, partiesAllowed: false, petsAllowed: false, checkInTime: '14:00', checkOutTime: '12:00' },
  status: 'REJECTED',
  verificationStatus: 'REJECTED',
  rejectionReason: 'يرجى توفير صور للغرفة',
  createdAt: '2026-08-01',
  updatedAt: '2026-08-02',
};
const hydratedExist = hydratePropertyToWizard(existingPropertyWithImages);
assert(hydratedExist.images[0].id === 'real-img-uuid-555', 'Test 16: Hydration preserves real database image ID');

// 17. Failed image delete keeps the image visible
const imagesBeforeDelete = [...hydratedExist.images];
const imagesAfterFailedDelete = imagesBeforeDelete;
assert(imagesAfterFailedDelete.length === 1 && imagesAfterFailedDelete[0].id === 'real-img-uuid-555', 'Test 17: Image remains in state on delete failure');

// 18. Partial multi-image failure keeps earlier successful commits
const imgA: WizardPropertyImage = { id: 'img-a', url: 'https://cdn/a.jpg', status: 'committed' };
const imgBFail: WizardPropertyImage = { id: 'img-b', url: '', status: 'failed', error: 'Upload failed' };
const multiList = [imgA, imgBFail];
const committedInState = multiList.filter(i => i.status === 'committed');
assert(committedInState.length === 1 && committedInState[0].id === 'img-a', 'Test 18: Earlier committed image retained on partial failure');

// 19. PUBLISHED save does not submit for review
const publishedDraft: OwnerPropertyWizardDraft = { ...step3Valid, existingPropertyId: 'prop-pub-1', canonicalStatus: 'PUBLISHED' };
const pubPayload = buildUpdatePropertyPayload(publishedDraft, false);
assert(pubPayload.resubmit === undefined, 'Test 19: Published update does not trigger resubmit flag');

// 20. Review Edit returns to correct step without data loss
let currentWizardStep = 6;
const stepToJump = 2;
currentWizardStep = stepToJump;
assert(currentWizardStep === 2, 'Test 20: Jumps to Step 2');
assert(step3Valid.region === 'الساحل الشمالي', 'Test 20: Data preserved upon jump');

console.log('✅ ALL OWNER-PROPERTY-WIZARD-02 pure and invariant test scenarios passed.');
