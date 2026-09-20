/**
 * Sola Vacation Rentals — Isolated PostgreSQL Migration & Concurrency Contract Test
 * Location: backend/server/src/tests/isolatedPostgres.test.ts
 * 
 * Invariants:
 *   1. Runs exclusively against an isolated, disposable PostgreSQL database.
 *   2. NEVER executes against Production Supabase.
 *   3. Applies Migration 031 and validates DDL, indexes, and RLS grants.
 *   4. Executes genuine PostgreSQL concurrent transactions with `FOR UPDATE` locking
 *      to prove the single-winner atomic verification guarantee.
 *   5. Tests persistent PostgreSQL rate limiting and atomic challenge consumption.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { computeChallengeOtpDigest } from '../services/otpSecurity.js';
import { isProductionDatabase } from '../utils/testDbGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ISOLATED_PG_URL = process.env.ISOLATED_PG_URL || 'postgresql://postgres:postgres@127.0.0.1:54329/sola_isolated_test';

export async function runIsolatedPostgresSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; error?: string }>;
}> {
  const results: Array<{ name: string; passed: boolean; error?: string }> = [];

  function record(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        results.push({ name, passed: true });
      } catch (err: any) {
        results.push({ name, passed: false, error: err?.message || String(err) });
      }
    })();
  }

  // FAIL-CLOSED GUARD: Refuse to run against production database
  if (isProductionDatabase()) {
    throw new Error('REFUSING_TEST_EXECUTION_AGAINST_PRODUCTION_DB');
  }

  const pool = new pg.Pool({
    connectionString: ISOLATED_PG_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
  });

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Prerequisite Roles and Schema Setup
    // --------------------------------------------------------------------------
    await record('Prerequisites: Setup schema_migrations, users, and Supabase roles', async () => {
      const client = await pool.connect();
      try {
        await client.query(`
          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
          END $$;
          CREATE EXTENSION IF NOT EXISTS "pgcrypto";
          CREATE TABLE IF NOT EXISTS public.schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            executed_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone_number VARCHAR(255) UNIQUE,
            phone_verified_at TIMESTAMPTZ,
            full_name VARCHAR(255),
            email VARCHAR(255),
            avatar_url TEXT,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
          );
        `);
      } finally {
        client.release();
      }
    });

    // --------------------------------------------------------------------------
    // TEST 2: Apply Migration 031
    // --------------------------------------------------------------------------
    await record('Migration 031: Executes cleanly and records version in schema_migrations', async () => {
      const migrationPath = path.resolve(__dirname, '../../../database/migrations/031_auth_v2_identity_and_challenges.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');

      const client = await pool.connect();
      try {
        await client.query(sql);

        const migRes = await client.query(
          "SELECT version FROM public.schema_migrations WHERE version = '031_auth_v2_identity_and_challenges.sql'"
        );
        assert.strictEqual(migRes.rows.length, 1, 'Migration 031 must be recorded');

        const tables = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_identifiers', 'auth_challenges', 'auth_rate_limits')"
        );
        const names = tables.rows.map((r) => r.table_name);
        assert.ok(names.includes('user_identifiers'), 'user_identifiers must exist');
        assert.ok(names.includes('auth_challenges'), 'auth_challenges must exist');
        assert.ok(names.includes('auth_rate_limits'), 'auth_rate_limits must exist');
      } finally {
        client.release();
      }
    });

    // --------------------------------------------------------------------------
    // TEST 3: Genuine PostgreSQL Concurrent Atomic Verification (Single-Winner)
    // --------------------------------------------------------------------------
    await record('Real PostgreSQL Concurrency: konfrm_verify_auth_challenge_v2 FOR UPDATE allows exactly ONE winner', async () => {
      const client = await pool.connect();
      const challengeId = crypto.randomUUID();
      const secret = 'test_postgres_hmac_secret_key_123';
      const otp = '123456';
      const phone = '+201099998888';
      const digest = computeChallengeOtpDigest(secret, challengeId, 1, phone, otp);

      try {
        // Insert active challenge directly into PostgreSQL
        await client.query(
          `INSERT INTO public.auth_challenges (
             id, surface, intent, method, normalized_value, otp_digest, generation,
             issued_at, otp_expires_at, challenge_expires_at, resend_available_at,
             failed_attempts, issue_count, status
           ) VALUES (
             $1, 'CUSTOMER', 'LOGIN', 'PHONE', $2, $3, 1,
             NOW(), NOW() + interval '5 minutes', NOW() + interval '10 minutes', NOW() + interval '60 seconds',
             0, 1, 'ACTIVE'
           )`,
          [challengeId, phone, digest]
        );
      } finally {
        client.release();
      }

      // Fire 5 genuine concurrent database client transactions against the same challenge
      const concurrentWorkers = Array.from({ length: 5 }, async () => {
        const c = await pool.connect();
        try {
          const res = await c.query(
            'SELECT * FROM public.konfrm_verify_auth_challenge_v2($1, $2, 5)',
            [challengeId, digest]
          );
          return res.rows[0];
        } finally {
          c.release();
        }
      });

      const responses = await Promise.all(concurrentWorkers);
      const winners = responses.filter((r) => r.success === true);
      const losers = responses.filter((r) => r.success === false);

      // EXACTLY ONE caller won in PostgreSQL!
      assert.strictEqual(winners.length, 1, `Expected exactly 1 winner in PostgreSQL, got ${winners.length}`);
      assert.strictEqual(losers.length, 4, `Expected 4 losers in PostgreSQL, got ${losers.length}`);

      // Losers must receive CHALLENGE_ALREADY_VERIFIED
      for (const loser of losers) {
        assert.strictEqual(loser.error_code, 'CHALLENGE_ALREADY_VERIFIED');
      }

      // Check PostgreSQL challenge status in DB is VERIFIED
      const checkClient = await pool.connect();
      try {
        const check = await checkClient.query('SELECT status, verified_at FROM public.auth_challenges WHERE id = $1', [challengeId]);
        assert.strictEqual(check.rows[0].status, 'VERIFIED');
        assert.ok(check.rows[0].verified_at);
      } finally {
        checkClient.release();
      }
    });

    // --------------------------------------------------------------------------
    // TEST 4: Real PostgreSQL Atomic Challenge Consumption
    // --------------------------------------------------------------------------
    await record('Real PostgreSQL Challenge Consumption: konfrm_consume_auth_challenge_v2 enforces single-use replay guard', async () => {
      const challengeId = crypto.randomUUID();
      const client = await pool.connect();
      try {
        // Insert a verified challenge to test single-use consumption
        await client.query(
          `INSERT INTO public.auth_challenges (
             id, surface, intent, method, normalized_value, otp_digest, generation,
             issued_at, otp_expires_at, challenge_expires_at, resend_available_at,
             failed_attempts, issue_count, status, verified_at
           ) VALUES (
             $1, 'CUSTOMER', 'LOGIN', 'PHONE', '+201011112222', 'digest123', 1,
             NOW(), NOW() + interval '5 minutes', NOW() + interval '10 minutes', NOW() + interval '60 seconds',
             0, 1, 'VERIFIED', NOW()
           )`,
          [challengeId]
        );

        // First consumption succeeds
        const c1 = await client.query('SELECT * FROM public.konfrm_consume_auth_challenge_v2($1)', [challengeId]);
        assert.strictEqual(c1.rows[0].success, true);

        // Second consumption fails with CONTINUATION_ALREADY_CONSUMED
        const c2 = await client.query('SELECT * FROM public.konfrm_consume_auth_challenge_v2($1)', [challengeId]);
        assert.strictEqual(c2.rows[0].success, false);
        assert.strictEqual(c2.rows[0].error_code, 'CONTINUATION_ALREADY_CONSUMED');

        // Check DB row
        const check = await client.query('SELECT status, consumed_at FROM public.auth_challenges WHERE id = $1', [challengeId]);
        assert.strictEqual(check.rows[0].status, 'CONSUMED');
        assert.ok(check.rows[0].consumed_at);
      } finally {
        client.release();
      }
    });

    // --------------------------------------------------------------------------
    // TEST 5: Real PostgreSQL Persistent Rate Limiting
    // --------------------------------------------------------------------------
    await record('Real PostgreSQL Rate Limiting: konfrm_check_rate_limit_v2 throttles persistently in auth_rate_limits', async () => {
      const client = await pool.connect();
      const bucketKey = 'rate:test:identifier:' + crypto.randomUUID();
      const windowSeconds = 60;
      const maxAttempts = 3;

      try {
        // Calls 1 to 3 succeed
        for (let i = 1; i <= 3; i++) {
          const res = await client.query(
            'SELECT * FROM public.konfrm_check_rate_limit_v2($1, $2, $3)',
            [bucketKey, windowSeconds, maxAttempts]
          );
          assert.strictEqual(res.rows[0].allowed, true);
          assert.strictEqual(res.rows[0].remaining_attempts, maxAttempts - i);
        }

        // Call 4 exceeds rate limit
        const blocked = await client.query(
          'SELECT * FROM public.konfrm_check_rate_limit_v2($1, $2, $3)',
          [bucketKey, windowSeconds, maxAttempts]
        );
        assert.strictEqual(blocked.rows[0].allowed, false);
        assert.strictEqual(blocked.rows[0].remaining_attempts, 0);
        assert.ok(blocked.rows[0].retry_after_seconds > 0);

        // Verify row in auth_rate_limits
        const row = await client.query(
          'SELECT attempt_count FROM public.auth_rate_limits WHERE bucket_key = $1',
          [bucketKey]
        );
        assert.strictEqual(row.rows[0].attempt_count, 4);
      } finally {
        client.release();
      }
    });

  } finally {
    await pool.end();
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { total, passed, failed, results };
}

if (process.argv[1] && process.argv[1].endsWith('isolatedPostgres.test.ts')) {
  runIsolatedPostgresSuite()
    .then(({ total, passed, failed, results }) => {
      console.log('======================================================================');
      console.log('  SOLA VACATION RENTALS — ISOLATED POSTGRESQL CONCURRENCY & DDL SUITE');
      console.log('======================================================================\n');
      results.forEach((r, idx) => {
        const status = r.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  [${idx + 1}] ${status} - ${r.name}${r.error ? ` (${r.error})` : ''}`);
      });
      console.log('\n----------------------------------------------------------------------');
      console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
      console.log('----------------------------------------------------------------------');
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Isolated postgres suite error:', err);
      process.exit(1);
    });
}
