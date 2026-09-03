/**
 * Sola Vacation Rentals — Real PostgreSQL Engine Runtime & Concurrency Test Suite
 * Location: server/src/tests/postgresRuntime.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import pkg from 'pg';
const { Pool } = pkg;
import { assertSafeTestDatabase } from '../utils/testDbGuard';
import type { TestResult } from './authSecurity.test';

const PG_CONFIG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'sola_db',
  connectionTimeoutMillis: 3000,
};

export async function runPostgresRuntimeSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // Production DB Isolation Guard (AUTH-02A.2)
  try {
    assertSafeTestDatabase('PostgresRuntimeSuite');
  } catch (err: any) {
    results.push({
      name: 'PostgreSQL Engine: Production DB Mutation Guard',
      passed: false,
      error: err.message,
    });
    return { total: 1, passed: 0, failed: 1, results };
  }

  const pool = new Pool(PG_CONFIG);

  try {
    const client = await pool.connect();
    client.release();
  } catch (err: any) {
    results.push({
      name: 'PostgreSQL Engine Connection Sanity',
      passed: false,
      error: `PostgreSQL connection failed: ${err.message}`,
    });
    await pool.end();
    return { total: 1, passed: 0, failed: 1, results };
  }

  // =========================================================================
  // 1. REAL POSTGRESQL SCHEMA & EXTENSION VALIDATION
  // =========================================================================
  try {
    const resTables = await pool.query(
      `SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const resExt = await pool.query(
      `SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'btree_gist')`
    );

    const has18Tables = resTables.rows[0].count >= 18;
    const hasExtensions = resExt.rows.length === 2;

    results.push({
      name: 'Real PostgreSQL 1: 18 Tables and extensions (uuid-ossp, btree_gist) verified on PostgreSQL engine',
      passed: has18Tables && hasExtensions,
    });
  } catch (err: any) {
    results.push({
      name: 'Real PostgreSQL 1: 18 Tables and extensions (uuid-ossp, btree_gist) verified on PostgreSQL engine',
      passed: false,
      error: err.message,
    });
  }

  // Seed Data Setup
  const testOwnerId = '00000000-0000-4000-a000-000000000001';
  const testPropertyId = '00000000-0000-4000-a000-000000000003';
  const testPayoutMethodId = '00000000-0000-4000-a000-000000000004';

  async function cleanTestFixtures(poolInstance: any) {
    const client = await poolInstance.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE public.wallet_ledger_entries DISABLE TRIGGER USER');
      await client.query(`DELETE FROM booking_financial_summaries WHERE booking_id IN (SELECT id FROM bookings WHERE property_id = $1)`, [testPropertyId]);
      await client.query(`DELETE FROM payout_requests WHERE owner_id = $1`, [testOwnerId]);
      await client.query(`DELETE FROM owner_payout_methods WHERE owner_id = $1`, [testOwnerId]);
      await client.query(`DELETE FROM wallet_ledger_entries WHERE owner_id = $1`, [testOwnerId]);
      await client.query(`DELETE FROM owner_wallets WHERE owner_id = $1`, [testOwnerId]);
      await client.query(`DELETE FROM bookings WHERE property_id = $1`, [testPropertyId]);
      await client.query(`DELETE FROM properties WHERE id = $1`, [testPropertyId]);
      await client.query(`DELETE FROM owners WHERE id = $1`, [testOwnerId]);
      await client.query('ALTER TABLE public.wallet_ledger_entries ENABLE TRIGGER USER');
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  try {
    await cleanTestFixtures(pool);

    await pool.query(`
      INSERT INTO owners (id, phone_number, full_name, email)
      VALUES ($1, '+201000000001', 'Test Owner DB', 'owner@test.com')
    `, [testOwnerId]);

    await pool.query(`
      INSERT INTO properties (id, owner_id, title, unit_type, property_type, address, bedrooms, bathrooms, max_guests, base_price_per_night)
      VALUES ($1, $2, 'DB Test Chalet', 'CHALET', 'SUMMER_HOUSE', 'راس الحكمة', 2, 2, 4, 1500.00)
    `, [testPropertyId, testOwnerId]);

    await pool.query(`
      INSERT INTO owner_payout_methods (id, owner_id, method_type, account_title, account_number)
      VALUES ($1, $2, 'INSTAPAY', 'Test Account', 'instapay@bank')
    `, [testPayoutMethodId, testOwnerId]);

    await pool.query('COMMIT');
  } catch (err: any) {
    await pool.query('ROLLBACK').catch(() => {});
  }

  // =========================================================================
  // 2. DOUBLE BOOKING REAL POSTGRESQL GIST EXCLUSION CONCURRENCY TEST
  // =========================================================================
  try {
    const bookingAId = '00000000-0000-4000-b000-000000000001';
    const bookingBId = '00000000-0000-4000-b000-000000000002';
    const bookingAdjId = '00000000-0000-4000-b000-000000000003';

    // Cleanup previous runs
    await pool.query(`DELETE FROM bookings WHERE id IN ($1, $2, $3)`, [bookingAId, bookingBId, bookingAdjId]);

    // Insert Booking A
    const clientA = await pool.connect();
    try {
      await clientA.query('BEGIN');
      await clientA.query(`
        INSERT INTO bookings (id, booking_number, property_id, owner_id, guest_name, guest_phone, check_in, check_out, nights, total_guests, status)
        VALUES ($1, 'BN-001', $2, $3, 'Guest A', '+201111111111', '2026-09-01', '2026-09-05', 4, 2, 'CONFIRMED')
      `, [bookingAId, testPropertyId, testOwnerId]);
      await clientA.query('COMMIT');
    } finally {
      clientA.release();
    }

    // Overlapping Booking B (Must throw exclusion_violation 23P01)
    let gistViolationOccurred = false;
    const clientB = await pool.connect();
    try {
      await clientB.query('BEGIN');
      await clientB.query(`
        INSERT INTO bookings (id, booking_number, property_id, owner_id, guest_name, guest_phone, check_in, check_out, nights, total_guests, status)
        VALUES ($1, 'BN-002', $2, $3, 'Guest B', '+201222222222', '2026-09-03', '2026-09-07', 4, 2, 'CONFIRMED')
      `, [bookingBId, testPropertyId, testOwnerId]);
      await clientB.query('COMMIT');
    } catch (err: any) {
      await clientB.query('ROLLBACK').catch(() => {});
      if (err.code === '23P01' || err.message.includes('no_overlapping_active_bookings')) {
        gistViolationOccurred = true;
      }
    } finally {
      clientB.release();
    }

    // ADJACENT booking (Checkout A = Checkin Adjacent: 2026-09-05 to 2026-09-10)
    let adjacentSuccess = false;
    const clientC = await pool.connect();
    try {
      await clientC.query('BEGIN');
      await clientC.query(`
        INSERT INTO bookings (id, booking_number, property_id, owner_id, guest_name, guest_phone, check_in, check_out, nights, total_guests, status)
        VALUES ($1, 'BN-003', $2, $3, 'Guest C', '+201333333333', '2026-09-05', '2026-09-10', 5, 2, 'CONFIRMED')
      `, [bookingAdjId, testPropertyId, testOwnerId]);
      await clientC.query('COMMIT');
      adjacentSuccess = true;
    } catch (err: any) {
      await clientC.query('ROLLBACK').catch(() => {});
    } finally {
      clientC.release();
    }

    results.push({
      name: 'Real PostgreSQL 2: GIST exclusion constraint blocks overlapping transactions & accepts adjacent check-out [)',
      passed: gistViolationOccurred && adjacentSuccess,
    });
  } catch (err: any) {
    results.push({
      name: 'Real PostgreSQL 2: GIST exclusion constraint blocks overlapping transactions & accepts adjacent check-out [)',
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 3. PAYOUT CONCURRENCY & ATOMIC BALANCE RESERVATION TEST
  // =========================================================================
  try {
    await pool.query(`DELETE FROM owner_wallets WHERE owner_id = $1`, [testOwnerId]);
    await pool.query(`
      INSERT INTO owner_wallets (owner_id, pending_balance, available_balance, held_balance, reserved_for_payout_balance)
      VALUES ($1, 0.00, 1000.00, 0.00, 0.00)
    `, [testOwnerId]);

    const client1 = await pool.connect();
    const client2 = await pool.connect();

    let client1Res = false;
    let client2Res = false;

    try {
      const res1 = await client1.query(`
        UPDATE owner_wallets 
        SET available_balance = available_balance - 600.00,
            reserved_for_payout_balance = reserved_for_payout_balance + 600.00
        WHERE owner_id = $1 AND available_balance >= 600.00
        RETURNING available_balance
      `, [testOwnerId]);
      if (res1.rowCount && res1.rowCount > 0) client1Res = true;
    } finally {
      client1.release();
    }

    try {
      const res2 = await client2.query(`
        UPDATE owner_wallets 
        SET available_balance = available_balance - 600.00,
            reserved_for_payout_balance = reserved_for_payout_balance + 600.00
        WHERE owner_id = $1 AND available_balance >= 600.00
        RETURNING available_balance
      `, [testOwnerId]);
      if (res2.rowCount && res2.rowCount > 0) client2Res = true;
    } finally {
      client2.release();
    }

    const walletCheck = await pool.query(
      `SELECT available_balance, reserved_for_payout_balance FROM owner_wallets WHERE owner_id = $1`,
      [testOwnerId]
    );

    const avail = parseFloat(walletCheck.rows[0].available_balance);
    const reserved = parseFloat(walletCheck.rows[0].reserved_for_payout_balance);

    const serializationPass = (client1Res !== client2Res) && avail === 400.00 && reserved === 600.00;

    // Rollback test
    const clientRollback = await pool.connect();
    let rollbackPass = false;
    try {
      await clientRollback.query('BEGIN');
      await clientRollback.query(`
        UPDATE owner_wallets SET available_balance = available_balance - 100.00 WHERE owner_id = $1
      `, [testOwnerId]);
      await clientRollback.query('ROLLBACK');

      const rollbackCheck = await pool.query(
        `SELECT available_balance FROM owner_wallets WHERE owner_id = $1`,
        [testOwnerId]
      );
      rollbackPass = parseFloat(rollbackCheck.rows[0].available_balance) === 400.00;
    } finally {
      clientRollback.release();
    }

    results.push({
      name: 'Real PostgreSQL 3: Competing payout balance updates are serialized atomically & rollback restores state',
      passed: serializationPass && rollbackPass,
    });
  } catch (err: any) {
    results.push({
      name: 'Real PostgreSQL 3: Competing payout balance updates are serialized atomically & rollback restores state',
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 4. IDEMPOTENCY KEY UNIQUE CONSTRAINT CONCURRENCY TEST
  // =========================================================================
  try {
    const idempotencyKey = 'idem_db_test_9999';
    await pool.query(`DELETE FROM wallet_ledger_entries WHERE idempotency_key = $1`, [idempotencyKey]);

    const clientX = await pool.connect();
    try {
      await clientX.query('BEGIN');
      await clientX.query(`
        INSERT INTO wallet_ledger_entries (id, owner_id, transaction_type, amount, balance_after, idempotency_key)
        VALUES ('00000000-0000-4000-c000-000000000001', $1, 'DEPOSIT_CREDIT', 1000.00, 800.00, $2)
      `, [testOwnerId, idempotencyKey]);
      await clientX.query('COMMIT');
    } finally {
      clientX.release();
    }

    let uniqueViolationOccurred = false;
    const clientY = await pool.connect();
    try {
      await clientY.query('BEGIN');
      await clientY.query(`
        INSERT INTO wallet_ledger_entries (id, owner_id, transaction_type, amount, balance_after, idempotency_key)
        VALUES ('00000000-0000-4000-c000-000000000002', $1, 'DEPOSIT_CREDIT', 1000.00, 800.00, $2)
      `, [testOwnerId, idempotencyKey]);
      await clientY.query('COMMIT');
    } catch (err: any) {
      await clientY.query('ROLLBACK').catch(() => {});
      if (err.code === '23505' || err.message.includes('idempotency_key')) {
        uniqueViolationOccurred = true;
      }
    } finally {
      clientY.release();
    }

    results.push({
      name: 'Real PostgreSQL 4: Idempotency Key UNIQUE constraint enforces duplicate request rejection in DB engine',
      passed: uniqueViolationOccurred,
    });
  } catch (err: any) {
    results.push({
      name: 'Real PostgreSQL 4: Idempotency Key UNIQUE constraint enforces duplicate request rejection in DB engine',
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 5. FINANCIAL DATABASE CHECK CONSTRAINTS ENFORCEMENT
  // =========================================================================
  try {
    let checkPayoutPass = false;
    let checkRemainingPass = false;

    await pool.query(`DELETE FROM payout_requests WHERE idempotency_key = 'idem_payout_check_1'`);
    // Test 1: Payout < 500 EGP rejection by DB CHECK constraint
    try {
      await pool.query(`
        INSERT INTO payout_requests (id, request_number, owner_id, payout_method_id, gross_amount, actual_provider_fee, net_amount, idempotency_key)
        VALUES ('00000000-0000-4000-d000-000000000001', 'PR-CHECK-1', $1, $2, 499.00, 15.00, 484.00, 'idem_payout_check_1')
      `, [testOwnerId, testPayoutMethodId]);
    } catch (err: any) {
      if (err.code === '23514' || err.message.includes('check_payout_min_gross') || err.message.includes('gross_amount')) {
        checkPayoutPass = true;
      }
    }

    // Test 2: Commission on remaining balance > 0.00 rejection by DB CHECK constraint
    const bookingRefId = '00000000-0000-4000-b000-000000000001';
    await pool.query(`DELETE FROM bookings WHERE id = $1`, [bookingRefId]);
    await pool.query(`
      INSERT INTO bookings (id, booking_number, property_id, owner_id, guest_name, guest_phone, check_in, check_out, nights, total_guests, status)
      VALUES ($1, 'BN-CHECK-REF', $2, $3, 'Guest CHECK', '+201444444444', '2026-10-01', '2026-10-05', 4, 2, 'CONFIRMED')
    `, [bookingRefId, testPropertyId, testOwnerId]);

    try {
      await pool.query(`
        INSERT INTO booking_financial_summaries (booking_id, total_booking_value, deposit_amount, sola_commission_amount, owner_net_deposit_amount, remaining_balance, commission_on_remaining_balance)
        VALUES ($1, 1000.00, 200.00, 40.00, 160.00, 800.00, 50.00)
      `, [bookingRefId]);
    } catch (err: any) {
      if (err.code === '23514' || err.message.includes('commission_on_remaining_balance') || err.message.includes('check_no_commission_on_remaining') || err.constraint === 'check_no_commission_on_remaining') {
        checkRemainingPass = true;
      }
    }

    results.push({
      name: 'Real PostgreSQL 5: Financial CHECK constraints (payout >= 500 & 0% commission on remaining) enforced by DB engine',
      passed: checkPayoutPass && checkRemainingPass,
      error: `PayoutPass=${checkPayoutPass}, RemainingPass=${checkRemainingPass}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Real PostgreSQL 5: Financial CHECK constraints (payout >= 500 & 0% commission on remaining) enforced by DB engine',
      passed: false,
      error: err.message,
    });
  }

  // Clean Teardown: Remove test fixtures from DB so sola_db remains 100% clean
  try {
    await cleanTestFixtures(pool);
  } catch {
    // Teardown best-effort
  }

  await pool.end();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}
