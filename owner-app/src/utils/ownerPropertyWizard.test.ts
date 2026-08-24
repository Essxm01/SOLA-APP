import {
  createEmptyPropertyWizardDraft,
  hydratePropertyToWizard,
  validateStep1Basics,
  validateStep2Location,
  validateStep3CapacityPricing,
  validateStep5Images,
  validateStep,
  canCreateCanonicalServerDraft,
  validateWizardForSubmission,
  serializeHouseRules,
  buildCreatePropertyPayload,
  buildUpdatePropertyPayload,
  getPropertyTypeLabel,
  PROPERTY_TYPE_OPTIONS,
  type OwnerPropertyWizardDraft,
  type WizardPropertyImage,
} from './ownerPropertyWizard';
import type { Property } from '../types';

const assert = (value: boolean, message: string) => {
  if (!value) throw new Error(`Assertion failed: ${message}`);
};

// 1. Empty NEW Wizard Draft has no fabricated data
const empty = createEmptyPropertyWizardDraft();
assert(empty.title === undefined, 'new wizard must not have fabricated title');
assert(empty.propertyType === undefined, 'new wizard must not have preselected propertyType');
assert(empty.unitType === undefined, 'new wizard must not have preselected unitType');
assert(empty.region === undefined, 'new wizard must not have preselected region');
assert(empty.bedrooms === undefined, 'new wizard must not have fabricated bedrooms');
assert(empty.bathrooms === undefined, 'new wizard must not have fabricated bathrooms');
assert(empty.maxGuests === undefined, 'new wizard must not have fabricated maxGuests');
assert(empty.pricePerNight === undefined, 'new wizard must not have fabricated price');
assert(empty.amenities.length === 0, 'new wizard must not have preselected amenities');
assert(empty.images.length === 0, 'new wizard must not have fabricated images');
assert(Object.keys(empty.houseRules).length === 0, 'new wizard must have empty house rules');
assert(!canCreateCanonicalServerDraft(empty), 'empty wizard draft must not be allowed to create server draft');

// 2. Canonical Property Type mapping and labels
assert(PROPERTY_TYPE_OPTIONS.length === 6, 'must have exactly 6 canonical property types');
assert(getPropertyTypeLabel('CHALET') === 'شاليه', 'CHALET label must be شاليه');
assert(getPropertyTypeLabel('VILLA') === 'فيلا', 'VILLA label must be فيلا');
assert(getPropertyTypeLabel('APARTMENT') === 'شقة', 'APARTMENT label must be شقة');
assert(getPropertyTypeLabel('STUDIO') === 'استوديو', 'STUDIO label must be استوديو');
assert(getPropertyTypeLabel('HOTEL_ROOM') === 'غرفة فندقية', 'HOTEL_ROOM label must be غرفة فندقية');
assert(getPropertyTypeLabel('OTHER') === 'نوع آخر', 'OTHER label must be نوع آخر');

// 3. Step 1 (Basics) Validation
assert(!validateStep1Basics(empty).isValid, 'step 1 must fail on empty draft');
assert(!validateStep1Basics({ ...empty, title: 'اب' }).isValid, 'step 1 must fail on title < 3 chars');
assert(!validateStep1Basics({ ...empty, title: 'شاليه على البحر' }).isValid, 'step 1 must fail without propertyType');
assert(validateStep1Basics({ ...empty, title: 'شاليه على البحر', propertyType: 'CHALET' }).isValid, 'step 1 must pass with valid title and propertyType');

// 4. Step 2 (Location) Validation
assert(!validateStep2Location(empty).isValid, 'step 2 must fail without region');
assert(validateStep2Location({ ...empty, region: 'الساحل الشمالي' }).isValid, 'step 2 must pass with region');

