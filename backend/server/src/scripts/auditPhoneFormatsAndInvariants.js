/**
 * Phone Format Audit & Final Database Invariants Inspection
 * Location: backend/server/src/scripts/auditPhoneFormatsAndInvariants.ts
 */
import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';
async function auditPhoneAndInvariants() {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        console.log('========================================================');
        console.log('1. PHONE NUMBER FORMAT AUDIT (AGGREGATE PATTERNS)');
        console.log('========================================================');
        // Aggregate pattern query (Masking PII)
        const phoneFormatsRes = await client.query(`
      SELECT 
        CASE 
          WHEN phone_number LIKE '+20%' THEN '+20... (International Format)'
          WHEN phone_number LIKE '01%' THEN '01... (National 11-digit Format)'
          WHEN phone_number LIKE '20%' THEN '20... (Non-plus International)'
          ELSE 'Other/Custom Format'
        END as format_category,
        COUNT(*) as record_count,
        MIN(LENGTH(phone_number)) as min_len,
        MAX(LENGTH(phone_number)) as max_len
      FROM users
      GROUP BY 1
      ORDER BY record_count DESC;
    `);
        console.log('Users table phone format distribution:');
        phoneFormatsRes.rows.forEach(r => {
            console.log(`   - ${r.format_category}: ${r.record_count} records (length: ${r.min_len}-${r.max_len})`);
        });
        const ownerPhoneFormatsRes = await client.query(`
      SELECT 
        CASE 
          WHEN phone_number LIKE '+20%' THEN '+20... (International Format)'
          WHEN phone_number LIKE '01%' THEN '01... (National 11-digit Format)'
          WHEN phone_number LIKE '20%' THEN '20... (Non-plus International)'
          ELSE 'Other/Custom Format'
        END as format_category,
        COUNT(*) as record_count
      FROM owners
      GROUP BY 1
      ORDER BY record_count DESC;
    `);
        console.log('\nOwners table phone format distribution:');
        ownerPhoneFormatsRes.rows.forEach(r => {
            console.log(`   - ${r.format_category}: ${r.record_count} records`);
        });
        console.log('\n========================================================');
        console.log('2. FINAL PRODUCTION DATABASE INVARIANTS');
        console.log('========================================================');
        const invariantsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM owners) as owners_count,
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM owners o JOIN users u ON o.id = u.id) as matched_owners_users,
        (SELECT COUNT(*) FROM owners o WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.id)) as unmatched_owners,
        (SELECT COUNT(*) - COUNT(DISTINCT phone_number) FROM users) as duplicate_user_phones,
        (SELECT COUNT(*) - COUNT(DISTINCT phone_number) FROM owners) as duplicate_owner_phones,
        (SELECT COUNT(*) FROM bookings WHERE customer_id IS NOT NULL) as historical_bookings_with_non_null_customer_id,
        (SELECT COUNT(*) FROM bookings) as total_bookings
    `);
        const inv = invariantsRes.rows[0];
        console.log('Invariants:');
        console.log('   - Total Owners count:', inv.owners_count);
        console.log('   - Total Users count:', inv.users_count);
        console.log('   - Matched owners.id = users.id count:', inv.matched_owners_users);
        console.log('   - Unmatched Owners count:', inv.unmatched_owners_count);
        console.log('   - Duplicate user phones count:', inv.duplicate_user_phones);
        console.log('   - Duplicate owner phones count:', inv.duplicate_owner_phones);
        console.log('   - Historical bookings with non-null customer_id:', inv.historical_bookings_with_non_null_customer_id);
        console.log('   - Total bookings count:', inv.total_bookings);
    }
    finally {
        client.release();
        await pool.end();
    }
}
auditPhoneAndInvariants().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
