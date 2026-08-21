/**
 * Production Schema & Constraint Verification Script for AUTH-02A Closure
 * Location: backend/server/src/scripts/verifySchemaClosure.ts
 */
import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';
async function verifySchema() {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        console.log('========================================================');
        console.log('1. VERIFYING EXACT TABLE INSTANCES IN PUBLIC SCHEMA');
        console.log('========================================================');
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'owners', 'bookings')
      ORDER BY table_name;
    `);
        console.log('Tables found:', tablesRes.rows);
        console.log('\n========================================================');
        console.log('2. VERIFYING CONSTRAINTS ON OWNERS & USERS & BOOKINGS');
        console.log('========================================================');
        const constraintsRes = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name IN ('users', 'owners', 'bookings')
      ORDER BY tc.table_name, tc.constraint_name;
    `);
        console.log('Constraints details:');
        constraintsRes.rows.forEach(r => {
            console.log(`   - [${r.table_name}] ${r.constraint_name} (${r.constraint_type}) on column ${r.column_name} ${r.foreign_table_name ? '-> ' + r.foreign_table_name + '(' + r.foreign_column_name + ')' : ''}`);
        });
        console.log('\n========================================================');
        console.log('3. VERIFYING INDEXES ON USERS & BOOKINGS');
        console.log('========================================================');
        const indexesRes = await client.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename IN ('users', 'owners', 'bookings')
      ORDER BY tablename, indexname;
    `);
        console.log('Indexes found:');
        indexesRes.rows.forEach(r => {
            console.log(`   - [${r.tablename}] ${r.indexname}: ${r.indexdef}`);
        });
        console.log('\n========================================================');
        console.log('4. VERIFYING BOOKINGS.CUSTOMER_ID COLUMN INSTANCES');
        console.log('========================================================');
        const colCountRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'customer_id';
    `);
        console.log('customer_id column details:', colCountRes.rows);
    }
    finally {
        client.release();
        await pool.end();
    }
}
verifySchema().catch(err => {
    console.error('Schema verification error:', err.message);
    process.exit(1);
});
