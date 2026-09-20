/**
 * Test Database Isolation Guard
 * Location: backend/server/src/utils/testDbGuard.ts
 * 
 * Prevents automated test fixtures, state mutators, and integration tests from
 * executing INSERT/UPDATE/DELETE operations against the live production Supabase database.
 */

export function isProductionDatabase(): boolean {
  const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
  const supabaseUrl = (process.env.SUPABASE_URL || '').toLowerCase();
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();

  const isSupabaseHost = dbUrl.includes('supabase.com') || 
                         dbUrl.includes('pooler.supabase.com') || 
                         supabaseUrl.includes('supabase.co') ||
                         dbUrl.includes('aws-1-eu-west-1');

  const isProductionNodeEnv = nodeEnv === 'production';
  const isRemoteNonTest = Boolean(dbUrl) && 
                          !dbUrl.includes('127.0.0.1') && 
                          !dbUrl.includes('localhost') && 
                          !dbUrl.includes('sola_test_db');

  return isSupabaseHost || isProductionNodeEnv || isRemoteNonTest;
}

export function assertSafeTestDatabase(suiteName: string): void {
  if (isProductionDatabase()) {
    throw new Error(
      `REFUSING_TEST_MUTATION_AGAINST_PRODUCTION_DB: Suite "${suiteName}" attempted to execute database mutations against production Supabase environment.`
    );
  }
}

/**
 * Validates that an explicit connection URL points strictly to a safe, disposable, local test database.
 * Guards against connecting to production Supabase or remote hosts during integration tests.
 */
export function assertSafeTestDatabaseUrl(url: string, suiteName: string = 'IsolatedTest'): void {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new Error(`UNSAFE_TEST_DATABASE_URL: Suite "${suiteName}" received empty or invalid database connection URL.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (err: any) {
    throw new Error(`UNSAFE_TEST_DATABASE_URL: Suite "${suiteName}" received malformed database connection URL: ${err.message}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // Explicit allowed hostnames for safe isolated test database execution
  const allowedTestHosts = new Set([
    'localhost',
    '127.0.0.1',
    'postgres', // Standard Docker / CI GitHub Actions service container hostname
  ]);

  // Forbidden patterns: Supabase production hosts, cloud connection poolers, production project refs
  const isForbidden =
    lowerUrl.includes('supabase.co') ||
    lowerUrl.includes('supabase.com') ||
    lowerUrl.includes('pooler.supabase.com') ||
    lowerUrl.includes('zrbmbjgcsowfqklmxbyn') ||
    lowerUrl.includes('aws-1-eu-west-1');

  if (isForbidden || !allowedTestHosts.has(hostname)) {
    throw new Error(
      `REFUSING_TEST_MUTATION_AGAINST_NON_LOCAL_DB: Suite "${suiteName}" attempted to connect to unsafe target "${hostname}". Tests may only connect to localhost, 127.0.0.1, or CI postgres service.`
    );
  }
}

