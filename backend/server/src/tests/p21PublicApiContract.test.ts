import assert from 'node:assert/strict';
import {
  parsePublicPropertySearchFilters,
  toPublicPropertySearchItem,
  toPublicPropertyDetail,
} from '../contracts/publicProperty.js';

// ---------------------------------------------------------------------------
// 1. Parser contract tests
// ---------------------------------------------------------------------------
const filters = parsePublicPropertySearchFilters(
  new URLSearchParams('destination=%D9%85%D8%B1%D8%A7%D8%B3%D9%8A&unitType=CHALET&guests=4&maxPrice=25000')
);
assert.deepEqual(filters, {
  destination: 'مراسي',
  unitType: 'CHALET',
  guests: 4,
  maxPrice: 25000,
});

// Trim and case normalization
const trimmed = parsePublicPropertySearchFilters(
  new URLSearchParams('destination=%20%D9%85%D8%B1%D8%A7%D8%B3%D9%8A%20&unitType=chalet%20')
);
assert.deepEqual(trimmed, {
  destination: 'مراسي',
  unitType: 'CHALET',
});

// Empty / blank values are omitted
const emptyParams = parsePublicPropertySearchFilters(
  new URLSearchParams('destination=%20%20&unitType=')
);
assert.deepEqual(emptyParams, {});

// Undefined / empty searchParams returns empty object
assert.deepEqual(parsePublicPropertySearchFilters(), {});

// Invalid guests (must be positive integer)
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('guests=0')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('guests=-2')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('guests=2.5')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('guests=abc')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);

// Invalid maxPrice (must be positive finite number)
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('maxPrice=0')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('maxPrice=-1')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('maxPrice=abc')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('maxPrice=NaN')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);
assert.throws(
  () => parsePublicPropertySearchFilters(new URLSearchParams('maxPrice=Infinity')),
  /INVALID_PUBLIC_SEARCH_FILTER/
);

// ---------------------------------------------------------------------------
// 2. Explicit DTO allowlist and privacy tests
// ---------------------------------------------------------------------------
const poisoned = {
  id: 'property-1',
  title: 'مراسي شاليه',
  unitType: 'CHALET',
  propertyType: 'CHALET',
  address: 'مراسي',
  region: 'الساحل الشمالي',
  resortName: 'مراسي',
  bedrooms: 2,
  bathrooms: 2,
  bedsCount: 3,
  maxGuests: 6,
  areaSqM: 120,
  description: 'وصف',
  amenities: ['POOL'],
  houseRules: { smoking: false },
  basePricePerNight: 7500,
  ownerId: 'owner-secret',
  ownerPhone: '+201000000000',
  ownerEmail: 'secret@example.com',
  verificationStatus: 'VERIFIED',
  createdAt: '2026-09-03T00:00:00.000Z',
  solaCommissionAmount: 1500,
  solaCommissionRate: 0.2,
  ownerNetDepositAmount: 6000,
  payoutId: 'payout-123',
  walletId: 'wallet-123',
  ledgerId: 'ledger-123',
};

const item = toPublicPropertySearchItem(poisoned, ['https://example.test/cover.jpg']);
assert.deepEqual(Object.keys(item).sort(), [
  'address', 'basePricePerNight', 'bathrooms', 'bedrooms', 'currency', 'id', 'images',
  'maxGuests', 'propertyType', 'region', 'resortName', 'title', 'unitType',
].sort());
assert.equal(item.id, 'property-1');
assert.equal(item.currency, 'EGP');
assert.equal(item.basePricePerNight, 7500);
assert.equal('ownerPhone' in item, false);
assert.equal('ownerEmail' in item, false);
assert.equal('ownerId' in item, false);
assert.equal('verificationStatus' in item, false);
assert.equal('solaCommissionAmount' in item, false);
assert.equal('createdAt' in item, false);

const detail = toPublicPropertyDetail(poisoned, ['https://example.test/cover.jpg']);
assert.deepEqual(Object.keys(detail).sort(), [
  'address', 'amenities', 'areaSqM', 'basePricePerNight', 'bathrooms', 'bedrooms',
  'bedsCount', 'currency', 'description', 'houseRules', 'id', 'images',
  'maxGuests', 'propertyType', 'region', 'resortName', 'title', 'unitType',
].sort());
assert.equal('ownerId' in detail, false);
assert.equal('ownerPhone' in detail, false);
assert.equal('ownerEmail' in detail, false);
assert.equal('verificationStatus' in detail, false);
assert.equal('solaCommissionAmount' in detail, false);
assert.equal('solaCommissionRate' in detail, false);
assert.equal('ownerNetDepositAmount' in detail, false);
assert.equal('payoutId' in detail, false);
assert.equal('walletId' in detail, false);
assert.equal('ledgerId' in detail, false);

// Fail closed on malformed source fields
assert.throws(() => toPublicPropertySearchItem({ ...poisoned, id: '' }, ['img.jpg']), /MALFORMED_PUBLIC_PROPERTY_DATA/);
assert.throws(() => toPublicPropertySearchItem({ ...poisoned, title: null as any }, ['img.jpg']), /MALFORMED_PUBLIC_PROPERTY_DATA/);
assert.throws(() => toPublicPropertySearchItem({ ...poisoned, basePricePerNight: -10 }, ['img.jpg']), /MALFORMED_PUBLIC_PROPERTY_DATA/);
assert.throws(() => toPublicPropertySearchItem({ ...poisoned, basePricePerNight: 'invalid' as any }, ['img.jpg']), /MALFORMED_PUBLIC_PROPERTY_DATA/);
assert.throws(() => toPublicPropertySearchItem(poisoned, 'not-an-array' as any), /MALFORMED_PUBLIC_PROPERTY_DATA/);
assert.throws(() => toPublicPropertySearchItem(poisoned, ['']), /MALFORMED_PUBLIC_PROPERTY_DATA/);

console.log('P2.1 public contract unit tests passed.');
