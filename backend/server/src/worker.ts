/**
 * Sola Vacation Rentals — Cloudflare Worker Fetch Adapter
 * Location: server/src/worker.ts
 * Master Source of Truth: SOLA Infrastructure Migration Plan
 * 
 * Thin Web Standard Fetch Adapter connecting Cloudflare Workers Edge Runtime
 * directly to the existing platform-agnostic business controllers & PostgreSQL repositories.
 */

import { ExpressServerApp } from './app.js';

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

    // 2. Handle CORS Preflight OPTIONS requests
    const origin = request.headers.get('origin') || '*';
    const allowedOrigins = [
      'https://sola-admin-app.vercel.app',
      'https://sola-owner-app.vercel.app',
      'https://sola-customer-app.vercel.app',
      'https://sola-admin-app.pages.dev',
      'https://sola-owner-app.pages.dev',
      'https://sola-customer-app.pages.dev',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000'
    ];

    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, Accept, X-Requested-With, hmac',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
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
      let responseHeaders: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' };
      let responseBody = '';

      const syntheticRes: any = {
        writeHead: (code: number, headersArg?: Record<string, string>) => {
          statusCode = code;
          if (headersArg) {
            Object.assign(responseHeaders, headersArg);
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
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
