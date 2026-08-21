/**
 * Sola Vacation Rentals — Strict CORS Whitelist & Dynamic Origin Validation Middleware
 * Location: server/src/middleware/cors.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
const DEFAULT_EXACT_ALLOWED_ORIGINS = [
    // Local Development
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    // Production Cloudflare Pages Domains
    'https://sola-admin-app.pages.dev',
    'https://sola-owner-app.pages.dev',
    'https://sola-customer-app.pages.dev',
    // Legacy Vercel Deployments
    'https://sola-owner-app.vercel.app',
    'https://sola-admin-app.vercel.app',
    'https://sola-customer-app.vercel.app',
    'https://sola-app.vercel.app',
];
/**
 * Validates whether an incoming HTTP Origin is permitted by the SOLA platform CORS policy.
 * Supports exact origin matching, local development ports, and dynamic Cloudflare Pages preview subdomains.
 */
export function isOriginAllowed(origin) {
    if (!origin)
        return false;
    const cleanOrigin = origin.trim();
    if (cleanOrigin === '' || cleanOrigin === 'null')
        return false;
    // 1. Check exact matches & custom environment overrides
    if (DEFAULT_EXACT_ALLOWED_ORIGINS.includes(cleanOrigin)) {
        return true;
    }
    const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
    if (envOrigins) {
        const parsed = envOrigins.split(',').map(o => o.trim()).filter(o => o.length > 0);
        if (parsed.includes(cleanOrigin))
            return true;
    }
    // 2. Parse URL for dynamic subdomain pattern matching
    try {
        const url = new URL(cleanOrigin);
        const protocol = url.protocol; // 'http:' or 'https:'
        const hostname = url.hostname.toLowerCase();
        // Localhost / 127.0.0.1 on any port
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return protocol === 'http:' || protocol === 'https:';
        }
        // Remote domains must use HTTPS
        if (protocol !== 'https:') {
            return false;
        }
        // Cloudflare Pages Preview subdomains (*.sola-admin-app.pages.dev, *.sola-owner-app.pages.dev, *.sola-customer-app.pages.dev)
        if (hostname.endsWith('.sola-admin-app.pages.dev') ||
            hostname.endsWith('.sola-owner-app.pages.dev') ||
            hostname.endsWith('.sola-customer-app.pages.dev')) {
            return true;
        }
        // Vercel Preview subdomains (*.vercel.app containing sola)
        if (hostname.endsWith('.vercel.app') && hostname.includes('sola')) {
            return true;
        }
    }
    catch {
        return false;
    }
    return false;
}
/**
 * Apply Dynamic CORS Headers & Handle Preflight OPTIONS requests for Node HTTP server
 * @returns true if preflight request was handled (caller should end request), false otherwise
 */
export function applyCorsHeaders(req, res) {
    const origin = req.headers.origin;
    // Always set Vary: Origin to prevent cross-origin response cache poisoning
    res.setHeader('Vary', 'Origin');
    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Sola-Signature, X-Requested-With, Accept, hmac');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // Preflight OPTIONS Request handling
    if (req.method === 'OPTIONS') {
        if (origin && !isOriginAllowed(origin)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: {
                    code: 'CORS_FORBIDDEN_ORIGIN',
                    message: 'Origin is not permitted by CORS policy',
                },
                timestamp: new Date().toISOString(),
            }));
            return true;
        }
        res.writeHead(204);
        res.end();
        return true;
    }
    return false;
}