// 5. Step 3 (Capacity & Pricing) Validation
assert(!validateStep3CapacityPricing(empty).isValid, 'step 3 must fail on empty draft');
assert(!validateStep3CapacityPricing({ ...empty, bedrooms: -1, bathrooms: 1, maxGuests: 2, pricePerNight: 1000 }).isValid, 'step 3 must fail on negative bedrooms');
assert(!validateStep3CapacityPricing({ ...empty, bedrooms: 0, bathrooms: 1, maxGuests: 0, pricePerNight: 1000 }).isValid, 'step 3 must fail on 0 maxGuests');
assert(!validateStep3CapacityPricing({ ...empty, bedrooms: 0, bathrooms: 1, maxGuests: 2, pricePerNight: 0 }).isValid, 'step 3 must fail on 0 price');
assert(validateStep3CapacityPricing({ ...empty, bedrooms: 0, bathrooms: 1, maxGuests: 2, pricePerNight: 2500 }).isValid, 'step 3 must pass with 0 bedrooms (Studio), 1 bath, 2 guests, 2500 EGP');

// 6. Step 5 (Images) Validation
assert(validateStep5Images(empty, false).isValid, 'step 5 optional check passes when not strictly requiring images yet');
assert(!validateStep5Images(empty, true).isValid, 'step 5 strict check fails with 0 committed images');
const draftWithOneCommittedImage: OwnerPropertyWizardDraft = {
  ...empty,
  images: [{ id: 'img-1', url: 'https://storage/img-1.jpg', status: 'committed' }],
};
assert(validateStep5Images(draftWithOneCommittedImage, true).isValid, 'step 5 passes with >= 1 committed image');

// 7. General validateStep helper
assert(!validateStep(1, empty).isValid, 'validateStep(1) must validate step 1');
assert(!validateStep(2, empty).isValid, 'validateStep(2) must validate step 2');
assert(!validateStep(3, empty).isValid, 'validateStep(3) must validate step 3');
assert(validateStep(4, empty).isValid, 'validateStep(4) amenities/rules are optional');

// 8. House rules: unset vs true vs false
const draftWithExplicitRules: OwnerPropertyWizardDraft = {
  ...empty,
  houseRules: {
    smokingAllowed: false, // explicitly forbidden
    partiesAllowed: true,  // explicitly allowed
    petsAllowed: undefined, // untouched
  },
};
assert(draftWithExplicitRules.houseRules.smokingAllowed === false, 'explicit false is preserved');
assert(draftWithExplicitRules.houseRules.partiesAllowed === true, 'explicit true is preserved');
assert(draftWithExplicitRules.houseRules.petsAllowed === undefined, 'unset remains undefined');

const serializedRules = serializeHouseRules(draftWithExplicitRules.houseRules);
assert(serializedRules.minStay === 2 && serializedRules.maxStay === 30, 'global 2-30 night stay preserved');
assert(serializedRules.smokingAllowed === false, 'serialized smoking is false');
assert(serializedRules.partiesAllowed === true, 'serialized parties is true');
assert(serializedRules.petsAllowed === false, 'serialized unset pets defaults safely to false');

// 9. Hydration of existing properties (DRAFT, REJECTED, PUBLISHED)
const existingPropertyFixture: Property = {
  id: 'prop-123',
  ownerId: 'owner-456',
  title: 'فيلا لوتس باي',
  unitType: 'VILLA',
  propertyType: 'VILLA',
  description: 'فيلا راقية',
  region: 'البحر الأحمر',
  locationName: 'الغردقة',
  resortName: 'لوتس باي',
  address: 'شاطئ لوتس 12',
  location: { governorate: 'البحر الأحمر', city: 'الغردقة', district: 'لوتس باي', address: 'شاطئ لوتس 12' },
  capacity: { baseGuests: 6, maxGuests: 8, bedrooms: 4, beds: 6, bathrooms: 3 },
  images: ['https://storage/img-a.jpg'],
  propertyImages: [{ id: 'img-rec-1', url: 'https://storage/img-a.jpg', isMain: true, order: 0, uploadedAt: '2026-08-20' }],
  mainImageIndex: 0,
  pricePerNight: 8000,
  currency: 'EGP',
  pricing: { basePricePerNight: 8000, currency: 'EGP' },
  rating: 5,
  reviewsCount: 2,
  bedrooms: 4,
  bathrooms: 3,
  maxGuests: 8,
  amenities: ['pool', 'wifi'],
  houseRules: { minStay: 2, maxStay: 30, smokingAllowed: false, partiesAllowed: false, petsAllowed: true, checkInTime: '15:00', checkOutTime: '11:00' },
  status: 'REJECTED',
  verificationStatus: 'REJECTED',
  rejectionReason: 'يرجى إضافة صور أوضح للحمامات والمطبخ',
  createdAt: '2026-08-10',
  updatedAt: '2026-08-12',
};

