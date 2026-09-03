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

// ---------------------------------------------------------------------------
// 3. Dedicated repository reads and filtering logic tests
// ---------------------------------------------------------------------------
import { propertyDb } from '../services/dbRepository.js';
import { queryDb } from '../services/dbClient.js';

const mockPropertiesSource = [
  {
    id: 'p1',
    title: 'شاليه مراسي فاخر',
    unitType: 'CHALET',
    propertyType: 'CHALET',
    address: 'سيدي عبد الرحمن، مراسي',
    region: 'الساحل الشمالي',
    resortName: 'مراسي',
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePricePerNight: 7500,
  },
  {
    id: 'p2',
    title: 'فيلا هاسيندا باي',
    unitType: 'VILLA',
    propertyType: 'VILLA',
    address: 'الكيلو 124 هاسيندا',
    region: 'الساحل الشمالي',
    resortName: 'هاسيندا باي',
    bedrooms: 5,
    bathrooms: 4,
    maxGuests: 10,
    basePricePerNight: 30000,
  },
  {
    id: 'p3',
    title: 'شقة الجونة مارينا',
    unitType: 'APARTMENT',
    propertyType: 'APARTMENT',
    address: 'الجونة، مارينا',
    region: 'البحر الأحمر',
    resortName: 'الجونة',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    basePricePerNight: 4500,
  },
];

// Test in-memory filtering behavior directly on searchPublic
const originalQueryDb = queryDb;

// Check that searchPublic and getPublicById exist on propertyDb
assert.equal(typeof propertyDb.searchPublic, 'function', 'propertyDb.searchPublic must exist');
assert.equal(typeof propertyDb.getPublicById, 'function', 'propertyDb.getPublicById must exist');

// Set up mock Worker fetch environment for searchPublic testing
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const origFetch = globalThis.fetch;

process.env.SUPABASE_URL = 'https://supabase.adapter.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

