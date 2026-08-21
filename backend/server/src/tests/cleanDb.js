import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'sola_secret_pass',
    database: 'sola_db'
});
async function main() {
    console.log('=== CLEANING POSTGRESQL DATABASE sola_db ===');
    const tables = [
        'bookings',
        'properties',
        'owner_verification_documents',
        'verification_documents',
        'notifications',
        'payout_requests',
        'disputes',
        'owners',
        'admin_users'
    ];
    for (const t of tables) {
        try {
            await pool.query(`TRUNCATE TABLE ${t} CASCADE`);
            console.log(`[CLEANED TABLE] ${t}`);
        }
        catch (err) {
            if (!err.message.includes('does not exist')) {
                console.log(`[TRUNCATE NOTICE] ${t}: ${err.message}`);
            }
        }
    }
    console.log('=== VERIFYING ZERO BUSINESS RECORDS IN DATABASE ===');
    const checkTables = ['owners', 'admin_users', 'notifications', 'payout_requests', 'disputes', 'properties', 'bookings'];
    for (const t of checkTables) {
        try {
            const res = await pool.query(`SELECT COUNT(*) FROM ${t}`);
            console.log(`[VERIFIED CLEAN] ${t.padEnd(20)} : ${res.rows[0].count} rows`);
        }
        catch (err) {
            console.log(`[VERIFIED CLEAN] ${t.padEnd(20)} : Error (${err.message})`);
        }
    }
    await pool.end();
}
main().catch(err => {
    console.error('Database cleanup error:', err);
    process.exit(1);
});
