import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { ownerDb, propertyDb } from '../services/dbRepository';

const assert = (value: boolean, message: string) => {
  if (!value) throw new Error(`Assertion failed: ${message}`);
};

const ownerId = 'b1111111-1111-4111-8111-111111111111';
const token = signAccessToken({ sub: ownerId, role: 'ROLE_OWNER', phone: '+201011111111' });
const originalOwner = ownerDb.getById;
const originalCreate = propertyDb.create;
const originalGetById = propertyDb.getById;

let creates = 0;
let lastCreatePayload: any = null;

try {
  (ownerDb as any).getById = async () => ({ id: ownerId });
  (propertyDb as any).create = async (payload: any) => {
    creates += 1;
    lastCreatePayload = payload;
    return { ...payload, id: payload.id || 'new-prop-id' };
  };
  (propertyDb as any).getById = async (id: string) => {
    if (lastCreatePayload) return { ...lastCreatePayload, id };
    return null;
  };

  const app = new ExpressServerApp();
  const headers = { authorization: `Bearer ${token}` };

  const validBase = {
    title: 'شاليه مميز بالساحل',
    unitType: 'CHALET',
    propertyType: 'CHALET',
    address: 'الكيلو 120',
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    pricePerNight: 3000,
    region: 'الساحل الشمالي',
    resortName: 'مارينا',
  };

  // 1. Empty payload fails closed
  const empty = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, {});
  assert(empty.statusCode === 400 && empty.body.error?.code === 'PROPERTY_CREATE_REQUIRED_FIELDS_MISSING', 'empty wizard payload must fail closed');
  assert(creates === 0, 'empty payload must not create a property');

  // 2. Missing title
  const noTitle = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, title: '' });
  assert(noTitle.statusCode === 400, 'missing title must fail with 400');
  assert(creates === 0, 'missing title must not call propertyDb.create');

  // 3. Missing unitType
  const noUnitType = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, unitType: undefined });
  assert(noUnitType.statusCode === 400, 'missing unitType must fail with 400');
  assert(creates === 0, 'missing unitType must not call propertyDb.create');

  // 4. Missing propertyType
  const noPropType = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, propertyType: undefined });
  assert(noPropType.statusCode === 400, 'missing propertyType must fail with 400');
  assert(creates === 0, 'missing propertyType must not call propertyDb.create');

  // 5. Unsupported property type
  const badPropType = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, propertyType: 'PALACE' });
  assert(badPropType.statusCode === 400, 'unsupported propertyType must fail with 400');
  assert(creates === 0, 'unsupported propertyType must not call propertyDb.create');

  // 6. Missing bedrooms
  const noBeds = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, bedrooms: undefined });
  assert(noBeds.statusCode === 400, 'missing bedrooms must fail with 400');
  assert(creates === 0, 'missing bedrooms must not call propertyDb.create');

  // 7. Negative bedrooms
  const negBeds = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, bedrooms: -1 });
  assert(negBeds.statusCode === 400, 'negative bedrooms must fail with 400');
  assert(creates === 0, 'negative bedrooms must not call propertyDb.create');

  // 8. Missing bathrooms
  const noBaths = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, bathrooms: undefined });
  assert(noBaths.statusCode === 400, 'missing bathrooms must fail with 400');
  assert(creates === 0, 'missing bathrooms must not call propertyDb.create');

  // 9. Missing maxGuests
  const noGuests = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, maxGuests: undefined });
  assert(noGuests.statusCode === 400, 'missing maxGuests must fail with 400');
  assert(creates === 0, 'missing maxGuests must not call propertyDb.create');

  // 10. maxGuests = 0
  const zeroGuests = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, maxGuests: 0 });
  assert(zeroGuests.statusCode === 400, 'zero maxGuests must fail with 400');
  assert(creates === 0, 'zero maxGuests must not call propertyDb.create');

  // 11. Missing pricePerNight
  const noPrice = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, pricePerNight: undefined, basePricePerNight: undefined });
  assert(noPrice.statusCode === 400, 'missing price must fail with 400');
  assert(creates === 0, 'missing price must not call propertyDb.create');

  // 12. pricePerNight = 0
  const zeroPrice = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, { ...validBase, pricePerNight: 0 });
  assert(zeroPrice.statusCode === 400, 'zero price must fail with 400');
  assert(creates === 0, 'zero price must not call propertyDb.create');

  // 13. bedrooms = 0 and bathrooms = 0 are valid (e.g. for Studio / commercial)
  const studioValid = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, {
    ...validBase,
    unitType: 'STUDIO',
    propertyType: 'STUDIO',
    bedrooms: 0,
    bathrooms: 0,
    maxGuests: 2,
    pricePerNight: 1500,
  });
  assert(studioValid.statusCode === 201 && creates === 1, 'studio with 0 bedrooms and 0 bathrooms is valid');
  assert(lastCreatePayload.bedrooms === 0 && lastCreatePayload.bathrooms === 0, 'exact 0 bedrooms and 0 bathrooms reached propertyDb.create');
  assert(lastCreatePayload.title === validBase.title, 'exact title reached propertyDb.create');
  assert(lastCreatePayload.basePricePerNight === 1500, 'exact price reached propertyDb.create');

  // 14. Standard full payload
  const fullValid = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, validBase);
  assert(fullValid.statusCode === 201 && creates === 2, 'valid full payload creates property');
  assert(lastCreatePayload.bedrooms === 2 && lastCreatePayload.bathrooms === 1 && lastCreatePayload.maxGuests === 4, 'exact capacity reached propertyDb.create');

  console.log('✅ ALL OWNER-PROPERTY-WIZARD-01A backend validation tests passed.');
} finally {
  (ownerDb as any).getById = originalOwner;
  (propertyDb as any).create = originalCreate;
  (propertyDb as any).getById = originalGetById;
}

