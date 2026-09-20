/**
 * Founder-QA-only remote acceptance. It requires an explicitly supplied QA
 * Worker URL and QA service-role key; it refuses production-looking targets.
 * No production endpoint or credential is accepted by this script.
 */
const workerUrl = String(process.env.AUTH_V2_QA_WORKER_URL || '').replace(/\/$/, '');
const supabaseUrl = String(process.env.AUTH_V2_QA_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.AUTH_V2_QA_SUPABASE_SERVICE_ROLE_KEY || '');
const otp = String(process.env.AUTH_V2_QA_DEVELOPMENT_OTP || '');
if (!workerUrl || !workerUrl.includes('auth-v2-qa') || !supabaseUrl.includes('vlowzglqruozxstiqzgn.supabase.co')) throw new Error('FOUNDER_QA_TARGET_REQUIRED');
if (!serviceKey || !/^\d{6}$/.test(otp)) throw new Error('FOUNDER_MANUAL_SECRET_SETUP_REQUIRED');

const request = async (path: string, init?: RequestInit): Promise<{ status: number; body: any }> => {
  const res = await fetch(`${workerUrl}${path}`, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
};
const rest = async (path: string): Promise<any[]> => {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (!res.ok) throw new Error(`QA_DB_READ_FAILED:${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error('QA_DB_READ_MALFORMED');
  return body;
};

const run = async (): Promise<void> => {
  const health = await request('/api/v1/health');
  if (health.status !== 200 || health.body?.data?.status !== 'healthy') throw new Error('QA_HEALTH_FAILED');
  const blocked = await request('/api/v1/properties');
  if (blocked.status !== 404 || blocked.body?.error?.code !== 'QA_ROUTE_NOT_ALLOWED') throw new Error('QA_ROUTE_GUARD_FAILED');
  const malformed = await request('/api/v2/auth/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (malformed.status !== 400) throw new Error('QA_MALFORMED_REQUEST_EXPECTED_400');

  const phone = `+2010${Date.now().toString().slice(-8)}`;
  const issue = await request('/api/v2/auth/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ surface: 'CUSTOMER', intent: 'CREATE_ACCOUNT', method: 'PHONE', identifier: phone }) });
  if (issue.status !== 200 || typeof issue.body?.data?.challengeId !== 'string') throw new Error('QA_ISSUE_FAILED');
  const verify = await request(`/api/v2/auth/challenges/${issue.body.data.challengeId}/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ otp }) });
  if (verify.status !== 200 || !verify.body?.data?.continuationToken) throw new Error('QA_VERIFY_FAILED');
  const complete = await request('/api/v2/auth/registration/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ continuationToken: verify.body.data.continuationToken, fullName: 'Founder QA Synthetic User' }) });
  if (complete.status !== 201 || !complete.body?.data?.tokens?.accessToken) throw new Error('QA_REGISTRATION_FAILED');

  const users = await rest(`users?phone_number=eq.${encodeURIComponent(phone)}&select=id,phone_number`);
  if (users.length !== 1) throw new Error('QA_USER_CARDINALITY_FAILED');
  const identifiers = await rest(`user_identifiers?user_id=eq.${encodeURIComponent(users[0].id)}&identifier_type=eq.PHONE&select=user_id,normalized_value`);
  if (identifiers.length !== 1 || identifiers[0].normalized_value !== phone) throw new Error('QA_IDENTIFIER_PERSISTENCE_FAILED');
  const sessions = await rest(`user_sessions?user_id=eq.${encodeURIComponent(users[0].id)}&surface=eq.CUSTOMER&select=user_id,surface,role`);
  if (sessions.length < 1) throw new Error('QA_SESSION_PERSISTENCE_FAILED');
  console.log(JSON.stringify({ health: 'PASS', routeGuard: 'PASS', malformed: 'PASS', registration: 'PASS', persistence: 'PASS' }));
};

run().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
