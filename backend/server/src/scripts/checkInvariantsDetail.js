/**
 * Invariants Check & Non-owner Users Query
 * Location: backend/server/src/scripts/checkInvariantsDetail.ts
 */
import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';
async function checkInvariants() {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        const ownersCount = await client.query('SELECT COUNT(*) FROM owners;');
        const usersCount = await client.query('SELECT COUNT(*) FROM users;');
        const matchedCount = await client.query('SELECT COUNT(*) FROM owners o JOIN users u ON o.id = u.id;');
        const unmatchedOwners = await client.query('SELECT COUNT(*) FROM owners o WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.id);');
        const duplicateUserPhones = await client.query('SELECT COUNT(*) - COUNT(DISTINCT phone_number) as count FROM users;');
        const duplicateOwnerPhones = await client.query('SELECT COUNT(*) - COUNT(DISTINCT phone_number) as count FROM owners;');
        const nonNullCustIdBookings = await client.query('SELECT COUNT(*) FROM bookings WHERE customer_id IS NOT NULL;');
        const totalBookings = await client.query('SELECT COUNT(*) FROM bookings;');
        console.log('=== EXACT PRODUCTION COUNTS ===');
        console.log('Total Owners:', Number(ownersCount.rows[0].count));
        console.log('Total Users:', Number(usersCount.rows[0].count));
        console.log('Matched (owners.id = users.id):', Number(matchedCount.rows[0].count));
        console.log('Unmatched Owners:', Number(unmatchedOwners.rows[0].count));
        console.log('Duplicate User Phones:', Number(duplicateUserPhones.rows[0].count));
        console.log('Duplicate Owner Phones:', Number(duplicateOwnerPhones.rows[0].count));
        console.log('Historical Bookings with non-null customer_id:', Number(nonNullCustIdBookings.rows[0].count));
        console.log('Total Bookings:', Number(totalBookings.rows[0].count));
        // Inspect non-owner users (created during test suite runs)
        const nonOwnerUsers = await client.query(`
      SELECT id, phone_number, created_at
      FROM users u
      WHERE NOT EXISTS (SELECT 1 FROM owners o WHERE o.id = u.id);
    `);
        console.log('\nUsers without an owners row:', nonOwnerUsers.rows);
    }
    finally {
        client.release();
        await pool.end();
    }
}
checkInvariants().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
