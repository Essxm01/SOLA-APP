import {
  fetchCanonicalAdminData,
  shouldRenderAdminShell,
  validateAdminSession,
  type AdminFetch,
} from './adminTruthfulState.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const validAdmin = { id: 'admin-1', email: 'admin@sola.com', fullName: 'Admin', role: 'ADMIN' };
const testUrl = (path: string) => path;

async function run() {
  const validSessionFetch: AdminFetch = async () => jsonResponse({ success: true, data: { admin: validAdmin } });
  const valid = await validateAdminSession('real-token', validSessionFetch, testUrl);
  assert(valid.kind === 'valid' && valid.admin.id === validAdmin.id, 'valid persisted session must validate before shell access');
  assert(shouldRenderAdminShell('AUTHENTICATED'), 'validated session must allow shell rendering');

  const expired = await validateAdminSession('expired-token', async () => jsonResponse({ success: false }, 401), testUrl);
  assert(expired.kind === 'invalid', 'expired session must be invalid');
  assert(!shouldRenderAdminShell('RESTORING') && !shouldRenderAdminShell('UNAUTHENTICATED'), 'shell must stay hidden before validation and after invalidation');

  const networkFailure = await validateAdminSession('real-token', async () => { throw new Error('network'); }, testUrl);
  assert(networkFailure.kind === 'error', 'validation transport failure must render a retryable error state');

  let called = false;
  const missing = await validateAdminSession(null, async () => {
    called = true;
    return jsonResponse({ success: true });
  }, testUrl);
  assert(missing.kind === 'invalid' && !called, 'missing token must not fall back to a fake token or protected request');

  const zeroOverview = await fetchCanonicalAdminData<any>('/admin/overview/stats', 'real-token', async () => jsonResponse({
    success: true,
    data: {
      properties: { pendingProperties: 0 },
      verifications: { pendingVerifications: 0 },
      payouts: { pendingPayouts: 0 },
      disputes: { openDisputes: 0 },
    },
  }), testUrl);
  assert(zeroOverview.kind === 'success' && zeroOverview.data.properties.pendingProperties === 0, 'successful canonical zero must remain a real zero');

  const failedOverview = await fetchCanonicalAdminData('/admin/overview/stats', 'real-token', async () => jsonResponse({ success: false, error: { message: 'failed' } }, 500), testUrl);
  assert(failedOverview.kind === 'error', 'overview failure must not become zero data');

  let attempts = 0;
  const retryFetch: AdminFetch = async () => {
    attempts += 1;
    return attempts === 1
      ? jsonResponse({ success: false }, 503)
      : jsonResponse({ success: true, data: { properties: { pendingProperties: 4 } } });
  };
  const firstAttempt = await fetchCanonicalAdminData('/admin/overview/stats', 'real-token', retryFetch, testUrl);
  const secondAttempt = await fetchCanonicalAdminData<any>('/admin/overview/stats', 'real-token', retryFetch, testUrl);
  assert(firstAttempt.kind === 'error' && secondAttempt.kind === 'success' && secondAttempt.data.properties.pendingProperties === 4, 'retry must replace an error with canonical data');

  console.log('ADMIN-TRUTHFUL-STATE-01 focused client state tests passed');
}

run().catch((error) => {
  console.error(error);
  throw error;
});
