import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { ownerDb, propertyDb } from '../services/dbRepository';

const assert = (value: boolean, message: string) => { if (!value) throw new Error(message); };
const ownerId = 'b1111111-1111-4111-8111-111111111111';
const token = signAccessToken({ sub: ownerId, role: 'ROLE_OWNER', phone: '+201011111111' });
const originalOwner = ownerDb.getById;
const originalCreate = propertyDb.create;
let creates = 0;

try {
  (ownerDb as any).getById = async () => ({ id: ownerId });
  (propertyDb as any).create = async (payload: any) => { creates += 1; return payload; };
  const app = new ExpressServerApp();
  const headers = { authorization: `Bearer ${token}` };
  const empty = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, {});
  assert(empty.statusCode === 400 && empty.body.error?.code === 'PROPERTY_CREATE_REQUIRED_FIELDS_MISSING', 'empty wizard payload must fail closed');
  assert(creates === 0, 'invalid payload must not create a property');
  const valid = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers, {
    title: 'وحدة حقيقية', unitType: 'CHALET', propertyType: 'CHALET', bedrooms: 0, bathrooms: 1, maxGuests: 2, pricePerNight: 2000,
  });
  assert(valid.statusCode === 201 && creates === 1, 'complete canonical owner input creates one draft');
  console.log('OWNER-PROPERTY-WIZARD-01 backend validation passed.');
} finally {
  (ownerDb as any).getById = originalOwner;
  (propertyDb as any).create = originalCreate;
}
