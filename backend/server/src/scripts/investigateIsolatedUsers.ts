/**
 * Investigate Isolated Users Origin & Reference Check
 * Location: backend/server/src/scripts/investigateIsolatedUsers.ts
 */

import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';

async function investigate() {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    console.log('========================================================');
    console.log('1. DETAILED RECORD INSPECTION FOR ISOLATED USERS');
    console.log('========================================================');
    const isolatedRes = await client.query(`
      SELECT 
        u.id,
        u.phone_number,
        u.phone_verified_at,
        u.full_name,
        u.email,
        u.avatar_url,
        u.status,
        u.created_at,
        u.updated_at,
        u.deleted_at
      FROM users u
      WHERE NOT EXISTS (SELECT 1 FROM owners o WHERE o.id = u.id)
      ORDER BY u.created_at;
    `);

    console.log(`Found ${isolatedRes.rowCount} isolated users:`);
    isolatedRes.rows.forEach((r, idx) => {
      const maskedPhone = r.phone_number.slice(0, 5) + '******' + r.phone_number.slice(-2);
      console.log(`\nRecord ${idx + 1}:`);
      console.log(`   - ID: ${r.id}`);
      console.log(`   - Masked Phone: ${maskedPhone}`);
      console.log(`   - Phone Verified At: ${r.phone_verified_at}`);
      console.log(`   - Full Name: ${r.full_name}`);
      console.log(`   - Email: ${r.email}`);
      console.log(`   - Avatar URL: ${r.avatar_url}`);
      console.log(`   - Status: ${r.status}`);
      console.log(`   - Created At: ${r.created_at}`);
      console.log(`   - Updated At: ${r.updated_at}`);
      console.log(`   - Deleted At: ${r.deleted_at}`);
    });

    console.log('\n========================================================');
    console.log('2. DOMAIN REFERENCE AUDIT ACROSS ALL TABLES');
    console.log('========================================================');
    
    for (const r of isolatedRes.rows) {
      console.log(`\nChecking references for User ID ${r.id}:`);

      // 1. bookings as customer_id
      const bCustRes = await client.query('SELECT COUNT(*) FROM bookings WHERE customer_id = $1', [r.id]);
      console.log(`   - bookings (customer_id): ${bCustRes.rows[0].count}`);

      // 2. bookings as owner_id
      const bOwnerRes = await client.query('SELECT COUNT(*) FROM bookings WHERE owner_id = $1', [r.id]);
      console.log(`   - bookings (owner_id): ${bOwnerRes.rows[0].count}`);

      // 3. properties as owner_id
      const pRes = await client.query('SELECT COUNT(*) FROM properties WHERE owner_id = $1', [r.id]);
      console.log(`   - properties (owner_id): ${pRes.rows[0].count}`);

      // 4. payment_transactions as customer_id
      const ptCustRes = await client.query('SELECT COUNT(*) FROM payment_transactions WHERE customer_id = $1', [r.id]);
      console.log(`   - payment_transactions (customer_id): ${ptCustRes.rows[0].count}`);

      // 5. payment_transactions as owner_id
      const ptOwnerRes = await client.query('SELECT COUNT(*) FROM payment_transactions WHERE owner_id = $1', [r.id]);
      console.log(`   - payment_transactions (owner_id): ${ptOwnerRes.rows[0].count}`);

      // 6. owner_wallets
      const wRes = await client.query('SELECT COUNT(*) FROM owner_wallets WHERE owner_id = $1', [r.id]);
      console.log(`   - owner_wallets: ${wRes.rows[0].count}`);

      // 7. owner_verification_documents
      const docRes = await client.query('SELECT COUNT(*) FROM owner_verification_documents WHERE owner_id = $1', [r.id]);
      console.log(`   - owner_verification_documents: ${docRes.rows[0].count}`);

      // 8. user_sessions
      const sRes = await client.query('SELECT COUNT(*) FROM user_sessions WHERE owner_id = $1', [r.id]);
      console.log(`   - user_sessions: ${sRes.rows[0].count}`);

      // 9. property_images
      const imgRes = await client.query('SELECT COUNT(*) FROM property_images WHERE owner_id = $1', [r.id]);
      console.log(`   - property_images: ${imgRes.rows[0].count}`);
    }

    console.log('\n========================================================');
    console.log('3. TESTING WHY OWNERS ROW WAS NOT INSERTED IN TEST');
    console.log('========================================================');
    // Let's test inserting the owners row for ownerAId to see why it wasn't there
    await client.query('BEGIN;');
    try {
      const ownerAId = 'a1111111-1111-4111-8111-111111111111';
      const testRes = await client.query(`
        INSERT INTO owners (id, phone_number, full_name, email, avatar_url, status, verification_status, updated_at)
        VALUES ($1, '+201011111111', 'Owner A', null, null, 'ACTIVE', 'UNVERIFIED', NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        RETURNING *;
      `, [ownerAId]);
      console.log('Manual owner insert test result:', testRes.rowCount === 1 ? 'SUCCESS' : 'FAILED');
    } catch (err: any) {
      console.log('Manual owner insert test error:', err.message);
    } finally {
      await client.query('ROLLBACK;');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

investigate().catch(err => {
  console.error('Investigation error:', err);
  process.exit(1);
});
