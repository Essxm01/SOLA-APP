/**
 * Sola Vacation Rentals — Real HTTP Runtime & Network Socket Test Suite
 * Location: server/src/tests/httpRuntime.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import http from 'node:http';
import { ExpressServerApp } from '../app';
import type { TestResult } from './authSecurity.test';

export async function runHttpRuntimeSuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];
  const app = new ExpressServerApp();
  const server = app.createHttpServer();

  let port = 0;
  let baseUrl = '';

  // Start HTTP Server on an ephemeral free port
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr !== null) {
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
      }
      resolve();
    });
  });

  let accessToken = '';
  let refreshToken = '';

  // Test 1: Native HTTP Server startup on loopback socket
  results.push({
    name: 'HTTP Runtime 1: Native Node.js HTTP Server socket binding on ephemeral port',
    passed: port > 0 && baseUrl.length > 0,
  });

  // Test 2: Full Auth Lifecycle over HTTP
  try {
    const otpRes = await fetch(`${baseUrl}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+201000000088' }),
    });
    const otpJson: any = await otpRes.json();

    const verifyRes = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+201000000088', code: '123456' }),
    });
    const verifyJson: any = await verifyRes.json();

    accessToken = verifyJson?.data?.tokens?.accessToken || '';
    refreshToken = verifyJson?.data?.tokens?.refreshToken || '';

    const authPass = (otpRes.status === 200) && (verifyRes.status === 200) && !!accessToken && !!refreshToken;
    results.push({ name: 'HTTP Runtime 2: OTP request & verification with JWT token issuance over HTTP socket', passed: authPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 2: OTP request & verification with JWT token issuance over HTTP socket', passed: false, error: err.message });
  }

  // Test 3: Protected Owner Route with Bearer Token over HTTP
  try {
    const ownerRes = await fetch(`${baseUrl}/owner/properties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const ownerJson: any = await ownerRes.json();
    const ownerPass = (ownerRes.status === 200) && (ownerJson?.success === true);
    results.push({ name: 'HTTP Runtime 3: Protected Owner route access with valid Bearer token', passed: ownerPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 3: Protected Owner route access with valid Bearer token', passed: false, error: err.message });
  }

  // Test 4: Protected Owner Route without Token over HTTP (401 Unauthorized)
  try {
    const noTokenRes = await fetch(`${baseUrl}/owner/properties`, { method: 'GET' });
    const noTokenJson: any = await noTokenRes.json();
    const noTokenPass = (noTokenRes.status === 401) && (noTokenJson?.error?.code === 'UNAUTHORIZED_MISSING_TOKEN');
    results.push({ name: 'HTTP Runtime 4: Protected route rejection without token (401 Unauthorized)', passed: noTokenPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 4: Protected route rejection without token (401 Unauthorized)', passed: false, error: err.message });
  }

  // Test 5: Protected Admin Route with Owner Token over HTTP (403 Forbidden)
  try {
    const adminRes = await fetch(`${baseUrl}/admin/audit-logs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // Owner token attempting Admin route
      },
    });
    const adminJson: any = await adminRes.json();
    const adminPass = (adminRes.status === 403) && (adminJson?.error?.code === 'FORBIDDEN_INSUFFICIENT_ROLE');
    results.push({ name: 'HTTP Runtime 5: Admin route RBAC isolation blocking Owner token (403 Forbidden)', passed: adminPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 5: Admin route RBAC isolation blocking Owner token (403 Forbidden)', passed: false, error: err.message });
  }

  // Test 6: Payout Request Creation with Idempotency Key over HTTP (201 Created)
  try {
    const payoutRes = await fetch(`${baseUrl}/owner/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Idempotency-Key': 'http-idemp-key-001',
      },
      body: JSON.stringify({ amount: 1500, payoutMethodId: 'pm-1' }),
    });
    const payoutJson: any = await payoutRes.json();
    const payoutPass = (payoutRes.status === 201) && (payoutJson?.data?.grossAmount === 1500) && (payoutJson?.data?.netAmount === 1485);
    results.push({ name: 'HTTP Runtime 6: Payout creation with Idempotency Key over HTTP (RULE-5A-01, 5A-03, 5A-05)', passed: payoutPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 6: Payout creation with Idempotency Key over HTTP (RULE-5A-01, 5A-03, 5A-05)', passed: false, error: err.message });
  }

  // Test 7: Payout Request Creation without Idempotency Key over HTTP (400 Bad Request)
  try {
    const noIdempRes = await fetch(`${baseUrl}/owner/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ amount: 1500, payoutMethodId: 'pm-1' }),
    });
    const noIdempJson: any = await noIdempRes.json();
    const noIdempPass = (noIdempRes.status === 400) && (noIdempJson?.error?.code === 'IDEMPOTENCY_KEY_REQUIRED');
    results.push({ name: 'HTTP Runtime 7: Idempotency Key header requirement enforcement over HTTP', passed: noIdempPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 7: Idempotency Key header requirement enforcement over HTTP', passed: false, error: err.message });
  }

  // Test 8: Document Presigned Upload URL generation over HTTP
  try {
    const docRes = await fetch(`${baseUrl}/owner/documents/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fileName: 'national_id.pdf', mimeType: 'application/pdf' }),
    });
    const docJson: any = await docRes.json();
    const docPass = (docRes.status === 200) && docJson?.data?.uploadUrl?.includes('storage.sola.eg');
    results.push({ name: 'HTTP Runtime 8: Presigned Upload URL generation over HTTP (RULE-4B-01)', passed: docPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 8: Presigned Upload URL generation over HTTP (RULE-4B-01)', passed: false, error: err.message });
  }

  // Test 9: Server-Authoritative Financials Calculation Endpoint over HTTP
  try {
    const finRes = await fetch(`${baseUrl}/owner/bookings/bk-100/financials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const finJson: any = await finRes.json();
    const finPass = (finRes.status === 200) && (finJson?.data?.depositAmount === 500) && (finJson?.data?.solaCommissionAmount === 100) && (finJson?.data?.ownerNetDepositAmount === 400);
    results.push({ name: 'HTTP Runtime 9: Server-authoritative booking financials calculation over HTTP (RULE-3E-01..05)', passed: finPass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 9: Server-authoritative booking financials calculation over HTTP (RULE-3E-01..05)', passed: false, error: err.message });
  }

  // Test 10: Property Archive Restoration to DRAFT ONLY over HTTP
  try {
    const restoreRes = await fetch(`${baseUrl}/owner/properties/prop-10/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const restoreJson: any = await restoreRes.json();
    const restorePass = (restoreRes.status === 200) && (restoreJson?.data?.status === 'DRAFT');
    results.push({ name: 'HTTP Runtime 10: Property archive restoration to DRAFT ONLY over HTTP (RULE-4C-01)', passed: restorePass });
  } catch (err: any) {
    results.push({ name: 'HTTP Runtime 10: Property archive restoration to DRAFT ONLY over HTTP (RULE-4C-01)', passed: false, error: err.message });
  }

  // Shut down HTTP Server
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}
