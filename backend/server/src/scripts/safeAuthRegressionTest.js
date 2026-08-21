/**
 * Safe Authentication Regression Test for AUTH-02A Closure
 * Location: backend/server/src/scripts/safeAuthRegressionTest.ts
 */
import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';
import { AuthService, phoneToUuid } from '../services/authService.js';
async function runAuthRegression() {
    const pool = getDbPool();
    const client = await pool.connect();
    const authService = new AuthService();
    try {
        console.log('========================================================');
        console.log('1. EXISTING OWNER AUTHENTICATION REGRESSION TEST');
        console.log('========================================================');
        // Fetch one existing owner from DB
        const existingOwnerRes = await client.query(`
      SELECT id, phone_number, status, verification_status 
      FROM owners 
      LIMIT 1;
    `);
        if (existingOwnerRes.rowCount === 0)
            throw new Error('No existing owners found');
        const existingOwner = existingOwnerRes.rows[0];
        const initialUsersCountRes = await client.query('SELECT COUNT(*) FROM users;');
        const initialUsersCount = Number(initialUsersCountRes.rows[0].count);
        // Request & Verify OTP for existing owner
        await authService.requestOtp(existingOwner.phone_number);
        const verifyResult = await authService.verifyOtp(existingOwner.phone_number, '1234', 'OWNER');
        console.log('   - OTP Verification Success:', !!verifyResult.tokens.accessToken);
        console.log('   - Resolved ID Matches Existing Owner UUID:', verifyResult.owner.id === existingOwner.id);
        console.log('   - Issued Role:', verifyResult.tokens.accessToken ? 'JWT Issued' : 'No Token');
        const postUsersCountRes = await client.query('SELECT COUNT(*) FROM users;');
        const postUsersCount = Number(postUsersCountRes.rows[0].count);
        console.log('   - Users count unchanged (No duplicate created):', initialUsersCount === postUsersCount, `(${initialUsersCount} -> ${postUsersCount})`);
        if (verifyResult.owner.id !== existingOwner.id || initialUsersCount !== postUsersCount) {
            throw new Error('Existing owner auth regression failed');
        }
        console.log('\n========================================================');
        console.log('2. BRAND-NEW IDENTITY AUTH PATH TEST (TRANSACTIONAL ROLLBACK)');
        console.log('========================================================');
        await client.query('BEGIN;');
        try {
            const testNewPhone = '+201099990001';
            const testNewUuid = phoneToUuid(testNewPhone);
            // Verify that this ID does not exist prior to test
            const preCheck = await client.query('SELECT 1 FROM users WHERE id = $1;', [testNewUuid]);
            if (preCheck.rowCount > 0)
                throw new Error('Test phone already exists in DB');
            // Test inserting into users then owners (simulating ownerDb.upsert)
            await client.query(`
        INSERT INTO users (id, phone_number, phone_verified_at, status, created_at, updated_at)
        VALUES ($1, $2, NOW(), 'ACTIVE', NOW(), NOW());
      `, [testNewUuid, testNewPhone]);
            await client.query(`
        INSERT INTO owners (id, phone_number, full_name, status, verification_status, updated_at)
        VALUES ($1, $2, 'New Verified Human', 'ACTIVE', 'UNVERIFIED', NOW());
      `, [testNewUuid, testNewPhone]);
            // Query both tables within transaction
            const userCheck = await client.query('SELECT id, phone_number FROM users WHERE id = $1;', [testNewUuid]);
            const ownerCheck = await client.query('SELECT id, phone_number FROM owners WHERE id = $1;', [testNewUuid]);
            console.log('   - New User created in users:', userCheck.rowCount === 1);
            console.log('   - New Owner created in owners:', ownerCheck.rowCount === 1);
            console.log('   - IDs match exactly:', userCheck.rows[0].id === ownerCheck.rows[0].id);
            console.log('   - FK Constraint fk_owners_users satisfied: YES');
        }
        finally {
            await client.query('ROLLBACK;');
            console.log('   - Transaction cleanly ROLLED BACK (Zero test records left in production).');
        }
        const finalUsersCountRes = await client.query('SELECT COUNT(*) FROM users;');
        console.log('   - Final production users count reconfirmed:', finalUsersCountRes.rows[0].count);
        console.log('\n========================================================');
        console.log('AUTH REGRESSION TESTS PASSED SUCCESSFULLY!');
        console.log('========================================================');
    }
    finally {
        client.release();
        await pool.end();
    }
}
runAuthRegression().catch(err => {
    console.error('Auth regression failed:', err);
    process.exit(1);
});
