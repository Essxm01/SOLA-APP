/**
 * Test Database Isolation Guard
 * Location: backend/server/src/utils/testDbGuard.ts
 *
 * Prevents automated test fixtures, state mutators, and integration tests from
 * executing INSERT/UPDATE/DELETE operations against the live production Supabase database.
 */
export function isProductionDatabase() {
    const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
    const supabaseUrl = (process.env.SUPABASE_URL || '').toLowerCase();
    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
    const isSupabaseHost = dbUrl.includes('supabase.com') ||
        dbUrl.includes('pooler.supabase.com') ||
        supabaseUrl.includes('supabase.co') ||
        dbUrl.includes('aws-1-eu-west-1');
    const isProductionNodeEnv = nodeEnv === 'production';
    const isRemoteNonTest = !dbUrl.includes('127.0.0.1') &&
        !dbUrl.includes('localhost') &&
        !dbUrl.includes('sola_test_db');
    return isSupabaseHost || isProductionNodeEnv || isRemoteNonTest;
}
export function assertSafeTestDatabase(suiteName) {
    if (isProductionDatabase()) {
        throw new Error(`REFUSING_TEST_MUTATION_AGAINST_PRODUCTION_DB: Suite "${suiteName}" attempted to execute database mutations against production Supabase environment.`);
    }
}
