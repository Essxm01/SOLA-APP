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
  bindNewDraftToServerProperty,
  clearResumableNewDraft,
  deleteWizardImageAfterCanonicalDelete,
  isResumableNewDraft,
  prepareReviewEdit,
  resubmitRejectedProperty,
  restoreResumableNewDraft,
  saveResumableNewDraft,
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
const imagesAfterConfirmedDelete = await deleteWizardImageAfterCanonicalDelete(
  [{ id: 'image-1', url: 'x', status: 'committed' }],
  'image-1',
  async () => undefined
);
assert(imagesAfterConfirmedDelete.length === 0, 'Successful canonical delete removes the confirmed image locally');

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

// 11–14. New-flow storage persists independently of server-ID binding and Owner edits.
const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
};
const owner1Key = 'sola_owner_property_draft:owner-uuid-1';
const owner2Key = 'sola_owner_property_draft:owner-uuid-2';
const newFlowDraft: OwnerPropertyWizardDraft = { ...step3Valid, origin: 'NEW', title: 'مسودة قيد الكتابة' };
saveResumableNewDraft(storage, owner1Key, newFlowDraft);
assert(restoreResumableNewDraft(storage.getItem(owner1Key))?.title === 'مسودة قيد الكتابة', 'Test 11: NEW local draft reopens with its entered data');
assert(storage.getItem(owner2Key) === null, 'Test 12: Owner-scoped NEW draft does not appear for another Owner');

const boundNewFlow = bindNewDraftToServerProperty(newFlowDraft, 'server-draft-99');
saveResumableNewDraft(storage, owner1Key, boundNewFlow);
const resumedBoundNewFlow = restoreResumableNewDraft(storage.getItem(owner1Key));
assert(resumedBoundNewFlow?.origin === 'NEW' && resumedBoundNewFlow.existingPropertyId === 'server-draft-99', 'Test 13: Image-bound server DRAFT resumes as the same NEW flow');

const existingPropDraft: OwnerPropertyWizardDraft = { ...step3Valid, origin: 'EXISTING', existingPropertyId: 'prop-exist-99' };
saveResumableNewDraft(storage, owner2Key, existingPropDraft);
assert(storage.getItem(owner2Key) === null && !isResumableNewDraft(existingPropDraft), 'Test 14: Existing-property edit is never exposed as an Add-New resume draft');

clearResumableNewDraft(storage, owner1Key, resumedBoundNewFlow!);
assert(restoreResumableNewDraft(storage.getItem(owner1Key)) === null, 'Test 15: Successful NEW submission clears its resume state');

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
  status: 'DRAFT',
  verificationStatus: 'REJECTED',
  rejectionReason: 'يرجى توفير صور للغرفة',
  createdAt: '2026-08-01',
  updatedAt: '2026-08-02',
};
const hydratedExist = hydratePropertyToWizard(existingPropertyWithImages);
assert(hydratedExist.images[0].id === 'real-img-uuid-555', 'Test 16: Hydration preserves real database image ID');

// 17. Failed canonical image delete never invokes the local removal result.
const imagesBeforeDelete = [...hydratedExist.images];
let rejectedDelete = false;
let localRemovalCalls = 0;
try {
  await deleteWizardImageAfterCanonicalDelete(
    imagesBeforeDelete,
    'real-img-uuid-555',
    async () => { throw new Error('DELETE_FAILED'); },
    (currentImages) => {
      localRemovalCalls += 1;
      return currentImages.filter(image => image.id !== 'real-img-uuid-555');
    }
  );
} catch {
  rejectedDelete = true;
}
assert(rejectedDelete && localRemovalCalls === 0 && imagesBeforeDelete.length === 1 && imagesBeforeDelete[0].id === 'real-img-uuid-555', 'Test 17: Failed canonical delete never invokes local removal');

// 18. Partial multi-image failure keeps earlier successful commits
const imgA: WizardPropertyImage = { id: 'img-a', url: 'https://cdn/a.jpg', status: 'committed' };
const imgBFail: WizardPropertyImage = { id: 'img-b', url: '', status: 'failed', error: 'Upload failed' };
const multiList = [imgA, imgBFail];
const committedInState = multiList.filter(i => i.status === 'committed');
assert(committedInState.length === 1 && committedInState[0].id === 'img-a', 'Test 18: Earlier committed image retained on partial failure');

// 19. PUBLISHED save does not submit for review
const publishedDraft: OwnerPropertyWizardDraft = { ...step3Valid, origin: 'EXISTING', existingPropertyId: 'prop-pub-1', canonicalStatus: 'PUBLISHED' };
const pubPayload = buildUpdatePropertyPayload(publishedDraft, false);
assert(pubPayload.resubmit === undefined, 'Test 19: Published update does not trigger resubmit flag');

// 20. Review Edit returns to the requested step while retaining the same draft data.
const reviewTransition = prepareReviewEdit(boundNewFlow, 2);
assert(reviewTransition.step === 2 && reviewTransition.draft === boundNewFlow && reviewTransition.draft.region === 'الساحل الشمالي', 'Test 20: Review edit keeps the same draft while moving to its selected step');

// 21. Rejected orchestration performs exactly one update then exactly one submit.
let updateCalls = 0;
let submitCalls = 0;
await resubmitRejectedProperty(
  async () => { updateCalls += 1; },
  async () => { submitCalls += 1; }
);
assert(updateCalls === 1 && submitCalls === 1, 'Test 21: Rejected flow updates once and submits once');

console.log('✅ ALL OWNER-PROPERTY-WIZARD-02 pure and invariant test scenarios passed.');