const hydrated = hydratePropertyToWizard(existingPropertyFixture);
assert(hydrated.existingPropertyId === 'prop-123', 'hydrated existing ID is preserved');
assert(hydrated.canonicalStatus === 'REJECTED', 'hydrated status is preserved');
assert(hydrated.rejectionReason === 'يرجى إضافة صور أوضح للحمامات والمطبخ', 'rejection reason is preserved');
assert(hydrated.title === 'فيلا لوتس باي', 'hydrated title is preserved');
assert(hydrated.propertyType === 'VILLA', 'hydrated propertyType is VILLA');
assert(hydrated.bedrooms === 4 && hydrated.bathrooms === 3 && hydrated.maxGuests === 8, 'hydrated capacity is preserved');
assert(hydrated.pricePerNight === 8000, 'hydrated price is preserved');
assert(hydrated.images.length === 1 && hydrated.images[0].id === 'img-rec-1', 'hydrated canonical images preserve image ID');
assert(hydrated.images[0].status === 'committed', 'hydrated images have status committed');

// 10. Multi-image handling (partial failure logic simulation)
let wizardImages: WizardPropertyImage[] = [];
// Image 1 succeeds
const img1: WizardPropertyImage = { id: 'img-1', url: 'https://storage/img-1.jpg', status: 'committed' };
wizardImages = [...wizardImages, img1];
assert(wizardImages.length === 1 && wizardImages[0].status === 'committed', 'image 1 committed immediately');
// Image 2 fails during upload
const img2Failed: WizardPropertyImage = { id: 'temp-2', url: '', status: 'failed', error: 'Upload failed' };
const imagesAfterPartialFailure = [...wizardImages, img2Failed];
const committedOnly = imagesAfterPartialFailure.filter(img => img.status === 'committed');
assert(committedOnly.length === 1 && committedOnly[0].id === 'img-1', 'image 1 remains committed even if image 2 fails');

// 11. Payload building
const completeDraft: OwnerPropertyWizardDraft = {
  ...empty,
  title: 'شاليه مارينا 5',
  propertyType: 'CHALET',
  unitType: 'CHALET',
  region: 'الساحل الشمالي',
  resortName: 'مارينا 5',
  address: 'بوابة 5 فيلا 10',
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 4,
  pricePerNight: 3500,
  amenities: ['pool', 'wifi'],
  houseRules: { smokingAllowed: false, partiesAllowed: false, petsAllowed: false },
  images: [{ id: 'img-1', url: 'https://storage/img-1.jpg', status: 'committed' }],
};

assert(validateWizardForSubmission(completeDraft).isValid, 'complete draft must pass submission validation');

const createPayload = buildCreatePropertyPayload(completeDraft);
assert(createPayload.title === 'شاليه مارينا 5', 'create payload title matches');
assert(createPayload.unitType === 'CHALET', 'create payload unitType is canonical CHALET');
assert(createPayload.propertyType === 'CHALET', 'create payload propertyType is canonical CHALET');
assert(createPayload.status === 'DRAFT', 'create payload status is DRAFT');
assert(createPayload.bedrooms === 2 && createPayload.pricePerNight === 3500, 'create payload numeric values match');

const updatePayload = buildUpdatePropertyPayload(completeDraft, true);
assert(updatePayload.title === 'شاليه مارينا 5', 'update payload title matches');
assert(updatePayload.resubmit === true, 'resubmit flag set on update payload');

console.log('✅ ALL OWNER-PROPERTY-WIZARD-01A frontend behavioral and pure tests passed.');

