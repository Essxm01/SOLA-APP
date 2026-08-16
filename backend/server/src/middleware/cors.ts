/**
 * Sola Vacation Rentals — Strict CORS Whitelist & Preflight Policy Middleware
 * Location: server/src/middleware/cors.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import type http from 'node:http';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173', // Owner App Dev Server
  'http://localhost:5174', // Admin App Dev Server
  'http://localhost:5175', // Customer App Dev Server
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://sola-owner-app.vercel.app',
  'https://sola-admin-app.vercel.app',
  'https://sola-customer-app.vercel.app',
  'https://sola-app.vercel.app',
];

export function getCorsAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!envOrigins) return DEFAULT_ALLOWED_ORIGINS;

  const parsed = envOrigins
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return false;
  const cleanOrigin = origin.trim();
  const allowed = getCorsAllowedOrigins();
  if (allowed.includes(cleanOrigin)) return true;

  // Allow Sola Vercel deployments matching *.vercel.app if sola- prefix is present
  try {
    const url = new URL(cleanOrigin);
    if (url.hostname.endsWith('.vercel.app') && url.hostname.includes('sola')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Apply Strict CORS Headers & Handle Preflight OPTIONS requests
 * @returns true if preflight request was handled (caller should end request), false otherwise
 */
export function applyCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const origin = req.headers.origin;

  // Always set Vary: Origin to prevent cross-origin response cache poisoning
  res.setHeader('Vary', 'Origin');

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Idempotency-Key, X-Sola-Signature, X-Requested-With, Accept'
    );
  }

  // Preflight OPTIONS Request handling
  if (req.method === 'OPTIONS') {
    if (origin && !isOriginAllowed(origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'CORS_FORBIDDEN_ORIGIN',
            message: 'Origin is not permitted by CORS policy',
          },
          timestamp: new Date().toISOString(),
        })
      );
      return true;
    }

    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}
