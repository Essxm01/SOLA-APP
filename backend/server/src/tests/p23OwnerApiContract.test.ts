import assert from 'node:assert/strict';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { ownerDb, propertyDb, bookingDb, walletDb } from '../services/dbRepository.js';

const app = new ExpressServerApp();

const ownerA = '00000000-0000-4000-8000-000000000001';
const ownerB = '00000000-0000-4000-8000-000000000002';
const customerId = 'c0000000-0000-4000-8000-000000000001';

const ownerTokenA = signAccessToken({ sub: ownerA, role: 'ROLE_OWNER' });
const ownerTokenB = signAccessToken({ sub: ownerB, role: 'ROLE_OWNER' });
const customerToken = signAccessToken({ sub: customerId, role: 'ROLE_CUSTOMER' });

const ownerHeaders = (token = ownerTokenA) => ({ authorization: `Bearer ${token}` });
const customerHeaders = { authorization: `Bearer ${customerToken}` };

// ---------------------------------------------------------------------------
// 1. Task 1: Owner Profile fail-closed and auth tests
// ---------------------------------------------------------------------------

// 1A. Role enforcement: Customer token rejected with 403 on /api/v1/owner/profile
{
  const res = await app.handleHttpRequest('GET', '/api/v1/owner/profile', customerHeaders);
  assert.equal(res.statusCode, 403, 'Customer token must be rejected with 403 on owner profile');
}

// 1B. Profile DB error must return 500 OWNER_PROFILE_QUERY_FAILED, NOT 404
{
  const origGetById = ownerDb.getById;
  (ownerDb as any).getById = async () => {
    throw new Error('database unavailable');
  };
  try {
    const failed = await app.handleHttpRequest('GET', '/api/v1/owner/profile', ownerHeaders());
    assert.equal(failed.statusCode, 500, 'DB outage must return 500, not 404');
    assert.equal((failed.body as any).error?.code, 'OWNER_PROFILE_QUERY_FAILED');
  } finally {
    (ownerDb as any).getById = origGetById;
  }
}

// 1C. Genuine missing owner row returns 404
{
  const origGetById = ownerDb.getById;
  (ownerDb as any).getById = async () => null;
  try {
    const missing = await app.handleHttpRequest('GET', '/api/v1/owner/profile', ownerHeaders());
    assert.equal(missing.statusCode, 404);
    assert.equal((missing.body as any).error?.code, 'OWNER_PROFILE_NOT_FOUND');
  } finally {
    (ownerDb as any).getById = origGetById;
  }
}

// 1D. toOwnerProfileDto unit assertions
import { toOwnerProfileDto } from '../contracts/ownerCore.js';

const rawOwnerRow = {
  id: ownerA,
  phoneNumber: '+201000000001',
  fullName: 'مالك عقار',
  email: 'owner@example.com',
  avatarUrl: 'https://storage.sola.eg/avatar.jpg',
  status: 'ACTIVE',
  verificationStatus: 'VERIFIED',
  ownerOnboardingCompletedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  // Poisoned internal fields
  passwordHash: 'secret-hash',
  nationalId: '12345678901234',
  kycDocFrontKey: 'private-doc-front.pdf',
  internalFlags: { isVip: true },
};

const profileDto = toOwnerProfileDto(rawOwnerRow);
assert.deepEqual(Object.keys(profileDto).sort(), [
  'avatarUrl', 'createdAt', 'email', 'fullName', 'id', 'ownerOnboardingCompletedAt',
  'phoneNumber', 'status', 'updatedAt', 'verificationStatus',
].sort());
assert.equal(profileDto.id, ownerA);
assert.equal(profileDto.fullName, 'مالك عقار');
assert.equal('passwordHash' in profileDto, false);
assert.equal('nationalId' in profileDto, false);
assert.equal('kycDocFrontKey' in profileDto, false);
assert.equal('internalFlags' in profileDto, false);

// Fail closed on malformed required fields
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, id: '' }), /MALFORMED_OWNER_PROFILE/);
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, phoneNumber: null }), /MALFORMED_OWNER_PROFILE/);
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, status: '' }), /MALFORMED_OWNER_PROFILE/);
assert.throws(() => toOwnerProfileDto({ ...rawOwnerRow, createdAt: '' }), /MALFORMED_OWNER_PROFILE/);

// Nullable fields preserve null
const nullDto = toOwnerProfileDto({ ...rawOwnerRow, fullName: null, email: null, avatarUrl: null, ownerOnboardingCompletedAt: null });
assert.equal(nullDto.fullName, null);
assert.equal(nullDto.email, null);
assert.equal(nullDto.avatarUrl, null);
assert.equal(nullDto.ownerOnboardingCompletedAt, null);

// 1E. PUT /api/v1/owner/profile tests
{
  const origGetById = ownerDb.getById;
  const origUpdate = ownerDb.updateProfile;
  try {
    // DB error on existing check -> 500
    (ownerDb as any).getById = async () => { throw new Error('db down'); };
    const res500 = await app.handleHttpRequest('PUT', '/api/v1/owner/profile', ownerHeaders(), { fullName: 'جديد' });
    assert.equal(res500.statusCode, 500);

    // Missing owner -> 404
    (ownerDb as any).getById = async () => null;
    const res404 = await app.handleHttpRequest('PUT', '/api/v1/owner/profile', ownerHeaders(), { fullName: 'جديد' });
    assert.equal(res404.statusCode, 404);

    // Successful update returns sanitized DTO
    (ownerDb as any).getById = async () => ({ ...rawOwnerRow });
    (ownerDb as any).updateProfile = async () => ({ ...rawOwnerRow, fullName: 'مالك محدث' });
    const res200 = await app.handleHttpRequest('PUT', '/api/v1/owner/profile', ownerHeaders(), { fullName: 'مالك محدث' });
    assert.equal(res200.statusCode, 200);
    assert.equal((res200.body as any).data.fullName, 'مالك محدث');
    assert.equal('passwordHash' in (res200.body as any).data, false);
  } finally {
    (ownerDb as any).getById = origGetById;
    (ownerDb as any).updateProfile = origUpdate;
  }
}

console.log('P2.3 Task 1 owner profile contract tests passed.');
