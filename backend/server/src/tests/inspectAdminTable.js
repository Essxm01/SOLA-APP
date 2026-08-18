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
    try {
        const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_users'`);
        console.log('--- ADMIN_USERS COLUMNS ---');
        console.log(res.rows);
        const dbRes = await pool.query('SELECT current_database(), current_schema()');
        console.log('--- DB & SCHEMA IDENTITY ---');
        console.log(dbRes.rows);
    }
    catch (err) {
        console.error('Error:', err.message);
    }
    finally {
        await pool.end();
    }
}
main();
