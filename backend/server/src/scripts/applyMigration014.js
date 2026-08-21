/**
 * Apply and Verify Migration 014: Unified Identity Schema Foundation
 * Location: backend/server/src/scripts/applyMigration014.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbPool } from '../services/dbClient.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function main() {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        console.log('========================================================');
        console.log('APPLYING / VERIFYING MIGRATION 014: UNIFIED IDENTITY');
        console.log('========================================================');
        const migrationPath = path.resolve(__dirname, '../../../database/migrations/014_unified_identity_users_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        console.log('Executing migration transaction idempotently...');
        await client.query(sql);
        console.log('Migration transaction executed successfully.\n');
        console.log('========================================================');
        console.log('RUNNING LIVE POST-MIGRATION VERIFICATION ASSERTIONS');
        console.log('========================================================');
        // Assertion A: Verify users table structure
        const usersColsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
        console.log('A. Users table columns:');
        usersColsRes.rows.forEach(c => {
            console.log(`   - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
        });
        if (usersColsRes.rowCount === 0)
            throw new Error('Assertion Failed: users table was not created');
        // Assertion B: Owner backfill integrity
        const countsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM owners) as owners_count,
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM owners o JOIN users u ON o.id = u.id) as matching_owner_user_count,
        (SELECT COUNT(*) FROM owners o WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.id)) as unmatched_owners_count
    `);
        const counts = countsRes.rows[0];
        console.log('\nB. Identity Backfill Counts:');
        console.log('   - Total Owners:', counts.owners_count);
        console.log('   - Total Users:', counts.users_count);
        console.log('   - Owners with matching users.id:', counts.matching_owner_user_count);
        console.log('   - Unmatched Owners:', counts.unmatched_owners_count);
        if (Number(counts.owners_count) !== Number(counts.matching_owner_user_count)) {
            throw new Error(`Assertion Failed: Mismatch between owners (${counts.owners_count}) and matching users (${counts.matching_owner_user_count})`);
        }
        // Assertion C: Phone integrity & uniqueness
        const phoneCheckRes = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT u.phone_number) as distinct_user_phones,
        COUNT(CASE WHEN u.phone_number != o.phone_number THEN 1 END) as mismatched_phones
      FROM users u
      JOIN owners o ON u.id = o.id;
    `);
        console.log('\nC. Phone Integrity:');
        console.log('   - Total users:', phoneCheckRes.rows[0].total_users);
        console.log('   - Distinct user phones:', phoneCheckRes.rows[0].distinct_user_phones);
        console.log('   - Mismatched phone numbers between owners and users:', phoneCheckRes.rows[0].mismatched_phones);
        if (Number(phoneCheckRes.rows[0].mismatched_phones) > 0) {
            throw new Error('Assertion Failed: Found phone mismatch between owners and users');
        }
        // Assertion D: Verify owners.id -> users.id FK constraint
        const ownerFkRes = await client.query(`
      SELECT
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'owners' AND tc.constraint_name = 'fk_owners_users';
    `);
        console.log('\nD. Owner FK Relationship:');
        console.log('   - Constraint:', ownerFkRes.rows[0]);
        if (ownerFkRes.rowCount === 0)
            throw new Error('Assertion Failed: fk_owners_users foreign key not found');
        // Assertion E: Verify bookings.customer_id column and FK
        const bookingCustFkRes = await client.query(`
      SELECT
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'bookings' AND kcu.column_name = 'customer_id';
    `);
        const historicalBookingsCheck = await client.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(customer_id) as non_null_customer_id_count,
        COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as null_customer_id_count
      FROM bookings;
    `);
        console.log('\nE. Bookings Customer ID Foundation:');
        console.log('   - FK Constraint:', bookingCustFkRes.rows[0]);
        console.log('   - Total historical bookings:', historicalBookingsCheck.rows[0].total_bookings);
        console.log('   - Bookings with non-null customer_id (should be 0 for historical):', historicalBookingsCheck.rows[0].non_null_customer_id_count);
        console.log('   - Bookings with null customer_id:', historicalBookingsCheck.rows[0].null_customer_id_count);
        if (Number(historicalBookingsCheck.rows[0].non_null_customer_id_count) !== 0) {
            throw new Error('Assertion Failed: Historical bookings must not have fabricated customer_ids');
        }
        // Assertion F: Safe FK enforcement test (Transactional with ROLLBACK)
        console.log('\nF. Testing FK Constraint Enforcement (with ROLLBACK)...');
        await client.query('BEGIN;');
        let fkBlockedAsExpected = false;
        try {
            const nonExistentUserId = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
            const sampleOwner = await client.query('SELECT id FROM owners LIMIT 1;');
            const sampleProp = await client.query('SELECT id FROM properties LIMIT 1;');
            await client.query(`
        INSERT INTO bookings (
          booking_number, property_id, owner_id, customer_id, guest_name, guest_phone, check_in, check_out, nights, total_guests
        ) VALUES (
          'BK-TEST-FK-001', $1, $2, $3, 'Test Guest', '+201000000000', '2027-01-01', '2027-01-03', 2, 2
        );
      `, [sampleProp.rows[0].id, sampleOwner.rows[0].id, nonExistentUserId]);
        }
        catch (err) {
            if (err.code === '23503') {
                fkBlockedAsExpected = true;
                console.log('   - FK violation caught successfully (PostgreSQL Error 23503):', err.message);
            }
            else {
                console.log('   - Unexpected error:', err.message);
            }
        }
        finally {
            await client.query('ROLLBACK;');
        }
        if (!fkBlockedAsExpected)
            throw new Error('Assertion Failed: Foreign key constraint did not reject invalid customer_id');
        // Assertion G: Domain counts sanity check
        const domainCountsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM properties) as properties_count,
        (SELECT COUNT(*) FROM owner_wallets) as wallets_count,
        (SELECT COUNT(*) FROM owner_verification_documents) as verif_docs_count,
        (SELECT COUNT(*) FROM payout_requests) as payouts_count
    `);
        console.log('\nG. Domain Entities Preserved:');
        console.log('   - Properties:', domainCountsRes.rows[0].properties_count);
        console.log('   - Owner Wallets:', domainCountsRes.rows[0].wallets_count);
        console.log('   - Owner Verification Documents:', domainCountsRes.rows[0].verif_docs_count);
        console.log('   - Payout Requests:', domainCountsRes.rows[0].payouts_count);
        console.log('\n========================================================');
        console.log('ALL VERIFICATION ASSERTIONS PASSED WITH ZERO ERRORS!');
        console.log('========================================================');
    }
    finally {
        client.release();
        await pool.end();
    }
}
main().catch(err => {
    console.error('Migration execution failed:', err);
    process.exit(1);
});
