import pkg from 'pg';
const { Pool } = pkg;
const mainPool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'sola_secret_pass',
    database: 'postgres'
});
async function main() {
    console.log('=== ENSURING ISOLATED TEST DATABASE sola_test_db EXISTS ===');
    try {
        const res = await mainPool.query("SELECT 1 FROM pg_database WHERE datname = 'sola_test_db'");
        if (res.rows.length === 0) {
            await mainPool.query('CREATE DATABASE sola_test_db TEMPLATE sola_db');
            console.log('[CREATED TEST DB] sola_test_db created as TEMPLATE from sola_db');
        }
        else {
            console.log('[TEST DB EXISTS] sola_test_db already exists.');
        }
    }
    catch (err) {
        console.log('[TEST DB NOTICE]', err.message);
    }
    finally {
        await mainPool.end();
    }
}
main();
