/**
 * Preflight Inspection for AUTH-02A: Unified Identity Schema Foundation
 * Location: backend/server/src/scripts/preflight014.ts
 */

import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';

async function runPreflight() {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    console.log('--- 1. Checking if users table exists ---');
    const usersTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users';
    `);
    console.log('users table exists:', usersTableCheck.rowCount > 0);

    console.log('\n--- 2. Checking owners table count & validity ---');
    const ownersStats = await client.query(`
      SELECT 
        COUNT(*) as total_owners,
        COUNT(DISTINCT phone_number) as distinct_phones,
        COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
        COUNT(CASE WHEN phone_number IS NULL OR trim(phone_number) = '' THEN 1 END) as null_or_empty_phones
      FROM owners;
    `);
    console.log('Owners stats:', ownersStats.rows[0]);

    console.log('\n--- 3. Inspecting all current Owner UUIDs and phone numbers ---');
    const allOwners = await client.query(`
      SELECT id, phone_number, status, verification_status, created_at, updated_at
      FROM owners;
    `);
    console.log(`Retrieved ${allOwners.rowCount} owners.`);
    const invalidUuids = allOwners.rows.filter(r => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id));
    console.log('Invalid UUIDs count:', invalidUuids.length);

    console.log('\n--- 4. Checking bookings table columns for customer_id ---');
    const bookingsColsRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings';
    `);
    const bookingCols = bookingsColsRes.rows.map(c => c.column_name);
    console.log('Bookings columns:', bookingCols);
    console.log('bookings.customer_id exists:', bookingCols.includes('customer_id'));

    console.log('\n--- 5. Checking FK constraints on owners table ---');
    const ownersFkRes = await client.query(`
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
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'owners';
    `);
    console.log('Current FK constraints on owners table:', ownersFkRes.rows);

    console.log('\n--- 6. Checking tables referencing owners(id) ---');
    const referencingFksRes = await client.query(`
      SELECT
        tc.table_name,
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
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'owners';
    `);
    console.log('Tables referencing owners:', referencingFksRes.rows.map(r => `${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`));

    console.log('\nPreflight completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

runPreflight().catch(err => {
  console.error('Preflight error:', err.message);
  process.exit(1);
});