globalThis.fetch = (async () => {
  return new Response(JSON.stringify(mockPropertiesSource.map(p => ({
    id: p.id,
    title: p.title,
    unit_type: p.unitType,
    property_type: p.propertyType,
    address: p.address,
    region: p.region,
    resort_name: p.resortName,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    max_guests: p.maxGuests,
    base_price_per_night: p.basePricePerNight,
  }))), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

try {
  // Explore: no filters -> all 3
  const all = await propertyDb.searchPublic();
  assert.equal(all.length, 3);

  // Destination: case-insensitive matching across title, address, region, resortName
  const marassi = await propertyDb.searchPublic({ destination: 'مراسي' });
  assert.deepEqual(marassi.map(p => p.id), ['p1']);

  const sahel = await propertyDb.searchPublic({ destination: 'الساحل' });
  assert.deepEqual(sahel.map(p => p.id), ['p1', 'p2']);

  // UnitType: exact normalized match
  const chalets = await propertyDb.searchPublic({ unitType: 'chalet' });
  assert.deepEqual(chalets.map(p => p.id), ['p1']);

  const villas = await propertyDb.searchPublic({ unitType: 'VILLA' });
  assert.deepEqual(villas.map(p => p.id), ['p2']);

  // Guests: maxGuests >= guests
  const bigGroup = await propertyDb.searchPublic({ guests: 5 });
  assert.deepEqual(bigGroup.map(p => p.id), ['p2']);

  const midGroup = await propertyDb.searchPublic({ guests: 4 });
  assert.deepEqual(midGroup.map(p => p.id), ['p1', 'p2']);

  // MaxPrice: basePricePerNight <= maxPrice
  const budget = await propertyDb.searchPublic({ maxPrice: 5000 });
  assert.deepEqual(budget.map(p => p.id), ['p3']);

  const midBudget = await propertyDb.searchPublic({ maxPrice: 8000 });
  assert.deepEqual(midBudget.map(p => p.id), ['p1', 'p3']);

  // Combined filters (AND)
  const combinedMatch = await propertyDb.searchPublic({
    destination: 'الساحل',
    unitType: 'CHALET',
    guests: 2,
    maxPrice: 10000,
  });
  assert.deepEqual(combinedMatch.map(p => p.id), ['p1']);

  const combinedZero = await propertyDb.searchPublic({
    destination: 'الساحل',
    unitType: 'CHALET',
    guests: 6, // p1 only has 4
  });
  assert.deepEqual(combinedZero, []);
} finally {
  globalThis.fetch = origFetch;
  if (envUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = envUrl;
  if (envKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = envKey;
}

// ---------------------------------------------------------------------------
// 4. Worker adapter canonical queries and collision-safety tests
// ---------------------------------------------------------------------------
const canonicalPublicListSql = `SELECT id, title, unit_type AS "unitType", property_type AS "propertyType",
       address, region, resort_name AS "resortName", bedrooms, bathrooms,
       max_guests AS "maxGuests", base_price_per_night AS "basePricePerNight"
FROM properties
WHERE deleted_at IS NULL
  AND status = 'PUBLISHED'
  AND verification_status = 'VERIFIED'
ORDER BY created_at DESC`;

const canonicalPublicDetailSql = `SELECT id, title, unit_type AS "unitType", property_type AS "propertyType",
       address, region, resort_name AS "resortName", bedrooms, bathrooms,
       beds_count AS "bedsCount", max_guests AS "maxGuests", area_sq_m AS "areaSqM",
       description, amenities, house_rules AS "houseRules",
       base_price_per_night AS "basePricePerNight"
FROM properties
WHERE id = $1
  AND deleted_at IS NULL
  AND status = 'PUBLISHED'
  AND verification_status = 'VERIFIED'`;

// Set up mock Worker fetch environment
const originalFetch = globalThis.fetch;
const originalEnvUrl = process.env.SUPABASE_URL;
const originalEnvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

process.env.SUPABASE_URL = 'https://supabase.adapter.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

let customFetchHandler: ((url: string, init?: RequestInit) => Promise<Response>) | null = null;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (customFetchHandler) {
    return customFetchHandler(String(input), init);
  }
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

try {
  // Test 4A: Canonical list query dispatches to REST with publication filters and order
  const listRequests: string[] = [];
  customFetchHandler = async (url) => {
    listRequests.push(url);
    return new Response(JSON.stringify([{
      id: 'p1',
      title: 'شاليه مراسي',
      unit_type: 'CHALET',
      property_type: 'CHALET',
      address: 'مراسي',
      region: 'الساحل',
      resort_name: 'مراسي',
      bedrooms: 2,
      bathrooms: 2,
      max_guests: 4,
      base_price_per_night: 7500,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const listRes = await queryDb(canonicalPublicListSql);
  assert.equal(listRes.rows.length, 1);
  assert.equal(listRes.rows[0].id, 'p1');
  assert.equal(listRequests.length, 1);
  const listUrl = new URL(listRequests[0]);
  assert.ok(listUrl.pathname.endsWith('/rest/v1/properties'));
  assert.equal(listUrl.searchParams.get('deleted_at'), 'is.null');
  assert.equal(listUrl.searchParams.get('status'), 'eq.PUBLISHED');
  assert.equal(listUrl.searchParams.get('verification_status'), 'eq.VERIFIED');
  assert.equal(listUrl.searchParams.get('order'), 'created_at.desc');
  assert.ok(listUrl.searchParams.get('select')?.includes('id,title,unit_type'));

  // Test 4B: Canonical detail query dispatches with requested id and publication filters
  const detailRequests: string[] = [];
  customFetchHandler = async (url) => {
    detailRequests.push(url);
    return new Response(JSON.stringify([{
      id: 'p1',
      title: 'شاليه مراسي',
      unit_type: 'CHALET',
      property_type: 'CHALET',
      address: 'مراسي',
      region: 'الساحل',
      resort_name: 'مراسي',
      bedrooms: 2,
      bathrooms: 2,
      beds_count: 3,
      max_guests: 4,
      area_sq_m: 120,
      description: 'وصف',
      amenities: ['POOL'],
      house_rules: {},
      base_price_per_night: 7500,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const detailRes = await queryDb(canonicalPublicDetailSql, ['p1']);
  assert.equal(detailRes.rows.length, 1);
  assert.equal(detailRes.rows[0].id, 'p1');
  assert.equal(detailRequests.length, 1);
  const detailUrl = new URL(detailRequests[0]);
  assert.ok(detailUrl.pathname.endsWith('/rest/v1/properties'));
  assert.equal(detailUrl.searchParams.get('id'), 'eq.p1');
  assert.equal(detailUrl.searchParams.get('deleted_at'), 'is.null');
  assert.equal(detailUrl.searchParams.get('status'), 'eq.PUBLISHED');
  assert.equal(detailUrl.searchParams.get('verification_status'), 'eq.VERIFIED');

  // Test 4C: Malformed payloads fail closed
  // List not an array
  customFetchHandler = async () => new Response('{"error":"not-array"}', { status: 200, headers: { 'content-type': 'application/json' } });
  await assert.rejects(() => queryDb(canonicalPublicListSql), /REST_PUBLIC_PROPERTIES_MALFORMED_RESPONSE/);

  // Detail not an array
  customFetchHandler = async () => new Response('{"id":"p1"}', { status: 200, headers: { 'content-type': 'application/json' } });
  await assert.rejects(() => queryDb(canonicalPublicDetailSql, ['p1']), /REST_PUBLIC_PROPERTY_DETAIL_MALFORMED_RESPONSE/);

  // Detail >1 rows
  customFetchHandler = async () => new Response(JSON.stringify([{ id: 'p1' }, { id: 'p2' }]), { status: 200, headers: { 'content-type': 'application/json' } });
  await assert.rejects(() => queryDb(canonicalPublicDetailSql, ['p1']), /REST_PUBLIC_PROPERTY_DETAIL_MALFORMED_RESPONSE/);

  // Detail id mismatch
  customFetchHandler = async () => new Response(JSON.stringify([{ id: 'wrong-id' }]), { status: 200, headers: { 'content-type': 'application/json' } });
  await assert.rejects(() => queryDb(canonicalPublicDetailSql, ['p1']), /REST_PUBLIC_PROPERTY_DETAIL_MALFORMED_RESPONSE/);

  // Test 4D: Colliding noncanonical queries must NOT enter public adapter
  const collidingListQueries = [
    ['comment prefix', `-- comment prefix\n${canonicalPublicListSql}`],
    ['comment suffix', `${canonicalPublicListSql} -- comment suffix`],
    ['wrapper subquery', `SELECT * FROM (${canonicalPublicListSql}) sub`],
    ['altered SELECT', `SELECT id, title FROM properties WHERE deleted_at IS NULL AND status = 'PUBLISHED' AND verification_status = 'VERIFIED' ORDER BY created_at DESC`],
    ['missing verification', `SELECT id, title FROM properties WHERE deleted_at IS NULL AND status = 'PUBLISHED' ORDER BY created_at DESC`],
  ];

  for (const [name, sql] of collidingListQueries) {
    const intercepted: string[] = [];
    customFetchHandler = async (url) => {
      intercepted.push(url);
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    };
    try {
      await queryDb(sql);
    } catch {
      // Fallthrough to direct pg pool expected
    }
    const publicIntercepts = intercepted.filter((u) => u.includes('verification_status=eq.VERIFIED') && u.includes('order=created_at.desc'));
    assert.equal(publicIntercepts.length, 0, `colliding list query [${name}] must not enter public list adapter`);
  }

  const collidingDetailQueries = [
    ['comment prefix', `-- comment prefix\n${canonicalPublicDetailSql}`],
    ['comment suffix', `${canonicalPublicDetailSql} -- comment suffix`],
    ['wrapper subquery', `SELECT * FROM (${canonicalPublicDetailSql}) sub`],
    ['altered SELECT', `SELECT id, title FROM properties WHERE id = $1 AND deleted_at IS NULL AND status = 'PUBLISHED' AND verification_status = 'VERIFIED'`],
    ['wrong placeholder', `SELECT id, title, unit_type AS "unitType", property_type AS "propertyType", address, region, resort_name AS "resortName", bedrooms, bathrooms, beds_count AS "bedsCount", max_guests AS "maxGuests", area_sq_m AS "areaSqM", description, amenities, house_rules AS "houseRules", base_price_per_night AS "basePricePerNight" FROM properties WHERE id = $2 AND deleted_at IS NULL AND status = 'PUBLISHED' AND verification_status = 'VERIFIED'`],
  ];

  for (const [name, sql] of collidingDetailQueries) {
    const intercepted: string[] = [];
    customFetchHandler = async (url) => {
      intercepted.push(url);
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    };
    try {
      await queryDb(sql, ['p1', 'p2']);
    } catch {
      // Fallthrough to direct pg pool expected
    }
    const publicIntercepts = intercepted.filter((u) => u.includes('verification_status=eq.VERIFIED') && u.includes('id=eq.p1'));
    assert.equal(publicIntercepts.length, 0, `colliding detail query [${name}] must not enter public detail adapter`);
  }

} finally {
  globalThis.fetch = originalFetch;
  if (originalEnvUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalEnvUrl;
  if (originalEnvKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnvKey;
}
