function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message} (actual=${String(actual)} expected=${String(expected)})`);
}

import { resolveApiBaseUrl, CANONICAL_LIVE_WORKER_API_BASE } from './api';

// CASE 1: Explicit non-empty VITE_API_BASE_URL override always wins regardless of hostname
{
  assertEqual(
    resolveApiBaseUrl('https://example.test/api/v1', 'localhost'),
    'https://example.test/api/v1',
    'Case 1A: explicit env with localhost'
  );

  assertEqual(
    resolveApiBaseUrl('https://example.test/api/v1', '192.168.1.20'),
    'https://example.test/api/v1',
    'Case 1B: explicit env with LAN IP'
  );

  assertEqual(
    resolveApiBaseUrl('https://example.test/api/v1', 'b551de75.sola-customer-app.pages.dev'),
    'https://example.test/api/v1',
    'Case 1C: explicit env with Pages deployment host'
  );

  assertEqual(
    resolveApiBaseUrl('https://example.test/api/v1/', 'localhost'),
    'https://example.test/api/v1',
    'Case 1D: trailing slash stripped from explicit env'
  );
}

// CASE 2: Recognized Cloudflare Pages deployment host (*.pages.dev) falls back to canonical live Worker
{
  assertEqual(
    resolveApiBaseUrl('', 'b551de75.sola-customer-app.pages.dev'),
    CANONICAL_LIVE_WORKER_API_BASE,
    'Case 2A: commit preview Pages host'
  );

  assertEqual(
    resolveApiBaseUrl(undefined, 'phase5-customer-c2-discovery.sola-customer-app.pages.dev'),
    CANONICAL_LIVE_WORKER_API_BASE,
    'Case 2B: branch preview Pages host'
  );

  assertEqual(
    resolveApiBaseUrl(null, 'sola-customer-app.pages.dev'),
    CANONICAL_LIVE_WORKER_API_BASE,
    'Case 2C: production Pages host'
  );

  assertEqual(
    resolveApiBaseUrl('', 'pages.dev'),
    CANONICAL_LIVE_WORKER_API_BASE,
    'Case 2D: root pages.dev'
  );
}

// CASE 3: Local and LAN development hosts fall back to same-origin /api/v1 (Vite proxy)
{
  // Standard loopback
  assertEqual(
    resolveApiBaseUrl('', 'localhost'),
    '/api/v1',
    'Case 3A: localhost loopback'
  );

  assertEqual(
    resolveApiBaseUrl(undefined, '127.0.0.1'),
    '/api/v1',
    'Case 3B: IPv4 loopback'
  );

  // Physical-device LAN IPs (Codex P2 issue)
  assertEqual(
    resolveApiBaseUrl('', '192.168.1.20'),
    '/api/v1',
    'Case 3C: standard 192.168.x.x LAN IP'
  );

  assertEqual(
    resolveApiBaseUrl(null, '192.168.0.105'),
    '/api/v1',
    'Case 3D: alternative 192.168.x.x LAN IP'
  );

  assertEqual(
    resolveApiBaseUrl('', '10.0.0.42'),
    '/api/v1',
    'Case 3E: 10.x.x.x LAN IP'
  );

  assertEqual(
    resolveApiBaseUrl('', '172.20.10.2'),
    '/api/v1',
    'Case 3F: 172.16-31.x.x hotspot LAN IP'
  );

  // mDNS / local domain
  assertEqual(
    resolveApiBaseUrl('', 'my-macbook.local'),
    '/api/v1',
    'Case 3G: mDNS .local host'
  );

  // Undefined / empty hostname
  assertEqual(
    resolveApiBaseUrl('', undefined),
    '/api/v1',
    'Case 3H: undefined hostname'
  );
}

console.log('API resolution contract tests passed: All 3 cases (Explicit env, Cloudflare Pages, LAN/local proxy) verified.');
