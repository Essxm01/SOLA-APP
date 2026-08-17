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

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  PAYMOB_API_KEY?: string;
  PAYMOB_HMAC_SECRET?: string;
  [key: string]: string | undefined;
}

let appInstance: ExpressServerApp | null = null;

function getAppInstance(): ExpressServerApp {
  if (!appInstance) {
    appInstance = new ExpressServerApp();
  }
  return appInstance;
}

/**
 * Cloudflare Worker Exported Fetch Handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    const corsHeaders: Record<string, string> = {
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
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      let bodyPayload: any = undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            bodyPayload = await request.json();
          } catch {
            bodyPayload = await request.text();
          }
        } else {
          bodyPayload = await request.text();
        }
      }

      // 4. Adapt Request to Synthetic Node HTTP Request Stream expected by app.ts
      const app = getAppInstance();

      let statusCode = 200;
      let responseHeaders: Record<string, string> = { ...corsHeaders, 'content-type': 'application/json' };
      let responseBody = '';

      const syntheticRes: any = {
        writeHead: (code: number, headersArg?: Record<string, string>) => {
          statusCode = code;
          if (headersArg) {
            for (const [hk, hv] of Object.entries(headersArg)) {
              responseHeaders[hk.toLowerCase()] = hv;
            }
          }
        },
        setHeader: (name: string, value: string) => {
          responseHeaders[name.toLowerCase()] = value;
        },
        end: (data?: any) => {
          if (data) {
            responseBody = typeof data === 'string' ? data : JSON.stringify(data);
          }
        }
      };

      const syntheticReq: any = {
        method,
        url: url.pathname + url.search,
        headers,
        body: bodyPayload,
        on: (event: string, handler: Function) => {
          if (event === 'data' && bodyPayload) {
            handler(typeof bodyPayload === 'string' ? Buffer.from(bodyPayload) : Buffer.from(JSON.stringify(bodyPayload)));
          }
          if (event === 'end') {
            handler();
          }
        },
        [Symbol.asyncIterator]: async function* () {
          if (bodyPayload) {
            yield typeof bodyPayload === 'string' ? Buffer.from(bodyPayload) : Buffer.from(JSON.stringify(bodyPayload));
          }
        }
      };

      // Dispatch to existing ExpressServerApp HTTP server handler
      const server = app.createHttpServer();
      server.emit('request', syntheticReq, syntheticRes);

      let retries = 0;
      while (!responseBody && retries < 100) {
        await new Promise(r => setTimeout(r, 20));
        retries++;
      }

      if (!responseBody) {
        responseBody = JSON.stringify({
          success: false,
          error: { code: 'GATEWAY_TIMEOUT', message: 'انتهت مهلة استجابة خادم الباك اند' }
        });
        statusCode = 504;
      }

      return new Response(responseBody, {
        status: statusCode,
        headers: responseHeaders
      });

    } catch (err: any) {
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
