import assert from 'node:assert/strict';
import { ExpressServerApp } from '../app.js';
import { verifyAccessToken, signAccessToken } from '../services/jwtService.js';
import { bookingDb, ownerDb } from '../services/dbRepository.js';

async function run() {
  const app = new ExpressServerApp();
  const ownerId = '00000000-0000-4000-8000-201013154939';
  const customerId = '00000000-0000-4000-8000-201000000001';
  const ownerToken = signAccessToken({ sub: ownerId, role: 'ROLE_OWNER', phone: '+201013154939' });
  const customerToken = signAccessToken({ sub: customerId, role: 'ROLE_CUSTOMER', phone: '+201000000001' });
  const adminToken = signAccessToken({ sub: '00000000-0000-0000-0000-000000000001', role: 'ROLE_ADMIN', phone: 'admin@sola.com' });

  assert.throws(() => verifyAccessToken('admin_token_valid'), /UNAUTHORIZED_INVALID_TOKEN/, 'legacy patterned strings must never authenticate');
  assert.throws(() => verifyAccessToken('customer_anyone'), /UNAUTHORIZED_INVALID_TOKEN/, 'customer-like strings must never authenticate');

  const publicSearch = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search');
  assert.notEqual(publicSearch.statusCode, 401, 'public Customer discovery must not require authentication');
  assert.notEqual(publicSearch.statusCode, 403, 'public Customer discovery must not require an unrelated role');
  assert.equal((await app.handleHttpRequest('GET', '/api/v1/customer/payments')).statusCode, 401, 'Customer financial history must require a Customer token');
  assert.equal((await app.handleHttpRequest('GET', '/api/v1/owner/profile')).statusCode, 401, 'Owner routes must reject missing credentials');
  assert.equal((await app.handleHttpRequest('GET', '/api/v1/admin/auth/session')).statusCode, 401, 'Admin routes must reject missing credentials');
  assert.equal((await app.handleHttpRequest('GET', '/api/v1/admin/auth/session', { authorization: `Bearer ${ownerToken}` })).statusCode, 403, 'Owner role must not access Admin session validation');
  assert.equal((await app.handleHttpRequest('GET', '/api/v1/owner/profile', { authorization: `Bearer ${customerToken}` })).statusCode, 403, 'Customer role must not access Owner profile');
  assert.equal((await app.handleHttpRequest('GET', '/api/v1/admin/auth/session', { authorization: `Bearer ${adminToken}` })).statusCode, 200, 'a signed canonical Admin token must validate');

  const originalOwner = ownerDb.getById;
  const originalBookings = bookingDb.getByCustomerId;
  (ownerDb as any).getById = async (id: string) => id === ownerId ? { id: ownerId, phoneNumber: '+201013154939', fullName: 'Owner', verificationStatus: 'VERIFIED' } : null;
  (bookingDb as any).getByCustomerId = async (id: string) => {
    assert.equal(id, customerId, 'Customer booking ownership must derive from verified JWT subject');
    return [];
  };
  try {
    assert.equal((await app.handleHttpRequest('GET', '/api/v1/owner/profile', { authorization: `Bearer ${ownerToken}` })).statusCode, 200, 'a signed Owner token must resolve only its canonical Owner profile');
    assert.equal((await app.handleHttpRequest('GET', '/api/v1/customer/bookings', { authorization: `Bearer ${customerToken}` })).statusCode, 200, 'Customer bookings must use the verified JWT subject rather than a client identity');
  } finally {
    (ownerDb as any).getById = originalOwner;
    (bookingDb as any).getByCustomerId = originalBookings;
  }

  console.log('P0.2 prototype auth/access route tests passed');
}

run().catch((error) => { console.error(error); process.exit(1); });
