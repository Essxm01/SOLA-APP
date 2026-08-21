/**
 * Cleanup Proven Test Artifacts for AUTH-02A.2
 * Location: backend/server/src/scripts/cleanupTestArtifacts.ts
 */
import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';
async function verifyPostCleanup() {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        console.log('========================================================');
        console.log('POST-CLEANUP DATABASE INVARIANTS VERIFICATION');
        console.log('========================================================');
        const countsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM owners) as owners_count,
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM owners o JOIN users u ON o.id = u.id) as matched_owners_users,
        (SELECT COUNT(*) FROM owners o WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.id)) as unmatched_owners,
        (SELECT COUNT(*) FROM users u WHERE NOT EXISTS (SELECT 1 FROM owners o WHERE o.id = u.id)) as isolated_users,
        (SELECT COUNT(*) - COUNT(DISTINCT phone_number) FROM users) as duplicate_user_phones,
        (SELECT COUNT(*) - COUNT(DISTINCT phone_number) FROM owners) as duplicate_owner_phones,
        (SELECT COUNT(*) FROM bookings WHERE customer_id IS NOT NULL) as historical_non_null_bookings,
        (SELECT COUNT(*) FROM bookings) as total_bookings;
    `);
        const inv = countsRes.rows[0];
        console.log('Post-cleanup invariants:');
        console.log('   - Total Owners count:', inv.owners_count);
        console.log('   - Total Users count:', inv.users_count);
        console.log('   - Matched owners/users count:', inv.matched_owners_users);
        console.log('   - Unmatched Owners count:', inv.unmatched_owners);
        console.log('   - Isolated Users count:', inv.isolated_users);
        console.log('   - Duplicate User phones:', inv.duplicate_user_phones);
        console.log('   - Duplicate Owner phones:', inv.duplicate_owner_phones);
        console.log('   - Historical bookings with non-null customer_id:', inv.historical_non_null_bookings);
        console.log('   - Total bookings:', inv.total_bookings);
        const isHealthy = Number(inv.owners_count) === 18 &&
            Number(inv.users_count) === 18 &&
            Number(inv.matched_owners_users) === 18 &&
            Number(inv.unmatched_owners) === 0 &&
            Number(inv.isolated_users) === 0;
        if (!isHealthy) {
            throw new Error('Post-cleanup invariant assertion failed!');
        }
        console.log('\nALL INVARIANTS SATISFIED: 18 Owners == 18 Users, 0 unmatched, 0 isolated.');
    }
    finally {
        client.release();
        await pool.end();
    }
}
verifyPostCleanup().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
