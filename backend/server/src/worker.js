/**
 * Sola Vacation Rentals — Cloudflare Worker Fetch Adapter
 * Location: server/src/worker.ts
 * Master Source of Truth: SOLA Infrastructure Migration Plan
 *
 * Thin Web Standard Fetch Adapter connecting Cloudflare Workers Edge Runtime
 * directly to the existing platform-agnostic business controllers & PostgreSQL repositories.
 */
import { ExpressServerApp } from './app.js';
import { isOriginAllowed } from './middleware/cors.js';
let appInstance = null;
function getAppInstance() {
    if (!appInstance) {
        appInstance = new ExpressServerApp();
    }
    return appInstance;
}
/**
 * Cloudflare Worker Exported Fetch Handler
 */
export default {
    async fetch(request, env, ctx) {
        // 1. Populate process.env from Cloudflare Worker Environment bindings
        for (const [key, value] of Object.entries(env)) {
            if (typeof value === 'string' && value.length > 0) {
                process.env[key] = value;
            }
        }
        const url = new URL(request.url);
        const method = request.method.toUpperCase();
        // 2. Handle Dynamic CORS Origin Validation & Preflight OPTIONS requests
        const rawOrigin = request.headers.get('origin') || '';
        const origin = rawOrigin.trim();
        const isAllowed = isOriginAllowed(origin);
        const corsHeaders = {
            'vary': 'Origin'
        };
        if (isAllowed) {
            corsHeaders['access-control-allow-origin'] = origin;
            corsHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            corsHeaders['access-control-allow-headers'] = 'Content-Type, Authorization, Idempotency-Key, Accept, X-Requested-With, hmac, X-Sola-Signature';
            corsHeaders['access-control-allow-credentials'] = 'true';
        }
        if (method === 'OPTIONS') {
            if (origin && !isAllowed) {
                return new Response(JSON.stringify({
                    success: false,
                    error: {
                        code: 'CORS_FORBIDDEN_ORIGIN',
                        message: 'Origin is not permitted by CORS policy'
                    }
                }), {
                    status: 403,
                    headers: { 'content-type': 'application/json', 'vary': 'Origin' }
                });
            }
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }
        try {
            // 3. Extract Headers & Body Payload
            const headers = {};
            request.headers.forEach((value, key) => {
                headers[key.toLowerCase()] = value;
            });
            let bodyPayload = undefined;
            if (method !== 'GET' && method !== 'HEAD') {
                // Read incoming Request stream ONCE to prevent "Body has already been used" V8 stream errors
                const rawText = await request.text().catch(() => '');
                if (rawText && rawText.trim().length > 0) {
                    const contentType = request.headers.get('content-type') || '';
                    if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
                        try {
                            bodyPayload = JSON.parse(rawText);
                        }
                        catch {
                            bodyPayload = rawText;
                        }
                    }
                    else {
                        bodyPayload = rawText;
                    }
                }
            }
            // 4. Dispatch directly to ExpressServerApp router
            const app = getAppInstance();
            const result = await app.handleHttpRequest(method, url.pathname, headers, bodyPayload, url.searchParams);
            return new Response(JSON.stringify(result.body), {
                status: result.statusCode,
                headers: {
                    ...corsHeaders,
                    'content-type': 'application/json',
                },
            });
        }
        catch (err) {
            return new Response(JSON.stringify({
                success: false,
                error: {
                    code: 'WORKER_INTERNAL_ERROR',
                    message: err.message || 'حدث خطأ غير متوقع في خادم Worker Edge'
                }
            }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'content-type': 'application/json'
                }
            });
        }
    }
};
