/**
 * Sola Vacation Rentals — CORS Policy Security & Preflight Test Suite
 * Location: server/src/tests/corsPolicy.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import http from 'node:http';
import { ExpressServerApp } from '../app';
import type { TestResult } from './authSecurity.test';

export async function runCorsPolicySuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];
  const app = new ExpressServerApp();
  const server = app.createHttpServer();

  // Bind server to an ephemeral local port for real HTTP socket testing
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const makeHttpRequest = (method: string, path: string, headers: Record<string, string>): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}${path}`, { method, headers }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 500, headers: res.headers, body }));
      });
      req.on('error', reject);
      req.end();
    });
  };

  try {
    // Test 1: Whitelisted Owner App Origin (http://localhost:5173) Preflight OPTIONS
    const resOwnerPreflight = await makeHttpRequest('OPTIONS', '/api/v1/owner/profile', {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization,content-type',
    });

    const ownerPreflightPass =
      resOwnerPreflight.statusCode === 204 &&
      resOwnerPreflight.headers['access-control-allow-origin'] === 'http://localhost:5173' &&
      resOwnerPreflight.headers['vary'] === 'Origin';

    results.push({
      name: 'CORS 1: Whitelisted Owner App Origin preflight (http://localhost:5173)',
      passed: ownerPreflightPass,
      error: ownerPreflightPass ? undefined : `Expected 204 with Origin header, got status ${resOwnerPreflight.statusCode}`,
    });

    // Test 2: Whitelisted Admin App Origin (http://localhost:5174) Preflight OPTIONS
    const resAdminPreflight = await makeHttpRequest('OPTIONS', '/api/v1/admin/payouts/pending', {
      origin: 'http://localhost:5174',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization',
    });

    const adminPreflightPass =
      resAdminPreflight.statusCode === 204 &&
      resAdminPreflight.headers['access-control-allow-origin'] === 'http://localhost:5174' &&
      resAdminPreflight.headers['vary'] === 'Origin';

    results.push({
      name: 'CORS 2: Whitelisted Admin App Origin preflight (http://localhost:5174)',
      passed: adminPreflightPass,
      error: adminPreflightPass ? undefined : `Expected 204 with Origin header, got status ${resAdminPreflight.statusCode}`,
    });

    // Test 3: Forbidden Origin (http://evil.example) Preflight OPTIONS -> 403 Forbidden
    const resEvilPreflight = await makeHttpRequest('OPTIONS', '/api/v1/owner/wallet', {
      origin: 'http://evil.example',
      'access-control-request-method': 'GET',
    });

    const evilPreflightPass =
      resEvilPreflight.statusCode === 403 &&
      resEvilPreflight.headers['access-control-allow-origin'] === undefined;

    results.push({
      name: 'CORS 3: Forbidden Origin preflight blocked with 403 (http://evil.example)',
      passed: evilPreflightPass,
      error: evilPreflightPass ? undefined : `Expected 403 without Allow-Origin header, got status ${resEvilPreflight.statusCode}`,
    });

    // Test 4: Wildcard * CORS Header Elimination Check
    const resWildcardCheck = await makeHttpRequest('POST', '/api/v1/auth/request-otp', {
      origin: 'http://localhost:5173',
      'content-type': 'application/json',
    });

    const noWildcardPass = resWildcardCheck.headers['access-control-allow-origin'] !== '*';

    results.push({
      name: 'CORS 4: Wildcard Access-Control-Allow-Origin: * completely eliminated',
      passed: noWildcardPass,
      error: noWildcardPass ? undefined : 'Wildcard * origin header is still present',
    });

    // Test 5: Custom Headers Whitelist (Authorization, Idempotency-Key)
    const resHeadersCheck = await makeHttpRequest('OPTIONS', '/api/v1/owner/payouts', {
      origin: 'http://localhost:5173',
      'access-control-request-headers': 'idempotency-key,authorization',
    });

    const allowedHeaders = (resHeadersCheck.headers['access-control-allow-headers'] || '').toLowerCase();
    const headersPass = allowedHeaders.includes('authorization') && allowedHeaders.includes('idempotency-key');

    results.push({
      name: 'CORS 5: Required custom headers (Authorization, Idempotency-Key) whitelisted',
      passed: headersPass,
      error: headersPass ? undefined : `Allowed headers missing required tokens: ${allowedHeaders}`,
    });

  } finally {
    server.close();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}
