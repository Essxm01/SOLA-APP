import assert from 'node:assert/strict';
import { AuthService, dbUserSessionsStore } from '../services/authService.js';
import { ownerDb, sessionDb, userDb } from '../services/dbRepository.js';
import { signRefreshToken, verifyAccessToken } from '../services/jwtService.js';

const customerId = '00000000-0000-4000-8000-201000000101';
const ownerId = '00000000-0000-4000-8000-201000000102';
const sessions = new Map<string, any>();

async function rejects(action: () => Promise<unknown>, code: string) {
  await assert.rejects(action, new RegExp(code));
}

async function run() {
  const originals = {
    getByPhone: userDb.getByPhone, getById: userDb.getById,
    getOwner: ownerDb.getById, getOwnerPhone: ownerDb.getByPhone,
    create: sessionDb.create, get: sessionDb.getByRefreshTokenHash, revoke: sessionDb.revokeByRefreshTokenHash,
  };
  const users: Record<string, any> = {
    '+201000000101': { id: customerId, phoneNumber: '+201000000101', fullName: 'Customer', status: 'ACTIVE', createdAt: '', updatedAt: '' },
    '+201000000102': { id: ownerId, phoneNumber: '+201000000102', fullName: 'Owner', status: 'ACTIVE', createdAt: '', updatedAt: '' },
  };
  (userDb as any).getByPhone = async (phone: string) => users[phone] || null;
  (userDb as any).getById = async (id: string) => Object.values(users).find((user: any) => user.id === id) || null;
  (ownerDb as any).getById = async (id: string) => id === ownerId ? { id: ownerId, phoneNumber: '+201000000102', fullName: 'Owner', verificationStatus: 'VERIFIED' } : null;
  (ownerDb as any).getByPhone = async (phone: string) => phone === '+201000000102' ? { id: ownerId, phoneNumber: phone, fullName: 'Owner', verificationStatus: 'VERIFIED' } : null;
  (sessionDb as any).create = async (session: any) => { sessions.set(session.refreshTokenHash, { ...session, isRevoked: false }); return session; };
  (sessionDb as any).getByRefreshTokenHash = async (hash: string) => sessions.get(hash) || null;
  (sessionDb as any).revokeByRefreshTokenHash = async (hash: string) => {
    const session = sessions.get(hash); if (!session) return false; session.isRevoked = true; return true;
  };

  try {
    const auth = new AuthService();
    const customer = await auth.prototypeLogin('+201000000101', 'CUSTOMER');
    assert.ok(customer.tokens?.refreshToken, 'Customer issuance must return a persisted refresh token');
    assert.equal(sessions.size, 1, 'Customer issuance must persist exactly one session');
    dbUserSessionsStore.clear();
    const refreshed = await auth.refreshSession(customer.tokens!.refreshToken);
    assert.equal(verifyAccessToken(refreshed.accessToken).sub, customerId, 'Refresh must use canonical persisted subject');

    sessions.clear();
    await rejects(() => auth.refreshSession(customer.tokens!.refreshToken), 'SESSION_NOT_FOUND');

    const owner = await auth.prototypeLogin('+201000000102', 'OWNER');
    assert.ok(owner.tokens?.refreshToken);
    const ownerSession = [...sessions.values()][0];
    assert.equal(ownerSession.userId, ownerId);
    assert.equal(ownerSession.ownerId, ownerId);
    assert.equal(ownerSession.role, 'ROLE_OWNER');
    await auth.revokeSession(owner.tokens!.refreshToken);
    await rejects(() => auth.refreshSession(owner.tokens!.refreshToken), 'SESSION_REVOKED');

    const pureCustomer = await auth.prototypeLogin('+201000000101', 'OWNER');
    assert.equal(pureCustomer.ownerOnboardingRequired, true);
    assert.equal(verifyAccessToken(pureCustomer.tokens!.accessToken).role, 'ROLE_CUSTOMER');
    assert.equal([...sessions.values()].some((session) => session.userId === customerId && session.surface === 'OWNER' && session.ownerId === null), true);

    const mismatchToken = signRefreshToken({ sub: ownerId, role: 'ROLE_OWNER' });
    const mismatchHash = (auth as any).hashToken(mismatchToken);
    sessions.set(mismatchHash, { id: 'mismatch', userId: customerId, ownerId: null, surface: 'CUSTOMER', role: 'ROLE_CUSTOMER', refreshTokenHash: mismatchHash, isRevoked: false, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await rejects(() => auth.refreshSession(mismatchToken), 'SESSION_SUBJECT_MISMATCH');

    const roleToken = signRefreshToken({ sub: customerId, role: 'ROLE_CUSTOMER' });
    const roleHash = (auth as any).hashToken(roleToken);
    sessions.set(roleHash, { id: 'role', userId: customerId, ownerId: ownerId, surface: 'OWNER', role: 'ROLE_OWNER', refreshTokenHash: roleHash, isRevoked: false, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await rejects(() => auth.refreshSession(roleToken), 'SESSION_ROLE_MISMATCH');

    const tokenText = customer.tokens!.refreshToken;
    assert.equal([...sessions.keys()].some((hash) => hash.includes(tokenText.slice(0, 8))), false, 'New stored hash must not contain a raw-token prefix');
    console.log('P1.2 identity/session persistence behavioral tests passed');
  } finally {
    (userDb as any).getByPhone = originals.getByPhone; (userDb as any).getById = originals.getById;
    (ownerDb as any).getById = originals.getOwner; (ownerDb as any).getByPhone = originals.getOwnerPhone;
    (sessionDb as any).create = originals.create; (sessionDb as any).getByRefreshTokenHash = originals.get; (sessionDb as any).revokeByRefreshTokenHash = originals.revoke;
    dbUserSessionsStore.clear(); sessions.clear();
  }
}

run().catch((error) => { console.error(error); process.exit(1); });
